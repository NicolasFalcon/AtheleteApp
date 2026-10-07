import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState, type ImageSourcePropType } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  focusManager,
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import {
  FEED_PAGE_SIZE,
  groupActivity,
  mergeFeedPages,
  nextFeedCursor,
  type ActivityGroup,
} from '@app/features/social/postModel';
import type { FeedPost } from '@app/features/social/postTypes';
import type { SocialLoadState } from '@app/features/social/socialTypes';
import { socialFixtureStore } from '@app/services/social/fixtureSocialService';
import type { SocialService } from '@app/services/social/socialService';
import {
  getSocialService,
  usesFixtures,
} from '@app/services/social/socialSource';

// Hooks of Comunidad. Reads go through React Query (`useSocialResource`);
// every write made through `useSocialService()` invalidates the social cache,
// and a screen reloads when it regains focus or the app returns to the
// foreground. In `__DEV__` the fixture scenarios keep their own store (the
// version of the store is part of the query key).
// TODO(social-wire): `useFeed` is still a local loader (W3: `useInfiniteQuery`
// over get_feed, cursor = `_before`).

const SOCIAL_KEY = 'social';

// React Query refetches on "focus": tie it to the app returning to foreground.
let focusManagerReady = false;
function ensureFocusManager() {
  if (focusManagerReady) {
    return;
  }
  focusManagerReady = true;
  focusManager.setEventListener(handleFocus => {
    const subscription = AppState.addEventListener('change', state => {
      handleFocus(state === 'active');
    });
    return () => subscription.remove();
  });
}

function isWrite(name: string): boolean {
  return !name.startsWith('get');
}

// Wraps the service so each write refreshes what the screens show.
function withInvalidation(
  service: SocialService,
  client: QueryClient,
): SocialService {
  const wrapped: Record<string, unknown> = {};
  (Object.keys(service) as (keyof SocialService)[]).forEach(name => {
    const method = service[name] as (...args: unknown[]) => Promise<unknown>;
    wrapped[name] = isWrite(name)
      ? async (...args: unknown[]) => {
          try {
            return await method.apply(service, args);
          } finally {
            client.invalidateQueries({ queryKey: [SOCIAL_KEY] });
          }
        }
      : method.bind(service);
  });
  return wrapped as unknown as SocialService;
}

export function useSocialService(): SocialService {
  const client = useQueryClient();
  const fixtures = usesFixtures();
  return useMemo(
    () => withInvalidation(getSocialService(), client),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, fixtures],
  );
}

export type SocialResource<T> = {
  status: SocialLoadState;
  data: T | null;
  reload: () => void;
};

// `name` identifies the read (it is the cache key together with `keys`); the
// cache is per user, so signing out and in with another account never shows
// the previous one's data.
export function useSocialResource<T>(
  name: string,
  load: (service: SocialService) => Promise<T>,
  keys: ReadonlyArray<unknown> = [],
): SocialResource<T> {
  ensureFocusManager();
  const { session } = useAuth();
  const userId = session?.user.id ?? 'dev';
  // Fixture scenarios reload whenever a fixture action changes the state.
  const version = useSyncExternalStore(
    socialFixtureStore.subscribe,
    socialFixtureStore.getVersion,
  );
  const fixtures = usesFixtures();
  const loadRef = useRef(load);
  loadRef.current = load;

  const query = useQuery({
    queryKey: [
      SOCIAL_KEY,
      fixtures ? `fixtures-${version}` : userId,
      name,
      ...keys,
    ],
    queryFn: () => loadRef.current(getSocialService()),
    // Refresh in the background when the screen is seen again.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: fixtures ? false : 1,
    // Fixture actions change the key: keep what is on screen meanwhile.
    placeholderData: fixtures ? keepPreviousData : undefined,
  });
  const { refetch, data } = query;

  // Screens of the stack: reload when coming back to them.
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );

  const status: SocialLoadState =
    data !== undefined ? 'ready' : query.isError ? 'error' : 'loading';

  const reload = useCallback(() => {
    if (usesFixtures()) {
      // Fixture scenarios: the next load succeeds.
      socialFixtureStore.clearFailure();
    }
    refetch();
  }, [refetch]);

  return { status, data: data ?? null, reload };
}

