import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

export function ForwardMessageDialog({ open, onOpenChange, users, userId, selectedUser, onForwardToUser }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }

      if (open && e.key >= '1' && e.key <= '9') {
        const filteredUsers = users?.filter(u => u._id !== userId && u._id !== selectedUser) || [];
        const index = parseInt(e.key) - 1;
        if (index < filteredUsers.length) {
          e.preventDefault();
          onForwardToUser(filteredUsers[index]._id);
        }
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, users, userId, selectedUser, onForwardToUser, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500">Forward Message</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mb-2">
          Select a user to forward this message to.
        </DialogDescription>
        <ScrollArea className="h-[350px] w-full pr-4 -mr-4">
          <div className="space-y-2 p-1">
            <AnimatePresence>
              {users
                ?.filter(user => user._id !== userId && user._id !== selectedUser)
                .map((user, index) => (
                  <motion.button
                    key={user._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onForwardToUser(user._id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all text-left relative group focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus={index === 0}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onForwardToUser(user._id);
                      }
                    }}
                  >
                    {index < 9 && (
                      <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-[10px] font-bold rounded-md px-1.5 py-0.5 border opacity-50 group-hover:opacity-100 transition-opacity">
                        {index + 1}
                      </div>
                    )}
                    <Avatar className="w-10 h-10 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                      <AvatarImage
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        alt={user.username}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{user.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                  </motion.button>
                ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
