import { Home, TrendingUp, Dumbbell, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabId } from '@/lib/types';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'entrenos', label: 'Entrenos', icon: Dumbbell },
  { id: 'ellie', label: 'ELLIE', icon: Sparkles },
  { id: 'progreso', label: 'Progreso', icon: TrendingUp },
  { id: 'perfil', label: 'Perfil', icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const isEllie = id === 'ellie';
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1 transition-colors duration-150',
                isActive ? 'text-foreground' : 'text-muted-foreground active:text-foreground'
              )}
            >
              {isEllie ? (
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150',
                  isActive ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                </div>
              ) : (
                <Icon
                  className={cn('h-5 w-5 transition-transform duration-150', isActive && 'scale-105')}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              )}
              <span className={cn(
                'text-[10px] leading-none',
                isActive ? 'font-semibold' : 'font-medium'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
