import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Menu, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function ChatHeader({ selectedUserName, selectedUserAvatar, onMenuClick, onDeleteChat }) {
  return (
    <motion.div
      className="h-16 bg-card/80 backdrop-blur-md border-b border-border/50 flex items-center px-4 md:px-6 shadow-sm z-10 relative"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          onClick={onMenuClick}
          variant="ghost"
          size="icon"
          className="md:hidden mr-2 hover:bg-primary/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </motion.div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <Avatar className="w-10 h-10 mr-3 ring-2 ring-primary/10 shadow-sm">
          <AvatarImage
            src={selectedUserAvatar || undefined}
            alt={selectedUserName}
          />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
            {selectedUserName?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </motion.div>
      <motion.div
        className="flex-1"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="font-bold text-foreground text-sm md:text-base tracking-tight">{selectedUserName}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Online
        </div>
      </motion.div>
      {onDeleteChat && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            onClick={onDeleteChat}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete this conversation"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
