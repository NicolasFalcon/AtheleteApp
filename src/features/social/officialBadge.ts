import {
  Activity,
  ChevronsUp,
  Dumbbell,
  Footprints,
  PersonStanding,
  type LucideIcon,
} from 'lucide-react-native';

// The ONE place that draws the badges of the official challenges.
// TODO(badges-oficiales): the final artwork replaces these placeholders (a
// Lucide icon inside the Ember-ringed hexagon, `HexMedal`). The server gives
// `badge.icon` as a name; an unknown one gets the chevrons.
const PLACEHOLDER_ICONS: Record<string, LucideIcon> = {
  'chevrons-up': ChevronsUp,
  activity: Activity,
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
  footprints: Footprints,
};

export function officialBadgeIcon(icon: string | null | undefined): LucideIcon {
  return (icon && PLACEHOLDER_ICONS[icon]) || ChevronsUp;
}
