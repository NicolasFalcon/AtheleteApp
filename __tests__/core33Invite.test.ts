import {
  resolveCore33Invite,
  type Core33InviteInput,
} from '../src/features/core33/core33Invite';

const now = new Date(2026, 9, 2, 12);
const base: Core33InviteInput = {
  hasCurrentChallenge: false,
  completedCount: 0,
  lastDay33: null,
  dismissedAt: null,
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

  it('snoozes 14 days after "Ahora no" (profiles.core33_invite_dismissed_at)', () => {
    expect(
      resolveCore33Invite({ ...base, dismissedAt: daysAgo(3) }),
    ).toBeNull();
    expect(
      resolveCore33Invite({ ...base, dismissedAt: daysAgo(14) }),
    ).toBe('invite');
    // Not dismissed: the card shows.
    expect(resolveCore33Invite({ ...base, dismissedAt: null })).toBe('invite');
  });

  it('starts over when another Core 33 was finished after the dismissal', () => {
    const again = {
      ...base,
      completedCount: 1,
      lastDay33: '2026-09-30',
    };
    // Dismissed 3 days ago (09-29), before day 33 of the latest one: ignored.
    expect(
      resolveCore33Invite({ ...again, dismissedAt: daysAgo(3) }),
    ).toBe('again');
    // Dismissed after it ended: snoozed.
    expect(
      resolveCore33Invite({ ...again, dismissedAt: daysAgo(1) }),
    ).toBeNull();
  });
});
