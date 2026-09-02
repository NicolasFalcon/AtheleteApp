import {safeGoBack} from '@app/navigation/safeGoBack';

function createNavigation({
  canGoBack = false,
  activeRoute = 'Detail',
  routeNames = ['Detail', 'Root'],
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

    expect(safeGoBack(navigation, ['Root'])).toBe(true);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to a fallback owned by the current stack', () => {
    const navigation = createNavigation();

    expect(safeGoBack(navigation, ['Root'])).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('Root', undefined);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('finds a fallback in a parent navigator', () => {
    const parent = createNavigation({
      activeRoute: 'HomeTab',
      routeNames: ['HomeTab', 'ProfileTab'],
    });
    const navigation = createNavigation({routeNames: ['Detail'], parent});

    expect(safeGoBack(navigation, ['ProfileTab'])).toBe(true);
    expect(parent.navigate).toHaveBeenCalledWith('ProfileTab', undefined);
  });

  it('does not navigate to the active route or dispatch an invalid back', () => {
    const navigation = createNavigation({
      activeRoute: 'Root',
      routeNames: ['Root'],
    });

    expect(safeGoBack(navigation, ['Root'])).toBe(false);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
