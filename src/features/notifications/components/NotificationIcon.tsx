import {
  Brain,
  Droplets,
  Dumbbell,
  Heart,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react-native';
import type {NotificationIconName} from '@app/features/notifications/types';

type NotificationIconProps = {
  name: NotificationIconName;
  color: string;
  size?: number;
};

export function NotificationIcon({
  name,
  color,
  size = 18,
}: NotificationIconProps) {
  const props = {color, size, strokeWidth: 2.1};

  if (name === 'dumbbell') {
    return <Dumbbell {...props} />;
  }

  if (name === 'target') {
    return <Target {...props} />;
  }

  if (name === 'droplets') {
    return <Droplets {...props} />;
  }

  if (name === 'utensils') {
    return <UtensilsCrossed {...props} />;
  }

  if (name === 'trophy') {
    return <Trophy {...props} />;
  }

  if (name === 'heart') {
    return <Heart {...props} />;
  }

  if (name === 'trending-up') {
    return <TrendingUp {...props} />;
  }

  if (name === 'brain') {
    return <Brain {...props} />;
  }

  return <Sparkles {...props} />;
}
