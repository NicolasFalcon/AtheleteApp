import {
  NO_DISMISSALS,
  recordDismissal,
  resolveCore33Invite,
  type Core33InviteInput,
} from '../src/features/core33/core33Invite';

const now = new Date(2026, 9, 2, 12);
const base: Core33InviteInput = {
  hasCurrentChallenge: false,
  completedCount: 0,
  lastDay33: null,
  dismissals: NO_DISMISSALS,
  today: '2026-10-02',
  now,
};
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 86400000).toISOString();

describe('Core 33 discovery card', () => {
  it('invites a user who never finished one and hides with a current challenge', () => {
    expect(resolveCore33Invite(base)).toBe('invite');
    expect(
      resolveCore33Invite({ ...base, hasCurrentChallenge: true }),
    ).toBeNull();
  });

  it('offers another one from the day after day 33', () => {
    const again = { ...base, completedCount: 1 };
    expect(
      resolveCore33Invite({ ...again, lastDay33: '2026-10-02' }),
    ).toBeNull();
    expect(resolveCore33Invite({ ...again, lastDay33: '2026-10-01' })).toBe(
      'again',
    );
  });

  it('snoozes 14 days after the first "Ahora no" and stops after the second', () => {
    const once = recordDismissal(NO_DISMISSALS, 0, new Date(daysAgo(3)));
    expect(resolveCore33Invite({ ...base, dismissals: once })).toBeNull();
    expect(
      resolveCore33Invite({
        ...base,
        dismissals: { ...once, lastDismissedAt: daysAgo(14) },
      }),
    ).toBe('invite');

    const twice = recordDismissal(
      { ...once, lastDismissedAt: daysAgo(20) },
      0,
      new Date(daysAgo(1)),
    );
    expect(twice.count).toBe(2);
    expect(
      resolveCore33Invite({
        ...base,
        dismissals: { ...twice, lastDismissedAt: daysAgo(60) },
      }),
    ).toBeNull();
  });

  it('resets the counter when another Core 33 is completed', () => {
    const twice = {
      count: 2,
      lastDismissedAt: daysAgo(1),
      completedCountAtDismissal: 0,
    };
    expect(
      resolveCore33Invite({
        ...base,
        completedCount: 1,
        lastDay33: '2026-09-30',
        dismissals: twice,
      }),
    ).toBe('again');
    expect(recordDismissal(twice, 1, now)).toMatchObject({
      count: 1,
      completedCountAtDismissal: 1,
    });
  });
});
