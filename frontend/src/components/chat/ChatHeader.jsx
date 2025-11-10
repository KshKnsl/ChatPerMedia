import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function ChatHeader({ selectedUserName, selectedUserAvatar, onMenuClick }) {
  return (
    <div className="h-16 bg-card border-b border-border flex items-center px-4 md:px-6">
      <Button 
        onClick={onMenuClick}
        variant="ghost" 
        size="icon"
        className="lg:hidden mr-2"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3 overflow-hidden">
        {selectedUserAvatar ? (
          <img 
            src={selectedUserAvatar} 
            alt={selectedUserName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-primary font-semibold text-sm md:text-base">
            {selectedUserName?.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-foreground text-sm md:text-base">{selectedUserName}</div>
      </div>
    </div>
  );
}
