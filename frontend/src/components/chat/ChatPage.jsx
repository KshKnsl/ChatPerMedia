import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserList } from './UserList';
import { ChatHeader } from './ChatHeader';
import { ChatWindow } from './ChatWindow';
import { useSocket } from '@/hooks/useSocket';
import { ThemeToggle } from '../ThemeToggle';
import { Menu, X, MessageCircle, Trash2, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export function ChatPage({ userId, token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { messages, setMessages, sendMessage, shareMedia, sharedKey, decryptHistory, clearStorageForPeer, unreadCounts, clearUnread, forwardMessage } = useSocket(token, userId, selectedUser);

  useEffect(() => { fetchUsers(); }, []);

  const headers = { Authorization: `Bearer ${token}` };
  
  const handleAuthError = (err) => {
    if (err.response?.status === 403 || err.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      onLogout();
      return true;
    }
    return false;
  };

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.get(`${API_BASE}/users`, { headers });
      setUsers(data);
      setUserMap(Object.fromEntries(data.map(u => [u._id, u.username])));
      setCurrentUser(data.find(u => u._id === userId));
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectUser = async (selectedUserId) => {
    setSelectedUser(selectedUserId);
    try {
      const { data } = await axios.get(`${API_BASE}/messages/${selectedUserId}`, { headers });
      if (data.length === 0) return;

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
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    }
  };

  const handleClearMessages = async () => {
    if (!confirm('Delete all your messages? This cannot be undone.')) return;
    try {
      const { data } = await axios.delete(`${API_BASE}/messages/clear`, { headers });
      toast.success(`Deleted ${data.count} messages`);
      setMessages([]);
      users.forEach(u => u._id !== userId && clearStorageForPeer(u._id));
      selectedUser && handleSelectUser(selectedUser);
    } catch (err) {
      if (!handleAuthError(err)) {
        toast.error('Failed to clear: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account? This is irreversible.')) return;
    try {
      await axios.delete(`${API_BASE}/auth/account`, { headers });
      toast.success('Account deleted');
      onLogout();
    } catch (err) {
      if (!handleAuthError(err)) {
        toast.error('Failed to delete: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleForwardMessage = async (message, targetUserId) => {
    try {
      await forwardMessage(message, targetUserId);
      toast.success('Message forwarded');
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err)) {
        toast.error('Failed to forward: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const selectedUserData = users.find(u => u._id === selectedUser);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b p-4 flex items-center justify-between">
        <Button onClick={() => setShowSidebar(!showSidebar)} variant="ghost" size="icon">
          {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          {selectedUserData ? (
            <>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                {selectedUserData.avatar ? (
                  <img src={`http://localhost:3001${selectedUserData.avatar}`} alt={userMap[selectedUser]} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-semibold">{userMap[selectedUser]?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <span className="font-semibold">{userMap[selectedUser]}</span>
            </>
          ) : (
            <h1 className="text-lg font-semibold">ChatPerMedia</h1>
          )}
        </div>
        <ThemeToggle />
      </div>

      <div className={`${showSidebar ? 'fixed inset-y-0 left-0 z-40' : 'hidden'} md:relative md:flex w-72 md:w-80 bg-card border-r flex-col h-full overflow-hidden`}>
        <div className="hidden md:flex p-4 border-b items-center justify-between">
          <h1 className="text-xl font-semibold">ChatPerMedia</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={refreshing} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
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

        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
              {currentUser?.avatar ? (
                <img src={`http://localhost:3001${currentUser.avatar}`} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-semibold">{currentUser?.username?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{currentUser?.username || 'You'}</div>
              <div className="text-xs text-muted-foreground truncate">{currentUser?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleClearMessages} variant="outline" size="sm" className="col-span-2 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-2" />Clear Messages
            </Button>
            <Button onClick={onLogout} variant="secondary" size="sm">Logout</Button>
            <Button onClick={handleDeleteAccount} variant="destructive" size="sm">Delete Account</Button>
          </div>
        </div>
      </div>

      {showSidebar && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowSidebar(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden mt-16 md:mt-0">
        {selectedUser ? (
          <>
            <ChatHeader 
              selectedUserName={userMap[selectedUser]}
              selectedUserAvatar={selectedUserData?.avatar ? `http://localhost:3001${selectedUserData.avatar}` : null}
              onMenuClick={() => setShowSidebar(true)}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-4 text-muted-foreground" />
              <div className="text-lg md:text-xl text-muted-foreground">Select a chat to start messaging</div>
              <Button onClick={() => setShowSidebar(true)} variant="outline" className="mt-4 lg:hidden">
                <Menu className="h-4 w-4 mr-2" />Open Chats
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
