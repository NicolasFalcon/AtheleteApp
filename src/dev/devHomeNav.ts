import { CommonActions, StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: back to the Inicio tab (athelete://dev/home).
export async function openHomeTabDev(): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  if ((navigationRef.getRootState()?.routes.length ?? 0) > 1) {
    navigationRef.dispatch(StackActions.popToTop());
  }
  navigationRef.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Home' } }));
  return true;
}
