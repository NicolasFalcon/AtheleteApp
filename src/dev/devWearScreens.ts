import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: ATHELETE Wear presentation (nothing is read or written).
// athelete://dev/wear?screen=<key>
export const WEAR_DEV_SCREENS = [
  { key: 'wear', label: 'Wear · presentación', devScroll: 0 },
  { key: 'wearMosaic', label: 'Wear · mosaico', devScroll: 760 },
  { key: 'wearEnd', label: 'Wear · cierre', devScroll: 4000 },
] as const;

export type WearDevScreen = (typeof WEAR_DEV_SCREENS)[number]['key'];

export function isWearDevScreen(value: string | null): value is WearDevScreen {
  return WEAR_DEV_SCREENS.some(screen => screen.key === value);
}

export async function openWearDevScreen(key: WearDevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const entry = WEAR_DEV_SCREENS.find(screen => screen.key === key);
  if (!entry) {
    return false;
  }
  if ((navigationRef.getRootState()?.routes.length ?? 0) > 1) {
    navigationRef.dispatch(StackActions.popToTop());
  }
  navigationRef.dispatch(
    StackActions.push('Wear' as never, { devScroll: entry.devScroll } as never),
  );
  return true;
}
