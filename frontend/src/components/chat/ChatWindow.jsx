import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Loader2, Lock, Forward } from 'lucide-react';
import { MediaViewerDialog } from './MediaViewerDialog';
import { ForwardMessageDialog } from './ForwardMessageDialog';

const API_BASE = 'http://localhost:3001/api';

export function ChatWindow({ messages, onSendMessage, userId, userMap, onUploadMedia, token, onLogout, users, onForwardMessage, selectedUser }) {
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

  const handleAuthError = (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      onLogout?.();
      return true;
    }
    return false;
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const { data } = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      onUploadMedia(data.mediaId);
      fileInputRef.current.value = '';
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setUploading(false);
    }
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
    
    setLoadingProvenance(true);
    try {
      const { data } = await axios.get(`${API_BASE}/media/${mediaId}/provenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProvenance(data);
      toast.success('Provenance loaded');
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to fetch provenance: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoadingProvenance(false);
    }
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getMediaType = (msg) => {
    if (msg.mediaType === 'video' || msg.mediaUrl?.includes('video') || msg.mediaUrl?.endsWith('.mp4')) return 'video';
    if (msg.mediaType === 'audio' || msg.mediaUrl?.includes('audio') || msg.mediaUrl?.match(/\.(mp3|wav)$/)) return 'audio';
    return 'image';
  };

  const renderMediaPreview = (msg) => {
    if (msg.mediaUrl === 'loading...') return <div className="p-4 text-center">Uploading...</div>;
    
    const mediaType = getMediaType(msg);
    const mediaData = { type: mediaType, url: msg.mediaUrl, sender: userMap[msg.senderId], mediaId: msg.mediaId };
    const MediaTag = mediaType === 'video' ? 'video' : mediaType === 'audio' ? 'audio' : 'img';
    
    return (
      <div className="cursor-pointer" onClick={() => handleMediaClick(mediaData)}>
        <MediaTag 
          src={msg.mediaUrl} 
          alt={mediaType === 'image' ? 'shared media' : undefined}
          className={mediaType === 'audio' ? 'w-full' : 'max-w-full rounded-lg'}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
        {mediaType !== 'audio' && (
          <div className="absolute inset-0 bg-white bg-opacity-30 flex items-center justify-center pointer-events-none text-xl font-bold text-red-600">
            {userMap[msg.senderId] || 'Unknown'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 px-2 md:px-4 bg-muted/20 overflow-y-auto">
        <div className="space-y-2 md:space-y-3 py-2 md:py-4">
          {messages.map((msg, index) => {
            const msgDate = new Date(msg.timestamp || msg.createdAt);
            const showDateSeparator = index === 0 || msgDate.toDateString() !== new Date(messages[index - 1].timestamp || messages[index - 1].createdAt).toDateString();
            const isOwn = msg.senderId === userId;
            
            return (
              <div key={index}>
                {showDateSeparator && (
                  <div className="flex justify-center my-2 md:my-4">
                    <span className="text-[10px] md:text-xs text-muted-foreground bg-muted px-2 md:px-3 py-1 rounded-full">
                      {msgDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                  <div className="flex items-end gap-1">
                    {!isOwn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleForwardClick(msg)}
                        title="Forward message"
                      >
                        <Forward className="h-3 w-3" />
                      </Button>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] md:max-w-md px-2 md:px-3 py-1.5 md:py-2 rounded-2xl shadow-sm text-sm md:text-base ${
                        isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-background border rounded-bl-sm'
                      }`}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
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
                    </div>
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleForwardClick(msg)}
                        title="Forward message"
                      >
                        <Forward className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="bg-card border-t p-2 md:p-4">
        <div className="flex gap-1 md:gap-2">
          <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" onChange={handleFileSelect} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" disabled={uploading} title="Attach media" className="h-9 w-9 md:h-10 md:w-10">
            {uploading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Paperclip className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Write a message..."
            className="flex-1 bg-background text-sm md:text-base h-9 md:h-10"
            disabled={uploading}
          />
          <Button onClick={handleSend} size="icon" className="h-9 w-9 md:h-10 md:w-10" disabled={uploading}>
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>

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
