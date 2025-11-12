import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { motion, AnimatePresence } from 'motion/react';

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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-4 text-muted-foreground text-sm"
          >
            No other users available
          </motion.div>
        ) : (
          <AnimatePresence>
            {users.filter(u => u._id !== currentUserId).map((u, index) => {
              const unreadCount = unreadCounts[u._id] || 0;
              return (
                <motion.div
                  key={u._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectUser(u._id)}
                  className={`p-2 md:p-3 mb-1 rounded-lg cursor-pointer transition-all relative ${
                    selectedUser === u._id 
                      ? 'bg-primary/10 text-primary shadow-md' 
                      : 'hover:bg-accent text-foreground hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Avatar className="w-9 h-9 md:w-10 md:h-10 mr-2 md:mr-3 ring-2 ring-primary/20">
                        <AvatarImage 
                          src={u.avatar ? `${API_BASE_URL}${u.avatar}` : undefined}
                          alt={u.username}
                        />
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {u.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base truncate">{u.username}</div>
                    </div>
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Badge variant="default" className="ml-2 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </ScrollArea>
  );
}
