import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function UserList({ users, selectedUser, onSelectUser, currentUserId, onRefresh, refreshing, unreadCounts = {} }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="md:hidden mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Users'}
          </Button>
        </div>
        
        {users.filter(u => u._id !== currentUserId).length === 0 ? (
          <div className="text-center p-4 text-muted-foreground text-sm">
            No other users available
          </div>
        ) : (
          users.filter(u => u._id !== currentUserId).map(u => {
            const unreadCount = unreadCounts[u._id] || 0;
            return (
              <div
                key={u._id}
                onClick={() => onSelectUser(u._id)}
                className={`p-2 md:p-3 mb-1 rounded-lg cursor-pointer transition-colors relative ${
                  selectedUser === u._id 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center mr-2 md:mr-3 flex-shrink-0 overflow-hidden relative">
                    {u.avatar ? (
                      <img 
                        src={`http://localhost:3001${u.avatar}`} 
                        alt={u.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-semibold text-sm md:text-base">
                        {u.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm md:text-base truncate">{u.username}</div>
                  </div>
                  {unreadCount > 0 && (
                    <div className="ml-2 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
