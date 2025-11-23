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
      <div className="p-2 space-y-1">
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="w-full bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Users'}
          </Button>
        </div>

        {users.filter(u => u._id !== currentUserId).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-8 text-muted-foreground text-sm bg-muted/30 rounded-xl border border-dashed border-border"
          >
            No other users available
          </motion.div>
        ) : (
          <AnimatePresence>
            {users.filter(u => u._id !== currentUserId).map((u, index) => {
              const unreadCount = unreadCounts[u._id] || 0;
              const isSelected = selectedUser === u._id;

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
                  className={`p-3 mb-2 rounded-xl cursor-pointer transition-all relative group border ${isSelected
                      ? 'bg-primary/10 border-primary/20 shadow-md'
                      : 'bg-card/40 border-transparent hover:bg-card/80 hover:border-border/50 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.3 }}
                      className="relative"
                    >
                      <Avatar className={`w-10 h-10 md:w-11 md:h-11 mr-3 ring-2 transition-all ${isSelected ? 'ring-primary/30' : 'ring-transparent group-hover:ring-primary/10'}`}>
                        <AvatarImage
                          src={u.avatar ? `${API_BASE_URL}${u.avatar}` : undefined}
                          alt={u.username}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {u.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm md:text-base truncate transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {u.username}
                      </div>
                      <div className="text-xs text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">
                        Click to chat
                      </div>
                    </div>

                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Badge variant="default" className="ml-2 bg-primary text-primary-foreground shadow-lg shadow-primary/25 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {isSelected && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </ScrollArea>
  );
}
