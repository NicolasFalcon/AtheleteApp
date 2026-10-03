import {
  Award,
  Brain,
  CalendarDays,
  Droplets,
  Dumbbell,
  Flame,
  Medal,
  PenLine,
  Trophy,
  UtensilsCrossed,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

// Badge `icon` keys (ALL_BADGES) → Lucide icon. Shared by Notificaciones
// (hitos) and the session summary (logro desbloqueado).
export const BADGE_ICONS: Record<string, LucideIcon> = {
  brain: Brain,
  calendar: CalendarDays,
  droplets: Droplets,
  dumbbell: Dumbbell,
  'file-pen': PenLine,
  flame: Flame,
  medal: Medal,
  trophy: Trophy,
  utensils: UtensilsCrossed,
  waves: Waves,
  wrench: Wrench,
};

export function badgeIcon(key?: string | null): LucideIcon {
  return (key && BADGE_ICONS[key]) || Award;
}
