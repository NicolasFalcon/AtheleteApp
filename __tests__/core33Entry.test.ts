import {
  core33EntryState,
  resolveCore33Entry,
  type Core33EntryState,
} from '@app/features/core33/core33Entry';

describe('core33EntryState', () => {
  it('maps the participation status', () => {
    expect(core33EntryState('active')).toBe('active');
    expect(core33EntryState('completed')).toBe('completed');
    expect(core33EntryState(undefined)).toBe('intro');
    expect(core33EntryState(null)).toBe('intro');
    expect(core33EntryState('abandoned')).toBe('intro');
  });
});

describe('resolveCore33Entry', () => {
  it('opens the Core 33 screen for every state today', () => {
    const states: Core33EntryState[] = [
      'intro',
      'explore',
      'ready',
      'active',
      'completed',
    ];
    states.forEach(state => {
      expect(resolveCore33Entry(state)).toEqual({ name: 'Core33' });
    });
  });
});
