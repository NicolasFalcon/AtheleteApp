import type { StyleProp, ViewStyle } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { Button, useToast } from '@app/components/v2';
import { routeText } from '@app/features/route/routeCopy';
import { needsDirections, openDirections } from '@app/features/route/routeDirections';
import type { LatLng, RouteSport } from '@app/features/route/routeTypes';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

// "Cómo llegar": opens Apple Maps / Google Maps (routeDirections) with walking
// or bike directions to the first point of the route. Not shown when the person is
// already within 100 m of it (`here` unknown: shown, the maps app finds them).
export function DirectionsButton({
  points,
  sport,
  here,
  style,
}: {
  points: readonly LatLng[];
  sport: RouteSport;
  here: LatLng | null | undefined;
  style?: StyleProp<ViewStyle>;
}) {
  const language = useProfileLanguage();
  const toast = useToast();
  const start = points[0];
  if (!start || !needsDirections(here, start)) {
    return null;
  }
  return (
    <Button
      label={routeText(language, 'route.directions')}
      icon={Navigation}
      iconPosition="start"
      variant="text"
      fullWidth
      style={style}
      onPress={() => {
        openDirections(start, sport).catch(() => toast.show(routeText(language, 'route.directions.failed')));
      }}
    />
  );
}
