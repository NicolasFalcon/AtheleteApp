import {
  core33EntryState,
  resolveCore33Discovery,
  resolveCore33Entry,
  type Core33EntryState,
} from '@app/features/core33/core33Entry';

describe('core33EntryState', () => {
  it('maps the participation status and the intro seen', () => {
    expect(core33EntryState('active')).toBe('active');
    expect(core33EntryState('active', true)).toBe('active');
    expect(core33EntryState('completed')).toBe('completed');
    expect(core33EntryState(undefined)).toBe('intro');
    expect(core33EntryState(null, false)).toBe('intro');
    expect(core33EntryState('abandoned', false)).toBe('intro');
    expect(core33EntryState(null, true)).toBe('explore');
    expect(core33EntryState('abandoned', true)).toBe('explore');
  });
});

describe('resolveCore33Entry', () => {
  it('sends each state to its screen', () => {
    const routes: Record<Core33EntryState, string> = {
      intro: 'Core33Intro',
      explore: 'Core33Explore',
      ready: 'Core33Explore',
      active: 'Core33',
      completed: 'Core33',
    };
    (Object.keys(routes) as Core33EntryState[]).forEach(state => {
      expect(resolveCore33Entry(state)).toEqual({ name: routes[state] });
    });
  });
});

describe('resolveCore33Discovery (the invite card)', () => {
  it('opens the Intro the first time and Explorar retos afterwards', () => {
    expect(resolveCore33Discovery({ introSeen: false, completedCount: 0 })).toEqual({ name: 'Core33Intro' });
    expect(resolveCore33Discovery({ introSeen: true, completedCount: 0 })).toEqual({ name: 'Core33Explore' });
    // "Empieza otro Core 33": the Intro is not shown again.
    expect(resolveCore33Discovery({ introSeen: false, completedCount: 1 })).toEqual({ name: 'Core33Explore' });
  });
});
