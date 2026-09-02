type FallbackTarget = {
  name: string;
  params?: object;
};

export type BackFallback = string | FallbackTarget;

type NavigationLike = {
  canGoBack: () => boolean;
  goBack: () => void;
  getState: () =>
    | {
        index: number;
        routeNames: readonly string[];
        routes: ReadonlyArray<{name: string}>;
      }
    | undefined;
  getParent: () => unknown;
};

function normalizeFallback(fallback: BackFallback): FallbackTarget {
  return typeof fallback === 'string' ? {name: fallback} : fallback;
}

/**
 * Goes back when real history exists. Otherwise it walks the active navigator
 * hierarchy and opens the first fallback route owned by one of those stacks.
 */
export function safeGoBack(
  navigation: NavigationLike,
  fallbacks: readonly BackFallback[],
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return true;
  }

  let navigator: NavigationLike | undefined = navigation;

  while (navigator) {
    const state = navigator.getState();
    if (!state) {
      navigator = navigator.getParent() as NavigationLike | undefined;
      continue;
    }
    const activeRouteName = state.routes[state.index]?.name;
    const target = fallbacks
      .map(normalizeFallback)
      .find(
        fallback =>
          fallback.name !== activeRouteName &&
          state.routeNames.includes(fallback.name),
      );

    if (target) {
      const targetNavigator = navigator as NavigationLike & {
        navigate: (name: string, params?: object) => void;
      };
      targetNavigator.navigate(target.name, target.params);
      return true;
    }

    navigator = navigator.getParent() as NavigationLike | undefined;
  }

  return false;
}
