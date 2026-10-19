import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type ImageSourcePropType } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  focusManager,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { actionFor, runOptimistic } from '@app/features/social/relationMachine';
import {
  FEED_PAGE_SIZE,
  groupActivity,
  mergeFeedPages,
  nextFeedCursor,
  type ActivityGroup,
} from '@app/features/social/postModel';
import {
  mergeNotificationPages,
  NOTIFICATIONS_PAGE_SIZE,
} from '@app/features/social/notificationModel';
import type { FeedPost } from '@app/features/social/postTypes';
import type { SocialLoadState } from '@app/features/social/socialTypes';
import type { SocialService } from '@app/services/social/socialService';
import { getSocialService } from '@app/services/social/socialSource';

// Hooks of Comunidad. Reads go through React Query (`useSocialResource`);
// every write made through `useSocialService()` invalidates the social cache,
// and a screen reloads when it regains focus or the app returns to the
// foreground.
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

// The feed is a local loader (useFeed), outside React Query: a publication,
// an edit or a deletion asks every mounted feed to reload itself silently.
const feedListeners = new Set<() => void>();
const FEED_WRITES: readonly string[] = ['createPost', 'deletePost', 'editPost'];

export function invalidateFeed(): void {
  feedListeners.forEach(listener => listener());
}

export function onFeedInvalidated(listener: () => void): () => void {
  feedListeners.add(listener);
  return () => {
    feedListeners.delete(listener);
  };
}

// After a write outside useSocialService (the Ruta share): the social cache
// (own profile, posts) and the feed.
export function invalidateSocialContent(client: QueryClient): void {
  client.invalidateQueries({ queryKey: [SOCIAL_KEY] }).catch(() => undefined);
  invalidateFeed();
}

// Wraps the service so each write refreshes what the screens show: friend
// requests, removing a friend, unblocking and revoking a link update the cache
// at once (and go back if the request fails), and every write invalidates the
// social cache when it ends.
export function withInvalidation(
  service: SocialService,
  client: QueryClient,
): SocialService {
  const wrapped: Record<string, unknown> = {};
  (Object.keys(service) as (keyof SocialService)[]).forEach(name => {
    const method = service[name] as (...args: unknown[]) => Promise<unknown>;
    wrapped[name] = isWrite(name)
      ? async (...args: unknown[]) => {
          const action = actionFor(name, args);
          const execute = () => method.apply(service, args);
          try {
            if (!action) {
              return await execute();
            }
            // A refetch in flight would overwrite the optimistic data.
            await client.cancelQueries({ queryKey: [SOCIAL_KEY] });
            return await runOptimistic(client, action, execute);
          } finally {
            client.invalidateQueries({ queryKey: [SOCIAL_KEY] });
            if (FEED_WRITES.includes(name)) {
              invalidateFeed();
            }
          }
        }
      : method.bind(service);
  });
  return wrapped as unknown as SocialService;
}

export function useSocialService(): SocialService {
  const client = useQueryClient();
  return useMemo(() => withInvalidation(getSocialService(), client), [client]);
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
  const userId = session?.user.id ?? 'anon';
  const loadRef = useRef(load);
  loadRef.current = load;

  const query = useQuery({
    queryKey: [SOCIAL_KEY, userId, name, ...keys],
    queryFn: () => loadRef.current(getSocialService()),
    // Refresh in the background when the screen is seen again.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
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
    refetch();
  }, [refetch]);

  return { status, data: data ?? null, reload };
}

// ── Notifications (W6) ─────────────────────────────────────────────────────
// Number of unread social notifications, for the bell of the hub and of Inicio.
// It reloads when the screen regains focus (like every social resource); while
// it loads or fails the bell simply shows nothing.
export function useUnreadNotifications(): number {
  const unread = useSocialResource('getUnreadNotifications', s => s.getUnreadNotifications());
  return unread.data ?? 0;
}

// The list, paged by created_at (newest first). The cache holds the pages so
// the optimistic read / delete can edit them in place (see relationMachine).
export function useNotificationList() {
  ensureFocusManager();
  const { session } = useAuth();
  const userId = session?.user.id ?? 'anon';
  const query = useInfiniteQuery({
    queryKey: [SOCIAL_KEY, userId, 'getNotifications'],
    queryFn: ({ pageParam }) =>
      getSocialService().getNotifications(pageParam, NOTIFICATIONS_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const { refetch } = query;

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

  const items = useMemo(
    () => mergeNotificationPages(query.data?.pages ?? []),
    [query.data],
  );
  const status: SocialLoadState =
    query.data !== undefined ? 'ready' : query.isError ? 'error' : 'loading';

  return {
    status,
    items,
    hasMore: Boolean(query.hasNextPage),
    loadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage().catch(() => undefined);
      }
    },
    reload: () => {
      refetch().catch(() => undefined);
    },
  };
}

// ── Posts of a profile (get_user_posts) ────────────────────────────────────
export const USER_POSTS_PAGE_SIZE = 20;

// My profile or a friend's: 20 per page, `_before` = created_at of the last
// one. Part of the social cache, so publishing, editing or deleting a post
// refreshes it.
export function useUserPosts(userId: string | null, enabled = true) {
  ensureFocusManager();
  const { session } = useAuth();
  const me = session?.user.id ?? 'anon';
  const query = useInfiniteQuery({
    queryKey: [SOCIAL_KEY, me, 'getUserPosts', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: ({ pageParam }) =>
      getSocialService().getUserPosts(userId as string, pageParam, USER_POSTS_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: 1,
  });
  const posts = useMemo(
    () =>
      (query.data?.pages ?? []).reduce<FeedPost[]>(
        (all, page) => mergeFeedPages(all, page.posts),
        [],
      ),
    [query.data],
  );
  const status: SocialLoadState =
    query.data !== undefined ? 'ready' : query.isError ? 'error' : 'loading';
  return {
    status,
    posts,
    hasMore: Boolean(query.hasNextPage),
    loadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage().catch(() => undefined);
      }
    },
    reload: () => {
      query.refetch().catch(() => undefined);
    },
  };
}

// Source of a post photo: a signed URL of `social-photos`.
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

  // A publication (or an edit / deletion) elsewhere: reload in place.
  useEffect(
    () =>
      onFeedInvalidated(() => {
        refresh(true).catch(() => undefined);
      }),
    [refresh],
  );

  const retry = useCallback(() => {
    refresh();
  }, [refresh]);

  const retryMore = useCallback(() => {
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
