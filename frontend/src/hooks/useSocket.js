import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { generateDHKeys, computeSharedKey, encryptMessage, decryptMessage, exportPrivateKeyJwk, importPrivateKeyJwk } from '@/utils/crypto';

export function useSocket(token, userId, selectedUser) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sharedKey, setSharedKey] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const privateKeyRef = useRef(null);
  const peerPublicKeysRef = useRef({}); 
  const peerSharedKeysRef = useRef({}); 
  const pendingMessagesRef = useRef({});
  const processedMessageIds = useRef(new Set());

  const getStorageKey = (peerId) => `chat_${userId}_${peerId}`;
  const getUnreadKey = () => `unread_${userId}`;
  
  const saveMessagesToStorage = (peerId, msgs) => {
    try {
      localStorage.setItem(getStorageKey(peerId), JSON.stringify(msgs));
    } catch (e) {
      console.error('[CLIENT] Storage save failed:', e);
    }
  };
  
  const loadMessagesFromStorage = (peerId) => {
    try {
      const stored = localStorage.getItem(getStorageKey(peerId));
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  };
  
  const clearStorageForPeer = (peerId) => localStorage.removeItem(getStorageKey(peerId));

  const loadUnreadCounts = () => {
    try {
      const stored = localStorage.getItem(getUnreadKey());
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  };

  const saveUnreadCounts = (counts) => {
    try {
      localStorage.setItem(getUnreadKey(), JSON.stringify(counts));
    } catch (e) {
      console.error('[CLIENT] Unread save failed:', e);
    }
  };

  const incrementUnread = (peerId) => {
    setUnreadCounts(prev => {
      const updated = { ...prev, [peerId]: (prev[peerId] || 0) + 1 };
      saveUnreadCounts(updated);
      return updated;
    });
  };

  const clearUnread = (peerId) => {
    setUnreadCounts(prev => {
      const updated = { ...prev };
      delete updated[peerId];
      saveUnreadCounts(updated);
      return updated;
    });
  };

  const getSharedKey = async (peerId) => {
    let key = peerSharedKeysRef.current[peerId];
    if (!key && peerPublicKeysRef.current[peerId]) {
      key = await computeSharedKey(privateKeyRef.current, peerPublicKeysRef.current[peerId]);
      peerSharedKeysRef.current[peerId] = key;
    }
    return key;
  };
  
  const addMessage = (msg, peerId) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      if (peerId) saveMessagesToStorage(peerId, updated);
      return updated;
    });
  };

  const processMessage = async (data, key, peerId) => {
    if (data.messageId && processedMessageIds.current.has(data.messageId)) return;
    
    try {
      const text = await decryptMessage(data.ciphertext, key);
      const msg = { text, senderId: data.senderId, timestamp: data.timestamp, messageId: data.messageId, decrypted: true };
      addMessage(msg, peerId);
      if (data.messageId) processedMessageIds.current.add(data.messageId);
      
      // Increment unread count if not viewing this chat
      if (peerId !== selectedUser) {
        incrementUnread(peerId);
      }
    } catch (error) {
      const msg = { text: '[Decryption Failed]', senderId: data.senderId, timestamp: data.timestamp, messageId: data.messageId, oldEncrypted: true };
      addMessage(msg, peerId);
      
      if (peerId !== selectedUser) {
        incrementUnread(peerId);
      }
    }
  };

  useEffect(() => {
    if (socket) return;
    
    const initSocket = async () => {
      const newSocket = io('http://localhost:3001', { auth: { token } });
      setSocket(newSocket);

      // Load or generate persistent ECDH keypair
      let privateKey;
      let publicKey;
      try {
        const storedPriv = localStorage.getItem(`dh_priv_${userId}`);
        const storedPub = localStorage.getItem(`dh_pub_${userId}`);
        if (storedPriv && storedPub) {
          privateKey = await importPrivateKeyJwk(JSON.parse(storedPriv));
          publicKey = storedPub;
        } else {
          const pair = await generateDHKeys();
          privateKey = pair.privateKey;
          publicKey = pair.publicKey;
          const jwk = await exportPrivateKeyJwk(privateKey);
          localStorage.setItem(`dh_priv_${userId}`, JSON.stringify(jwk));
          localStorage.setItem(`dh_pub_${userId}`, publicKey);
        }
      } catch (e) {
        console.warn('[CLIENT] Failed to restore DH key, generating new.', e);
        const pair = await generateDHKeys();
        privateKey = pair.privateKey;
        publicKey = pair.publicKey;
        const jwk = await exportPrivateKeyJwk(privateKey);
        localStorage.setItem(`dh_priv_${userId}`, JSON.stringify(jwk));
        localStorage.setItem(`dh_pub_${userId}`, publicKey);
      }

      privateKeyRef.current = privateKey;
      newSocket.emit('registerPublicKey', { publicKey });

      // Restore cached peer public keys
      try {
        const peersRaw = localStorage.getItem(`peer_pubs_${userId}`);
        if (peersRaw) peerPublicKeysRef.current = JSON.parse(peersRaw) || {};
      } catch {}

      newSocket.on('peerPublicKey', async (data) => {
        peerPublicKeysRef.current[data.peerId] = data.publicKey;
        // Persist peers
        try {
          localStorage.setItem(`peer_pubs_${userId}`, JSON.stringify(peerPublicKeysRef.current));
        } catch {}
        const key = await computeSharedKey(privateKey, data.publicKey);
        peerSharedKeysRef.current[data.peerId] = key;
        setSharedKey(key);
        
        // Process pending messages
        const pending = pendingMessagesRef.current[data.peerId] || [];
        for (const msgData of pending) {
          await processMessage(msgData, key, data.peerId);
        }
        delete pendingMessagesRef.current[data.peerId];

        // If we're viewing this chat and have undecrypted history, re-decrypt now
        if (data.peerId === selectedUser) {
          const needsRedecrypt = messages?.some(m => m.ciphertext && !m.decrypted);
          if (needsRedecrypt) {
            try {
              const decrypted = await decryptHistory(messages, selectedUser);
              setMessages(decrypted);
            } catch (e) {
              console.warn('[CLIENT] Redecrypt on key establish failed', e);
            }
          }
        }
      });

      newSocket.on('receiveMessage', async (data) => {
        const key = await getSharedKey(data.senderId);
        
        if (!key) {
          if (!pendingMessagesRef.current[data.senderId]) pendingMessagesRef.current[data.senderId] = [];
          pendingMessagesRef.current[data.senderId].push(data);
          newSocket.emit('requestPeerPublicKey', { peerId: data.senderId });
          return;
        }
        
        await processMessage(data, key, data.senderId);
      });

      newSocket.on('receiveMedia', (data) => {
        addMessage({ mediaUrl: data.url, mediaType: data.mediaType, senderId: data.senderId, timestamp: new Date(), mediaId: data.mediaId }, data.senderId);
        
        // Increment unread count if not viewing this chat
        if (data.senderId !== selectedUser) {
          incrementUnread(data.senderId);
        }
      });

      newSocket.on('mediaSent', (data) => {
        setMessages(prev => {
          const updated = prev.map(msg => {
            if (msg.mediaUrl === 'loading...' && msg.senderId === userId && msg.mediaId === data.mediaId) {
              return { 
                ...msg, 
                mediaUrl: data.masterUrl,
                messageId: data.messageId,
                timestamp: new Date()
              };
            }
            return msg;
          });
          if (data.receiverId === selectedUser) {
            saveMessagesToStorage(selectedUser, updated);
          }
          return updated;
        });
      });

      newSocket.on('messageError', (data) => alert('Error: ' + data.error));
    };

    initSocket();
    return () => socket?.disconnect();
  }, [token]);

  // Load unread counts on mount
  useEffect(() => {
    const counts = loadUnreadCounts();
    setUnreadCounts(counts);
  }, []);

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      saveMessagesToStorage(selectedUser, messages);
    }
  }, [messages, selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser || !privateKeyRef.current) return;
    
    // Don't load from localStorage here - let ChatPage handle it via decryptHistory
    // This avoids showing undecrypted messages before server data arrives
    setMessages([]);
    clearUnread(selectedUser);
    
    getSharedKey(selectedUser).then(key => {
      if (key) {
        setSharedKey(key);
      } else {
        socket.emit('requestPeerPublicKey', { peerId: selectedUser });
        setSharedKey(null);
      }
    });
  }, [socket, selectedUser]);

  const sendMessage = async (text) => {
    if (!socket || !selectedUser) return;

    let key = await getSharedKey(selectedUser);
    
    if (!key) {
      socket.emit('requestPeerPublicKey', { peerId: selectedUser });
      
      // Wait for key (5 second timeout)
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        key = peerSharedKeysRef.current[selectedUser];
        if (key) break;
      }
      
      if (!key) return alert('Unable to establish secure connection. Please try again.');
    }
    
    const ciphertext = await encryptMessage(text, key);
    socket.emit('sendMessage', { ciphertext, receiverId: selectedUser });
    addMessage({ text, senderId: userId, timestamp: new Date() });
  };

  // Forward a message (text or media) to a target user without switching chats
  const forwardMessage = async (message, targetUserId) => {
    if (!socket || !targetUserId) return;

    // Media forwarding
    if (message.mediaId) {
      socket.emit('shareMedia', { mediaId: message.mediaId, receiverId: targetUserId });
      // Only append to UI if we're currently viewing that chat
      if (targetUserId === selectedUser) {
        addMessage({ mediaUrl: 'loading...', senderId: userId, timestamp: new Date() }, targetUserId);
      } else {
        // Persist to localStorage for that peer
        const existing = loadMessagesFromStorage(targetUserId);
        existing.push({ mediaUrl: 'loading...', senderId: userId, timestamp: new Date() });
        saveMessagesToStorage(targetUserId, existing);
        incrementUnread(targetUserId);
      }
      return;
    }

    const textToForward = message.text || '';
    if (!textToForward) return;

    let key = await getSharedKey(targetUserId);
    if (!key) {
      socket.emit('requestPeerPublicKey', { peerId: targetUserId });
      // Wait for key (5 second timeout)
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        key = peerSharedKeysRef.current[targetUserId];
        if (key) break;
      }
      if (!key) throw new Error('Unable to establish secure connection with target user.');
    }

    const ciphertext = await encryptMessage(textToForward, key);
    socket.emit('sendMessage', { ciphertext, receiverId: targetUserId });

    const newMsg = { text: textToForward, senderId: userId, timestamp: new Date() };
    if (targetUserId === selectedUser) {
      addMessage(newMsg, targetUserId);
    } else {
      const existing = loadMessagesFromStorage(targetUserId);
      existing.push(newMsg);
      saveMessagesToStorage(targetUserId, existing);
      incrementUnread(targetUserId);
    }
  };

  const shareMedia = (mediaId) => {
    if (!socket || !selectedUser) return;
    socket.emit('shareMedia', { mediaId, receiverId: selectedUser });
    addMessage({ mediaUrl: 'loading...', senderId: userId, timestamp: new Date(), mediaId }, selectedUser);
  };

  const mergeWithStoredMessages = (serverMessages, storedMessages) => {
    // Create a map of stored messages by messageId for quick lookup
    const storedMap = new Map();
    storedMessages.forEach(msg => {
      if (msg.messageId || msg._id) {
        storedMap.set(msg.messageId || msg._id, msg);
      }
    });
    
    return serverMessages.map(serverMsg => {
      const msgId = serverMsg._id || serverMsg.messageId;
      const stored = storedMap.get(msgId);
      
      if (stored && stored.text && !stored.text.startsWith('[') && stored.text !== 'Message encrypted with old key system') {
        return {
          ...serverMsg,
          text: stored.text,
          decrypted: true,
          messageId: msgId
        };
      }
      return { ...serverMsg, messageId: msgId };
    });
  };

  const decryptHistory = async (messages, otherUserId) => {
    const storedMessages = loadMessagesFromStorage(otherUserId);
    let mergedMessages = mergeWithStoredMessages(messages, storedMessages);
    
    let key = peerSharedKeysRef.current[otherUserId];
    
    if (!key) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      key = peerSharedKeysRef.current[otherUserId];
    }
    
    // If no key, return merged messages (localStorage text takes priority)
    // Don't show [Encrypted] if we have decrypted text from localStorage
    if (!key) {
      return mergedMessages.map(msg => {
        // If already decrypted from localStorage, keep it
        if (msg.decrypted && msg.text) return msg;
        
        // For undecrypted messages without localStorage text
        if (msg.ciphertext && !msg.text) {
          return {
            ...msg,
            text: '[wEncrypted - Key not available]',
            decrypted: false
          };
        }
        
        return msg;
      });
    }
    
    const decryptedMessages = await Promise.all(mergedMessages.map(async (msg) => {
      // Already decrypted from localStorage or is media
      if (msg.decrypted || msg.mediaUrl || (msg.text && !msg.ciphertext)) {
        return msg;
      }
      
      if (msg.ciphertext) {
        try {
          const text = await decryptMessage(msg.ciphertext, key);
          return { ...msg, text, decrypted: true };
        } catch (err) {
          return { ...msg, text: 'Message encrypted with old key system', decrypted: false, oldEncrypted: true };
        }
      }
      
      return msg;
    }));
    
    saveMessagesToStorage(otherUserId, decryptedMessages);
    
    return decryptedMessages;
  };

  return { socket, messages, setMessages, sendMessage, shareMedia, sharedKey, decryptHistory, clearStorageForPeer, unreadCounts, clearUnread, forwardMessage };
}
