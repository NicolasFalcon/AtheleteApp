import { QueryClient } from '@tanstack/react-query';

jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ session: { user: { id: 'me' } } }) }));

import { parseCreatePost, parseUserPostsPage } from '../src/features/social/feedMappers';
import { createPostErrorCopy, publishedToast } from '../src/features/social/postModel';
import type { CreatePostError } from '../src/features/social/postTypes';
import { AUDIENCE_OPTIONS, audienceLine } from '../src/features/social/socialModel';
import {
  invalidateSocialContent,
  onFeedInvalidated,
  withInvalidation,
} from '../src/features/social/useSocial';
import {
  ROUTE_VISIBILITY_OPTIONS,
  shownVisibility,
  visibilityTitle,
} from '../src/features/route/routeVisibility';
import type { SocialService } from '../src/services/social/socialService';

const post = (id: string, createdAt: string) => ({
  id,
  author_id: 'me',
  type: 'photo',
  body: `post ${id}`,
  audience: 'friends',
  photo_path: 'me/1/photo.jpg',
  photo_width: 100,
  photo_height: 100,
  like_count: 0,
  comment_count: 0,
  liked_by_me: false,
  created_at: createdAt,
  edited_at: null,
  attachment: null,
  author: { id: 'me', name: 'Yo', username: 'yo', avatar_key: '', profile_photo_url: '', goal: '', weight: 0 },
});

describe('B-10 · publish', () => {
  it('any ok:false is an error (post_removed too); an unknown one is generic, never "publicado"', () => {
    expect(parseCreatePost({ ok: false, error: 'post_removed' })).toEqual({ ok: false, error: 'post_removed' });
    expect(parseCreatePost({ ok: false, error: 'something_new' })).toEqual({ ok: false, error: 'unknown' });
    expect(parseCreatePost({ ok: true })).toEqual({ ok: false, error: 'unknown' });
    expect(parseCreatePost(null)).toEqual({ ok: false, error: 'unknown' });
    const removed = createPostErrorCopy('post_removed', 'es');
    expect(removed.message).toMatch('moderador');
    expect(createPostErrorCopy('post_removed', 'en').message).toMatch('moderator');
    expect(createPostErrorCopy('unknown', 'es').message).toBe('No se pudo publicar. Inténtalo de nuevo.');
    const codes: CreatePostError[] = ['post_removed', 'route_private', 'category_not_shared', 'unknown', 'upload_failed'];
    codes.forEach(code => {
      expect(createPostErrorCopy(code, 'es').message).not.toMatch(/publicad/i);
      expect(createPostErrorCopy(code, 'en').message.length).toBeGreaterThan(10);
    });
  });

  it('created:false opens the post that already exists, without saying "publicado"', () => {
    expect(parseCreatePost({ ok: true, created: false, post_id: 'p1' })).toEqual({ ok: true, postId: 'p1', created: false });
    expect(publishedToast(false, 'es')).not.toMatch(/publicad/i);
    expect(publishedToast(false, 'es')).toMatch('Ya lo habías compartido');
    expect(publishedToast(true, 'es')).toBe('Publicado para tus amigos');
    expect(publishedToast(true, 'en')).toBe('Posted for your friends');
  });

  it('after publishing the feed and the own profile reload', async () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
    const feed = jest.fn();
    const stop = onFeedInvalidated(feed);

    const service = {
      createPost: jest.fn(async () => ({ ok: true, postId: 'p1', created: true })),
      getFeed: jest.fn(),
      toggleLike: jest.fn(async () => ({ liked: true, count: 1 })),
    } as unknown as SocialService;
    await withInvalidation(service, client).createPost({ type: 'photo' } as never);
    expect(feed).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['social'] });

    // A like does not reload the whole feed.
    await withInvalidation(service, client).toggleLike('p1', true);
    expect(feed).toHaveBeenCalledTimes(1);

    // The Ruta share (outside the social service) does the same.
    invalidateSocialContent(client);
    expect(feed).toHaveBeenCalledTimes(2);
    stop();
    invalidateSocialContent(client);
    expect(feed).toHaveBeenCalledTimes(2);
  });
});

describe('profile posts · get_user_posts', () => {
  it('a full page gives _before = created_at of the last; a short page is the end', () => {
    const full = parseUserPostsPage(
      { ok: true, items: [post('a', '2026-10-18T10:00:00Z'), post('b', '2026-10-17T10:00:00Z')] },
      'me',
      2,
    );
    expect(full.posts.map(item => item.id)).toEqual(['a', 'b']);
    expect(full.nextCursor).toBe('2026-10-17T10:00:00Z');
    const last = parseUserPostsPage({ ok: true, items: [post('c', '2026-10-16T10:00:00Z')] }, 'me', 20);
    expect(last.nextCursor).toBeNull();
    expect(parseUserPostsPage({ ok: true, items: [] }, 'me', 20)).toEqual({ posts: [], nextCursor: null });
    expect(() => parseUserPostsPage({ ok: false, error: 'unauthorized' }, 'me', 20)).toThrow('unauthorized');
  });
});

describe('visibility · only friends', () => {
  it('no "Público" in social privacy', () => {
    expect(AUDIENCE_OPTIONS.map(option => option.key)).toEqual(['friends']);
    expect(audienceLine()).toMatch('Solo tus amigos');
  });

  it('no "Público" when sharing a route; an old public route reads as Amigos', () => {
    expect(ROUTE_VISIBILITY_OPTIONS).toEqual(['me', 'friends']);
    expect(shownVisibility('public')).toBe('friends');
    expect(visibilityTitle('public')).toBe('Amigos');
    expect(visibilityTitle('me')).toBe('Solo yo');
  });
});
