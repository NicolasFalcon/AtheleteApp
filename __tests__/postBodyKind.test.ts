import {
  isHighlightedKind,
  isRenderablePost,
  postBodyKind,
  postKindLabel,
} from '../src/features/social/postModel';

const post = (type: string, photo_path: string | null = null) => ({ type, photo_path });

describe('postBodyKind · composition by post type (v2.12)', () => {
  it('maps each known type to its own composition', () => {
    expect(postBodyKind(post('workout', 'u/p/photo.jpg'))).toBe('workoutPhoto');
    expect(postBodyKind(post('workout'))).toBe('workoutLight');
    expect(postBodyKind(post('record'))).toBe('record');
    expect(postBodyKind(post('routine'))).toBe('routine');
    expect(postBodyKind(post('achievement'))).toBe('achievement');
    expect(postBodyKind(post('challenge'))).toBe('challenge');
    expect(postBodyKind(post('photo', 'u/p/photo.jpg'))).toBe('photo');
  });

  it('draws route posts only when enabled (fixtures), never in the real app', () => {
    expect(postBodyKind(post('route'))).toBe('unknown');
    expect(postBodyKind(post('route'), { routeEnabled: false })).toBe('unknown');
    expect(postBodyKind(post('route'), { routeEnabled: true })).toBe('route');
  });

  it('a type the app does not know is not shown', () => {
    expect(postBodyKind(post('story'))).toBe('unknown');
    expect(postBodyKind(post(''))).toBe('unknown');
    expect(isRenderablePost(post('story'))).toBe(false);
    expect(isRenderablePost(post('route'))).toBe(false);
    expect(isRenderablePost(post('route'), { routeEnabled: true })).toBe(true);
    expect(isRenderablePost(post('workout'))).toBe(true);
  });
});

describe('post header label', () => {
  it('names the route by its sport and highlights route, record and achievement', () => {
    expect(postKindLabel('route', 'cycling')).toBe('Ciclismo');
    expect(postKindLabel('route', 'running')).toBe('Carrera');
    expect(postKindLabel('record')).toBe('Nuevo récord');
    expect(isHighlightedKind('route')).toBe(true);
    expect(isHighlightedKind('record')).toBe(true);
    expect(isHighlightedKind('achievement')).toBe(true);
    expect(isHighlightedKind('workout')).toBe(false);
    expect(isHighlightedKind('routine')).toBe(false);
  });
});
