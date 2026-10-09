// Which data source Comunidad uses: the real one (Supabase) on every start;
// the sample data only after a dev deep link loads a scenario, and never in a
// release build.
jest.mock('../src/services/social/supabaseSocialService', () => ({
  supabaseSocialService: { source: 'supabase' },
}));

type Source = typeof import('../src/services/social/socialSource');
type Fixtures = typeof import('../src/services/social/fixtureSocialService');

function loadFresh(): { source: Source; fixtures: Fixtures } {
  let loaded: { source: Source; fixtures: Fixtures } | null = null;
  jest.isolateModules(() => {
    loaded = {
      source: require('../src/services/social/socialSource'),
      fixtures: require('../src/services/social/fixtureSocialService'),
    };
  });
  return loaded as unknown as { source: Source; fixtures: Fixtures };
}

describe('socialSource', () => {
  const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it('starts on the real source (Supabase), with no fixtures', () => {
    const { source } = loadFresh();
    expect(source.usesFixtures()).toBe(false);
    expect(source.getSocialService()).toEqual({ source: 'supabase' });
  });

  it('only a dev scenario switches to the sample data', () => {
    const { source, fixtures } = loadFresh();
    fixtures.socialFixtureStore.reset('default');
    expect(source.usesFixtures()).toBe(true);
    expect(source.getSocialService()).toBe(fixtures.fixtureSocialService);
  });

  it('goes back to the real source on the next start', () => {
    const first = loadFresh();
    first.fixtures.socialFixtureStore.reset('noFriends');
    expect(first.source.usesFixtures()).toBe(true);

    const second = loadFresh();
    expect(second.source.usesFixtures()).toBe(false);
    expect(second.source.getSocialService()).toEqual({ source: 'supabase' });
  });

  it('a release build never uses fixtures, even if a scenario was loaded', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const { source, fixtures } = loadFresh();
    fixtures.socialFixtureStore.reset('default');
    expect(source.usesFixtures()).toBe(false);
    expect(source.getSocialService()).toEqual({ source: 'supabase' });
  });
});
