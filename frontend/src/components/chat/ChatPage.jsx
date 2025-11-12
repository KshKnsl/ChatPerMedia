import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { UserList } from './UserList';
import { ChatHeader } from './ChatHeader';
import { ChatWindow } from './ChatWindow';
import { useSocket } from '@/hooks/useSocket';
import { ThemeToggle } from '../ThemeToggle';
import { Menu, X, MessageCircle, Trash2, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { api } from '@/utils/api';
import { motion, AnimatePresence } from 'motion/react';

export function ChatPage({ userId, token, onLogout }) {
  useEffect(() => {
    api.setToken(token);
    api.setLogoutHandler(onLogout);
  }, [token, onLogout]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { messages, setMessages, sendMessage, shareMedia, sharedKey, decryptHistory, clearStorageForPeer, unreadCounts, clearUnread, forwardMessage } = useSocket(token, userId, selectedUser);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showSidebar) {
        setShowSidebar(false);
      }
      if (!selectedUser || document.activeElement.tagName !== 'INPUT') {
        const filteredUsers = users.filter(u => u._id !== userId);
        const currentIndex = filteredUsers.findIndex(u => u._id === selectedUser);
        
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          e.preventDefault();
          handleSelectUser(filteredUsers[currentIndex - 1]._id);
        } else if (e.key === 'ArrowDown' && currentIndex < filteredUsers.length - 1) {
          e.preventDefault();
          handleSelectUser(filteredUsers[currentIndex + 1]._id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSidebar, selectedUser, users, userId, refreshing]);

  const fetchUsers = async () => {
    const { data } = await api.fetchWithLoading('/users', setRefreshing);
    if (data) {
      setUsers(data);
      setUserMap(Object.fromEntries(data.map(u => [u._id, u.username])));
      setCurrentUser(data.find(u => u._id === userId));
    }
  };

  const handleSelectUser = async (selectedUserId) => {
    setSelectedUser(selectedUserId);
    const { data } = await api.get(`/messages/${selectedUserId}`);
    if (!data || data.length === 0) return;

    const decrypted = await decryptHistory(data, selectedUserId);
    setMessages(decrypted);
    
    if (!sharedKey) {
      const checkKey = setInterval(async () => {
        if (sharedKey) {
          clearInterval(checkKey);
          setMessages(await decryptHistory(data, selectedUserId));
        }
      }, 500);
      setTimeout(() => clearInterval(checkKey), 10000);
    }
  };

  const handleClearMessages = async () => {
    if (!confirm('Delete all your messages? This cannot be undone.')) return;
    const { data } = await api.delete('/messages/clear', {
      successMessage: data => `Deleted ${data.count} messages`,
      errorMessage: 'Failed to clear messages'
    });
    if (data) {
      setMessages([]);
      users.forEach(u => u._id !== userId && clearStorageForPeer(u._id));
      selectedUser && handleSelectUser(selectedUser);
      toast.success(`Deleted ${data.count} messages`);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account? This is irreversible.')) return;
    const { data } = await api.delete('/auth/account', {
      successMessage: 'Account deleted',
      errorMessage: 'Failed to delete account'
    });
    if (data) onLogout();
  };

  const handleForwardMessage = async (message, targetUserId) => {
    try {
      await forwardMessage(message, targetUserId);
      toast.success('Message forwarded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to forward: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedUser) return;
    const targetUserName = userMap[selectedUser] || 'this user';
    if (!confirm(`Delete all messages with ${targetUserName}? This cannot be undone.`)) return;
    const { data } = await api.delete(`/messages/${selectedUser}`, {
      errorMessage: 'Failed to delete chat'
    });
    if (data) {
      toast.success(`Deleted ${data.count} messages`);
      setMessages([]);
      clearStorageForPeer(selectedUser);
    }
  };

  const selectedUserData = users.find(u => u._id === selectedUser);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <motion.div 
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b p-4 flex items-center justify-between"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button onClick={() => setShowSidebar(!showSidebar)} variant="ghost" size="icon">
            <motion.div
              animate={{ rotate: showSidebar ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.div>
          </Button>
        </motion.div>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {selectedUserData ? (
              <motion.div
                key="selected-user"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedUserData.avatar ? `${API_BASE_URL}${selectedUserData.avatar}` : undefined} alt={userMap[selectedUser]} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {userMap[selectedUser]?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">{userMap[selectedUser]}</span>
              </motion.div>
            ) : (
              <motion.h1 
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-lg font-semibold"
              >
                ChatPerMedia
              </motion.h1>
            )}
          </AnimatePresence>
        </div>
        <ThemeToggle />
      </motion.div>

      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-40 w-72 md:w-80 bg-card border-r flex-col h-full overflow-hidden md:relative md:flex"
          >
            <div className="hidden md:flex p-4 border-b items-center justify-between">
              <h1 className="text-xl font-semibold">ChatPerMedia</h1>
              <div className="flex gap-2">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={refreshing} title="Refresh">
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </motion.div>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex-1 overflow-hidden mt-16 md:mt-0">
              <UserList 
                users={users} 
                selectedUser={selectedUser} 
                onSelectUser={(uid) => {
                  handleSelectUser(uid);
                  setShowSidebar(false);
                }}
                currentUserId={userId}
                onRefresh={fetchUsers}
                refreshing={refreshing}
                unreadCounts={unreadCounts}
              />
            </div>

            <Separator />
            
            <motion.div 
              className="p-4 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarImage 
                    src={currentUser?.avatar ? `${API_BASE_URL}${currentUser.avatar}` : undefined}
                    alt={currentUser?.username}
                  />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {currentUser?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{currentUser?.username || 'You'}</div>
                  <div className="text-xs text-muted-foreground truncate">{currentUser?.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={handleClearMessages} variant="outline" size="sm" className="col-span-2 text-destructive hover:bg-destructive/10 w-full">
                    <Trash2 className="h-4 w-4 mr-2" />Clear Messages
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={onLogout} variant="secondary" size="sm" className="w-full">Logout</Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={handleDeleteAccount} variant="destructive" size="sm" className="w-full">Delete Account</Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {selectedUser ? (
          <motion.div
            key="chat-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <ChatHeader 
              selectedUserName={userMap[selectedUser]}
              selectedUserAvatar={selectedUserData?.avatar ? `${API_BASE_URL}${selectedUserData.avatar}` : null}
              onMenuClick={() => setShowSidebar(true)}
              onDeleteChat={handleDeleteChat}
            />
            <div className="flex-1 overflow-hidden">
              <ChatWindow 
                messages={messages} 
                onSendMessage={sendMessage} 
                userId={userId} 
                userMap={userMap}
                onUploadMedia={shareMedia}
                token={token}
                onLogout={onLogout}
                users={users}
                onForwardMessage={handleForwardMessage}
                selectedUser={selectedUser}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="empty-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex items-center justify-center px-4"
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <MessageCircle className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-4 text-muted-foreground" />
              </motion.div>
              <div className="text-lg md:text-xl text-muted-foreground">Select a chat to start messaging</div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => setShowSidebar(true)} variant="outline" className="mt-4 lg:hidden">
                  <Menu className="h-4 w-4 mr-2" />Open Chats
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
