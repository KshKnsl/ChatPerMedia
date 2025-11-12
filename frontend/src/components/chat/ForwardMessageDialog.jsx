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
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-semibold">Forward Message To</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mb-2">
          Press number keys 1-9 for quick selection, or Escape to cancel
        </DialogDescription>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="space-y-2">
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
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left relative focus:outline-none focus:ring-2 focus:ring-primary"
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
                      <div className="absolute top-2 right-2 bg-primary/20 text-primary text-xs font-bold rounded px-1.5 py-0.5">
                        {index + 1}
                      </div>
                    )}
                    <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                      <AvatarImage 
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        alt={user.username}
                      />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
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
