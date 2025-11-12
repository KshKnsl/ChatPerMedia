import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Menu, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function ChatHeader({ selectedUserName, selectedUserAvatar, onMenuClick, onDeleteChat }) {
  return (
    <motion.div 
      className="h-16 bg-card border-b border-border flex items-center px-4 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button 
          onClick={onMenuClick}
          variant="ghost" 
          size="icon"
          className="md:hidden mr-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </motion.div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <Avatar className="w-10 h-10 mr-3 ring-2 ring-primary/20">
          <AvatarImage 
            src={selectedUserAvatar || undefined}
            alt={selectedUserName}
          />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
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
        <div className="font-semibold text-foreground text-sm md:text-base">{selectedUserName}</div>
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
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete this conversation"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
