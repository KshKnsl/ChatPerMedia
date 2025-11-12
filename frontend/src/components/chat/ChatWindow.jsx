import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Loader2, Lock, Forward } from 'lucide-react';
import { MediaViewerDialog } from './MediaViewerDialog';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { api, uploadFile } from '@/utils/api';
import { motion, AnimatePresence } from 'motion/react';

export function ChatWindow({ messages, onSendMessage, userId, userMap, onUploadMedia, token, onLogout, users, onForwardMessage, selectedUser }) {
  useEffect(() => {
    api.setToken(token);
    api.setLogoutHandler(onLogout);
  }, [token, onLogout]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [provenance, setProvenance] = useState(null);
  const [loadingProvenance, setLoadingProvenance] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    const { data } = await uploadFile('/upload', formData, token, {
      errorMessage: 'Upload failed'
    });
    
    if (data) {
      onUploadMedia(data.mediaId);
      fileInputRef.current.value = '';
    }
    setUploading(false);
  };

  const handleMediaClick = (media) => {
    setSelectedMedia(media);
    setMediaDialogOpen(true);
    setProvenance(null);
  };

  const handleForwardClick = (msg) => {
    setMessageToForward(msg);
    setForwardDialogOpen(true);
  };

  const handleForwardToUser = (targetUserId) => {
    if (onForwardMessage && messageToForward) {
      onForwardMessage(messageToForward, targetUserId);
      setForwardDialogOpen(false);
      setMessageToForward(null);
    }
  };

  const fetchProvenance = async (mediaId) => {
    if (!mediaId) return toast.error('Media ID not available');
    
    const { data } = await api.fetchWithLoading(`/media/${mediaId}/provenance`, setLoadingProvenance, {
      successMessage: 'Provenance loaded',
      errorMessage: 'Failed to fetch provenance'
    });
    if (data) setProvenance(data);
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getMediaType = (msg) => {
    if (msg.mediaType === 'video' || msg.mediaUrl?.includes('video') || msg.mediaUrl?.endsWith('.mp4')) return 'video';
    return 'image';
  };

  const renderMediaPreview = (msg) => {
    if (msg.mediaUrl === 'loading...') return <div className="p-4 text-center">Uploading...</div>;
    
    const mediaType = getMediaType(msg);
    const mediaData = { type: mediaType, url: msg.mediaUrl, sender: userMap[msg.senderId], mediaId: msg.mediaId };
    const MediaTag = mediaType === 'video' ? 'video' : 'img';
    
    return (
      <div className="cursor-pointer" onClick={() => handleMediaClick(mediaData)}>
        <MediaTag 
          src={msg.mediaUrl} 
          alt={mediaType === 'image' ? 'shared media' : undefined}
          className="max-w-full rounded-lg"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
        <div className="absolute inset-0 bg-white bg-opacity-30 flex items-center justify-center pointer-events-none text-xl font-bold text-red-600">
          {userMap[msg.senderId] || 'Unknown'}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 px-2 md:px-4 bg-muted/20 overflow-y-auto">
        <div className="space-y-2 md:space-y-3 py-2 md:py-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const msgDate = new Date(msg.timestamp || msg.createdAt);
              const showDateSeparator = index === 0 || msgDate.toDateString() !== new Date(messages[index - 1].timestamp || messages[index - 1].createdAt).toDateString();
              const isOwn = msg.senderId === userId;
              
              return (
                <motion.div 
                  key={`${msg._id || index}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    delay: index * 0.02
                  }}
                  layout
                >
                  {showDateSeparator && (
                    <motion.div 
                      className="flex justify-center my-2 md:my-4"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-[10px] md:text-xs text-muted-foreground bg-muted px-2 md:px-3 py-1 rounded-full">
                        {msgDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </motion.div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                    <div className="flex items-end gap-1">
                      {!isOwn && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          whileHover={{ opacity: 1, x: 0 }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleForwardClick(msg)}
                            title="Forward message"
                          >
                            <Forward className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      )}
                      <motion.div
                        className={`max-w-[85%] sm:max-w-[75%] md:max-w-md px-2 md:px-3 py-1.5 md:py-2 rounded-2xl shadow-sm text-sm md:text-base ${
                          isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-background border rounded-bl-sm'
                        }`}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {msg.mediaUrl ? (
                          <div className="relative">{renderMediaPreview(msg)}</div>
                        ) : (
                          <div className="break-words whitespace-pre-wrap flex items-start gap-2">
                            {(msg.oldEncrypted || (msg.ciphertext && !msg.decrypted)) && <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                            <span>{msg.text || (msg.ciphertext ? '[Encrypted]' : 'Message')}</span>
                          </div>
                        )}
                        <div className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                          {formatTime(msg.timestamp || msg.createdAt || Date.now())}
                        </div>
                      </motion.div>
                      {isOwn && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          whileHover={{ opacity: 1, x: 0 }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleForwardClick(msg)}
                            title="Forward message"
                          >
                            <Forward className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <motion.div 
        className="bg-card border-t p-2 md:p-4"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex gap-1 md:gap-2">
          <input ref={fileInputRef} type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" />
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" disabled={uploading} title="Attach media" className="h-9 w-9 md:h-10 md:w-10">
              <AnimatePresence mode="wait">
                {uploading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="paperclip"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
          <motion.div 
            className="flex-1"
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
              className="flex-1 bg-background text-sm md:text-base h-9 md:h-10 transition-all focus:ring-2"
              disabled={uploading}
              autoFocus
            />
          </motion.div>
          <motion.div 
            whileHover={{ scale: message.trim() ? 1.1 : 1, rotate: message.trim() ? -15 : 0 }} 
            whileTap={{ scale: 0.9 }}
            animate={{ 
              scale: message.trim() ? 1 : 0.9,
              opacity: message.trim() ? 1 : 0.5
            }}
            transition={{ duration: 0.2 }}
          >
            <Button 
              onClick={handleSend} 
              size="icon" 
              className={`h-9 w-9 md:h-10 md:w-10 transition-all ${message.trim() ? 'bg-primary hover:bg-primary/90' : ''}`}
              disabled={uploading || !message.trim()}
              title={message.trim() ? 'Send message (Enter)' : 'Type a message first'}
            >
              <motion.div
                animate={{ 
                  x: message.trim() ? [0, 2, 0] : 0 
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: message.trim() ? Infinity : 0,
                  repeatDelay: 1
                }}
              >
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <MediaViewerDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        selectedMedia={selectedMedia}
        provenance={provenance}
        loadingProvenance={loadingProvenance}
        onFetchProvenance={fetchProvenance}
        token={token}
      />

      <ForwardMessageDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        users={users}
        userId={userId}
        selectedUser={selectedUser}
        onForwardToUser={handleForwardToUser}
      />
    </div>
  );
}
