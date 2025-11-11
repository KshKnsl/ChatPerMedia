import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserList } from './UserList';
import { ChatHeader } from './ChatHeader';
import { ChatWindow } from './ChatWindow';
import { useSocket } from '@/hooks/useSocket';
import { ThemeToggle } from '../ThemeToggle';
import { Menu, X, MessageCircle, Trash2, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { api } from '@/utils/api';

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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b p-4 flex items-center justify-between">
        <Button onClick={() => setShowSidebar(!showSidebar)} variant="ghost" size="icon">
          {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          {selectedUserData ? (
            <>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                {selectedUserData.avatar ? (
                  <img src={`${API_BASE_URL}${selectedUserData.avatar}`} alt={userMap[selectedUser]} className="w-full h-full object-cover" />
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
                <img src={`${API_BASE_URL}${currentUser.avatar}`} alt={currentUser.username} className="w-full h-full object-cover" />
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
