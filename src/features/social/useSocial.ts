import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  FEED_PAGE_SIZE,
  groupActivity,
  mergeFeedPages,
  nextFeedCursor,
  type ActivityGroup,
} from '@app/features/social/postModel';
import type { FeedPost } from '@app/features/social/postTypes';
import type { SocialLoadState } from '@app/features/social/socialTypes';
import {
  getSocialService,
  socialFixtureStore,
} from '@app/services/social/fixtureSocialService';
import type { SocialService } from '@app/services/social/socialService';

// Hooks of Comunidad · tanda B.
// TODO(social-wire): replace the fixture store subscription with React Query
// (`useQuery` + invalidation after each mutation). The screens only use the
// shape returned here.

export function useSocialService(): SocialService {
  return getSocialService();
}

export type SocialResource<T> = {
  status: SocialLoadState;
  data: T | null;
  reload: () => void;
};

export function useSocialResource<T>(
  load: (service: SocialService) => Promise<T>,
  keys: ReadonlyArray<unknown> = [],
): SocialResource<T> {
  // Reloads whenever a fixture action changes the state.
  const version = useSyncExternalStore(
    socialFixtureStore.subscribe,
    socialFixtureStore.getVersion,
  );
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{
    status: SocialLoadState;
    data: T | null;
  }>({ status: 'loading', data: null });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let active = true;
    setResult(current =>
      current.data ? current : { status: 'loading', data: null },
    );
    loadRef
      .current(getSocialService())
      .then(data => {
        if (active) {
          setResult({ status: 'ready', data });
        }
      })
      .catch(() => {
        if (active) {
          setResult({ status: 'error', data: null });
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nonce, ...keys]);

  const reload = useCallback(() => {
    // TODO(social-wire): only refetch; clearing the failure is fixture-only.
    socialFixtureStore.clearFailure();
    setNonce(value => value + 1);
  }, []);

  return { ...result, reload };
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
