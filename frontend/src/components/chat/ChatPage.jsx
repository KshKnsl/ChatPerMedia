import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
    <div className="flex h-screen bg-background overflow-hidden relative">
      
      <div className="absolute inset-0 bg-grid-slate-200/20 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800/20 pointer-events-none" />

      <motion.div
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b p-4 flex items-center justify-between shadow-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button onClick={() => setShowSidebar(!showSidebar)} variant="ghost" size="icon" className="hover:bg-primary/10">
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
                <Avatar className="w-8 h-8 ring-2 ring-primary/10">
                  <AvatarImage src={selectedUserData.avatar ? `${API_BASE_URL}${selectedUserData.avatar}` : undefined} alt={userMap[selectedUser]} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                    {userMap[selectedUser]?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm">{userMap[selectedUser]}</span>
              </motion.div>
            ) : (
              <motion.h1
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500"
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
            className="fixed inset-y-0 left-0 z-40 w-80 bg-card/95 backdrop-blur-xl border-r shadow-2xl flex-col h-full overflow-hidden md:hidden"
          >
            <div className="p-6 border-b items-center justify-between flex bg-muted/30">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500">ChatPerMedia</h1>
              <div className="flex gap-2">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={refreshing} title="Refresh" className="hover:bg-primary/10">
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </motion.div>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex-1 overflow-hidden mt-0 p-2">
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

            <div className="p-4 bg-muted/30 border-t space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border shadow-sm">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarImage
                    src={currentUser?.avatar ? `${API_BASE_URL}${currentUser.avatar}` : undefined}
                    alt={currentUser?.username}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {currentUser?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{currentUser?.username || 'You'}</div>
                  <div className="text-xs text-muted-foreground truncate">{currentUser?.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleClearMessages} variant="outline" size="sm" className="col-span-2 text-destructive hover:bg-destructive/10 hover:text-destructive w-full border-destructive/20">
                  <Trash2 className="h-4 w-4 mr-2" />Clear Messages
                </Button>
                <Button onClick={onLogout} variant="secondary" size="sm" className="w-full hover:bg-secondary/80">Logout</Button>
                <Button onClick={handleDeleteAccount} variant="destructive" size="sm" className="w-full shadow-sm">Delete</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      <div className="hidden md:flex md:relative md:w-80 bg-card/50 backdrop-blur-sm border-r flex-col h-full overflow-hidden z-10 shadow-sm">
        <div className="flex p-6 border-b items-center justify-between bg-muted/10">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500">ChatPerMedia</h1>
          <div className="flex gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={refreshing} title="Refresh" className="hover:bg-primary/10">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-3">
          <UserList
            users={users}
            selectedUser={selectedUser}
            onSelectUser={(uid) => {
              handleSelectUser(uid);
            }}
            currentUserId={userId}
            onRefresh={fetchUsers}
            refreshing={refreshing}
            unreadCounts={unreadCounts}
          />
        </div>

        <div className="p-4 border-t bg-muted/10 space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-background/80 border shadow-sm">
            <Avatar className="w-10 h-10 ring-2 ring-primary/20">
              <AvatarImage
                src={currentUser?.avatar ? `${API_BASE_URL}${currentUser.avatar}` : undefined}
                alt={currentUser?.username}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {currentUser?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{currentUser?.username || 'You'}</div>
              <div className="text-xs text-muted-foreground truncate">{currentUser?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleClearMessages} variant="outline" size="sm" className="col-span-2 text-destructive hover:bg-destructive/10 hover:text-destructive w-full border-destructive/20 transition-colors">
              <Trash2 className="h-4 w-4 mr-2" />Clear Messages
            </Button>
            <Button onClick={onLogout} variant="secondary" size="sm" className="w-full hover:bg-secondary/80 transition-colors">Logout</Button>
            <Button onClick={handleDeleteAccount} variant="destructive" size="sm" className="w-full shadow-sm hover:bg-destructive/90 transition-colors">Delete</Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
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
            className="flex-1 flex flex-col h-full overflow-hidden relative z-0"
          >
            <ChatHeader
              selectedUserName={userMap[selectedUser]}
              selectedUserAvatar={selectedUserData?.avatar ? `${API_BASE_URL}${selectedUserData.avatar}` : null}
              onMenuClick={() => setShowSidebar(true)}
              onDeleteChat={handleDeleteChat}
            />
            <div className="flex-1 overflow-hidden bg-background/50 backdrop-blur-sm">
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
            className="flex-1 flex items-center justify-center px-4 relative z-0"
          >
            <div className="text-center p-8 rounded-3xl bg-card/30 backdrop-blur-md border border-border/50 shadow-2xl max-w-md">
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
                className="inline-block p-6 rounded-full bg-primary/5 mb-6 ring-1 ring-primary/10"
              >
                <MessageCircle className="h-16 w-16 md:h-20 md:w-20 text-primary/80" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Welcome to ChatPerMedia</h2>
              <p className="text-muted-foreground mb-6">Select a conversation from the sidebar to start messaging securely.</p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => setShowSidebar(true)} variant="default" className="md:hidden shadow-lg shadow-primary/20">
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
