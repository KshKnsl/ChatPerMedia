import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, Send, Loader2, Lock, Forward } from 'lucide-react';
import { MediaViewerDialog } from './MediaViewerDialog';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { api, uploadFile } from '@/utils/api';
import { API_BASE_URL } from '@/config';
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
    const mediaData = { type: mediaType, url: `${API_BASE_URL}${msg.mediaUrl}`, sender: userMap[msg.senderId], mediaId: msg.mediaId, timestamp: msg.timestamp || msg.createdAt };
    const MediaTag = mediaType === 'video' ? 'video' : 'img';

    return (
      <div className="cursor-pointer" onClick={() => handleMediaClick(mediaData)}>
        <MediaTag
          src={`${API_BASE_URL}${msg.mediaUrl}`}
          alt={mediaType === 'image' ? 'shared media' : undefined}
          className="max-w-full rounded-lg"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <ScrollArea className="flex-1 px-2 md:px-4 overflow-y-auto">
        <div className="space-y-4 py-4 md:py-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const msgDate = new Date(msg.timestamp || msg.createdAt);
              const showDateSeparator = index === 0 || msgDate.toDateString() !== new Date(messages[index - 1].timestamp || messages[index - 1].createdAt).toDateString();
              const isOwn = msg.senderId === userId;

              return (
                <motion.div
                  key={`${msg._id || index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, delay: index * 0.02 }}
                  layout
                >
                  {showDateSeparator && (
                    <motion.div
                      className="flex justify-center my-6"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80 bg-muted/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
                        {msgDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </motion.div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}>
                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && (
                        <Avatar className="w-6 h-6 md:w-8 md:h-8 mb-1 ring-2 ring-background shadow-sm">
                          <AvatarImage src={users.find(u => u._id === msg.senderId)?.avatar ? `${API_BASE_URL}${users.find(u => u._id === msg.senderId).avatar}` : undefined} />
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            {userMap[msg.senderId]?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex flex-col gap-1">
                        <motion.div
                          className={`px-4 py-2 md:py-3 shadow-sm text-sm md:text-base relative ${isOwn
                              ? 'bg-gradient-to-br from-primary to-red-600 text-primary-foreground rounded-2xl rounded-tr-sm'
                              : 'bg-card border text-card-foreground rounded-2xl rounded-tl-sm'
                            }`}
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {msg.mediaUrl ? (
                            <div className="relative -mx-2 -my-1 md:-mx-3 md:-my-2">
                              <div className="rounded-xl overflow-hidden">
                                {renderMediaPreview(msg)}
                              </div>
                            </div>
                          ) : (
                            <div className="break-words whitespace-pre-wrap flex items-start gap-2">
                              {(msg.oldEncrypted || (msg.ciphertext && !msg.decrypted)) && <Lock className="h-3.5 w-3.5 mt-1 flex-shrink-0 opacity-70" />}
                              <span className="leading-relaxed">{msg.text || (msg.ciphertext ? '[Encrypted]' : 'Message')}</span>
                            </div>
                          )}
                        </motion.div>
                        <div className={`text-[10px] px-1 flex items-center gap-1 ${isOwn ? 'justify-end text-muted-foreground' : 'justify-start text-muted-foreground'}`}>
                          <span>{formatTime(msg.timestamp || msg.createdAt || Date.now())}</span>
                          {isOwn && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/5 inline-flex items-center justify-center"
                              onClick={() => handleForwardClick(msg)}
                              aria-label="Forward message"
                            >
                              <Forward className="h-4 w-4" />
                            </motion.button>
                          )}
                          {!isOwn && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/5 inline-flex items-center justify-center"
                              onClick={() => handleForwardClick(msg)}
                              aria-label="Forward message"
                            >
                              <Forward className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <motion.div
          className="bg-card/80 backdrop-blur-xl border shadow-lg rounded-2xl p-2 flex items-center gap-2 ring-1 ring-border/50"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <input ref={fileInputRef} type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" />
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              size="icon"
              disabled={uploading}
              className="h-10 w-10 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <AnimatePresence mode="wait">
                {uploading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="paperclip"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <Paperclip className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>

          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 text-base placeholder:text-muted-foreground/50 h-10"
              disabled={uploading}
              autoFocus
            />
          </div>

          <motion.div
            whileHover={{ scale: message.trim() ? 1.05 : 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleSend}
              size="icon"
              className={`h-10 w-10 rounded-xl transition-all duration-300 ${message.trim()
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted text-muted-foreground'
                }`}
              disabled={uploading || !message.trim()}
            >
              <Send className="h-5 w-5 ml-0.5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <MediaViewerDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        selectedMedia={selectedMedia}
        provenance={provenance}
        loadingProvenance={loadingProvenance}
        onFetchProvenance={fetchProvenance}
        token={token}
        onRequestForward={handleForwardClick}
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
