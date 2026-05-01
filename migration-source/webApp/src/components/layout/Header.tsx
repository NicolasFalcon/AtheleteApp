import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEllieContext } from '@/hooks/useEllieContext';
import { generateProactiveNudges } from '@/lib/ellieEngine';

interface HeaderProps {
  onOpenNotifications?: () => void;
}

export function Header({ onOpenNotifications }: HeaderProps) {
  const { user } = useAuth();
  const { context } = useEllieContext();
  const nudgeCount = generateProactiveNudges(context).length;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = user?.name || 'User';

  return (
    <header className="flex items-center justify-between px-4 pb-2.5 pt-2.5 safe-area-pt">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background font-semibold text-xs">
          {getInitials(userName)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground leading-none">{getGreeting()},</p>
          <p className="font-semibold text-foreground text-sm leading-tight mt-0.5">{userName}</p>
        </div>
      </div>
      <button
        onClick={onOpenNotifications}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/60 text-foreground transition-colors active:bg-secondary"
      >
        <Bell className="h-4.5 w-4.5" />
        {nudgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[9px] font-bold">
            {nudgeCount}
          </span>
        )}
      </button>
    </header>
  );
}
