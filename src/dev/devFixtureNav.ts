import { navigationRef } from '@app/navigation/navigationRef';
import { ROOT_ROUTES } from '@app/constants/routes';

// Development only. Deep links of screens that use only sample data
// (athelete://dev/social, athelete://dev/quiz with a fixture state) open even
// without a session: RootNavigator registers them in the auth flow under
// `__DEV__`. Screens that read the database still wait for the signed-in app
// (`waitForApp`), and nothing here exists in a release build.
function routeNames(): string[] {
  if (!__DEV__ || !navigationRef.isReady()) {
    return [];
  }
  return navigationRef.getRootState()?.routeNames ?? [];
}

// Without a session the Comunidad hub lives in the dev tabs.
export function hubRouteName(): string {
  return routeNames().includes(ROOT_ROUTES.MainTabs)
    ? ROOT_ROUTES.MainTabs
    : ROOT_ROUTES.DevFixtureTabs;
}

export async function waitForFixtureApp(timeoutMs = 20000): Promise<boolean> {
  if (!__DEV__) {
    return false;
  }
  const started = Date.now();
  while (
    !routeNames().some(
      name =>
        name === ROOT_ROUTES.MainTabs || name === ROOT_ROUTES.DevFixtureTabs,
    )
  ) {
    if (Date.now() - started > timeoutMs) {
      return false;
    }
    await new Promise<void>(resolve => setTimeout(() => resolve(), 400));
  }
  return true;
}