// Source of a post photo. The real one is a signed URL of `social-photos`;
// the fixtures map `fx://` keys to app assets.
// TODO(social-wire): cache signed URLs for the session, like profile-photo.ts.
export function usePostPhotoSource(path: string | null): ImageSourcePropType | null {
  const [source, setSource] = useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setSource(null);
      return undefined;
    }
    getSocialService()
      .getPostPhotoSource(path)
      .then(value => {
        if (active) {
          setSource(value);
        }
      })
      .catch(() => {
        if (active) {
          setSource(null);
        }
      });
    return () => {
      active = false;
    };
  }, [path]);

  return source;
}

// ── Feed (paginated) ───────────────────────────────────────────────────────
export type FeedState = {
  status: SocialLoadState;
  posts: FeedPost[];
  activity: ActivityGroup[];
  hasMore: boolean;
  moreStatus: 'idle' | 'loading' | 'error';
};

// TODO(social-wire): replace with `useInfiniteQuery` over get_feed (cursor =
// `_before`); the shape returned here is the one the screens use.
export function useFeed() {
  const [state, setState] = useState<FeedState>({
    status: 'loading',
    posts: [],
    activity: [],
    hasMore: false,
    moreStatus: 'idle',
  });
  const cursor = useRef<string | null>(null);
  const busy = useRef(false);
  // TODO(social-wire): fixture-only; a new dev scenario reloads the feed.
  const scenarioVersion = useSyncExternalStore(
    socialFixtureStore.subscribe,
    socialFixtureStore.getResetVersion,
  );

  // First page + activity lines. `silent` keeps what is on screen meanwhile.
  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setState(current => ({ ...current, status: 'loading' }));
    }
    try {
      const service = getSocialService();
      const [page, activity] = await Promise.all([
        service.getFeed(null, FEED_PAGE_SIZE),
        service.getFriendActivity(8),
      ]);
      cursor.current = nextFeedCursor(page.posts);
      setState({
        status: 'ready',
        posts: page.posts,
        activity: groupActivity(activity),
        hasMore: cursor.current !== null,
        moreStatus: 'idle',
      });
    } catch {
      setState(current =>
        silent && current.status === 'ready'
          ? current
          : { ...current, status: 'error' },
      );
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (busy.current || !cursor.current) {
      return;
    }
    busy.current = true;
    setState(current =>
      current.status === 'ready' && current.hasMore
        ? { ...current, moreStatus: 'loading' }
        : current,
    );
    try {
      const page = await getSocialService().getFeed(cursor.current, FEED_PAGE_SIZE);
      cursor.current = nextFeedCursor(page.posts);
      setState(current => ({
        ...current,
        posts: mergeFeedPages(current.posts, page.posts),
        hasMore: cursor.current !== null,
        moreStatus: 'idle',
      }));
    } catch {
      setState(current => ({ ...current, moreStatus: 'error' }));
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (scenarioVersion > 0) {
      refresh();
    }
  }, [refresh, scenarioVersion]);

  const retry = useCallback(() => {
    // TODO(social-wire): only refetch; clearing the failure is fixture-only.
    socialFixtureStore.clearFailure();
    socialFixtureStore.clearFeedFailure();
    refresh();
  }, [refresh]);

  const retryMore = useCallback(() => {
    socialFixtureStore.clearFeedFailure();
    loadMore();
  }, [loadMore]);

  // Removes a post from the list (reported or deleted by the user).
  const removePost = useCallback((id: string) => {
    setState(current => ({
      ...current,
      posts: current.posts.filter(post => post.id !== id),
    }));
  }, []);

  return { ...state, refresh, loadMore, retry, retryMore, removePost };
}
