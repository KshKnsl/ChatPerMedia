import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      title="Toggle theme"
    >
      <span className="text-xl dark:hidden">🌙</span>
      <span className="text-xl hidden dark:inline">☀️</span>
    </Button>
  );
}
