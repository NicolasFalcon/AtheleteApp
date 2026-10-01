import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';

function createNavigation({
  canGoBack = false,
  activeRoute = 'Profile',
  routeNames = ['MainTabs', 'Profile'],
  parent,
}: {
  canGoBack?: boolean;
  activeRoute?: string;
  routeNames?: string[];
  parent?: ReturnType<typeof createNavigation>;
} = {}) {
  const goBack = jest.fn();
  const navigate = jest.fn();

  return {
    canGoBack: () => canGoBack,
    goBack,
    navigate,
    getState: () => ({
      index: routeNames.indexOf(activeRoute),
      routeNames,
      routes: routeNames.map(name => ({name})),
    }),
    getParent: () => parent,
  };
}

describe('safeGoBack', () => {
  it('uses real history when it exists', () => {
    const navigation = createNavigation({canGoBack: true});

    expect(safeGoBack(navigation, ['MainTabs'])).toBe(true);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to a fallback owned by the current stack', () => {
    const navigation = createNavigation();

    expect(safeGoBack(navigation, ['MainTabs'])).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', undefined);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('finds a fallback in a parent navigator', () => {
    const parent = createNavigation({
      activeRoute: 'MainTabs',
      routeNames: ['MainTabs', 'Profile'],
    });
    const navigation = createNavigation({
      activeRoute: 'Home',
      routeNames: ['Home', 'Workouts'],
      parent,
    });

    expect(safeGoBack(navigation, ['Profile'])).toBe(true);
    expect(parent.navigate).toHaveBeenCalledWith('Profile', undefined);
  });

  it('does not navigate to the active route or dispatch an invalid back', () => {
    const navigation = createNavigation({
      activeRoute: 'MainTabs',
      routeNames: ['MainTabs'],
    });

    expect(safeGoBack(navigation, ['MainTabs'])).toBe(false);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('lands on a tab of MainTabs with tabFallback', () => {
    const navigation = createNavigation();

    expect(safeGoBack(navigation, [tabFallback('Workouts')])).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Workouts',
    });
  });
});
