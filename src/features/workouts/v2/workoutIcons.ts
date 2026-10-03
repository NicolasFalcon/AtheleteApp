import {
  Cable,
  Dumbbell,
  Gauge,
  PersonStanding,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import type { EquipmentKey } from '@app/features/workouts/workoutsModel';

export const EQUIPMENT_ICONS: Record<EquipmentKey, LucideIcon> = {
  bodyweight: PersonStanding,
  dumbbells: Dumbbell,
  barbell: Weight,
  cable: Cable,
  machines: Gauge,
};
