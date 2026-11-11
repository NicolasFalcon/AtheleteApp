import { historyToMessages, proposalToMessage } from '@app/features/ellie/resultParsing';
import { parsePlanActionConfirm } from '@app/features/ellie/planCardsModel';
import { parseProposalCard } from '@app/services/ellie/ellieProposals';

const adjustment = (id: string) => ({
  id,
  plan_id: 'p1',
  kind: 'deload_early',
  status: 'open',
  created_at: '2026-11-16T10:00:00.000Z',
  responded_at: null,
  payload: { week_index: 3, reason: 'effort_limit_2', before: 'A', after: 'B', sessions: [], target_week_index: 3 },
});

const row = (patch: Record<string, unknown>) =>
  ({
    id: 'm1',
    role: 'assistant',
    content: 'Hola',
    createdAt: '2026-11-16T10:00:00.000Z',
    clientMessageId: null,
    imagePath: null,
    toolType: null,
    toolData: null,
    ...patch,
  }) as never;

describe('training plan cards of ELLIE', () => {
  it('parses plan_review', () => {
    const card = parseProposalCard({
      type: 'plan_review',
      payload: {
        plan_id: 'p1',
        week_index: 2,
        created_at: '2026-11-15T22:00:03.114Z',
        review: { sessions_done: 3, sessions_missed: 1, sets: 54, volume_kg: 12400, adjustments: [] },
      },
    });
    const message = card && proposalToMessage(card, 'a1');
    expect(message).toMatchObject({ kind: 'planReview', review: { weekIndex: 2, sessionsDone: 3, sets: 54 } });
  });

  it('parses plan_adjustment with the id of the adjustment in the message id', () => {
    const card = parseProposalCard({ type: 'plan_adjustment', payload: adjustment('adj-1') });
    const message = card && proposalToMessage(card, 'a1');
    expect(message).toMatchObject({ kind: 'planAdjustment', answered: null });
    expect(message?.id).toContain('adj-1');
  });

  it('parses every plan_action_confirm action', () => {
    expect(parsePlanActionConfirm({ action: 'pause', params: { weeks: 2 }, summary: 's' })?.request).toEqual({
      kind: 'pause',
      weeks: 2,
    });
    expect(parsePlanActionConfirm({ action: 'resume', params: {}, summary: 's' })?.request).toEqual({ kind: 'resume' });
    expect(
      parsePlanActionConfirm({ action: 'change_days', params: { days_of_week: [1, 3, 5] }, summary: 's' })?.request,
    ).toEqual({ kind: 'days', days: [1, 3, 5] });
    expect(
      parsePlanActionConfirm({
        action: 'change_goal_duration',
        params: { goal: 'gain_strength', weeks: 12 },
        summary: 's',
      })?.request,
    ).toEqual({ kind: 'goal', goal: 'gain_strength', weeks: 12 });
    expect(parsePlanActionConfirm({ action: 'end', params: {}, summary: 's' })?.request).toEqual({ kind: 'end' });
    expect(parsePlanActionConfirm({ action: 'pause', params: { weeks: 5 }, summary: 's' })).toBeNull();
    expect(parsePlanActionConfirm({ action: 'nope', params: {}, summary: 's' })).toBeNull();
  });

  it('rebuilds several plan_adjustment cards from the stored payloads, in order', () => {
    const messages = historyToMessages([
      row({
        toolType: 'plan_adjustment',
        toolData: { type: 'plan_adjustment', payloads: [adjustment('a'), adjustment('b')] },
      }),
    ]);
    expect(messages.filter(m => m.kind === 'planAdjustment').map(m => (m as any).adjustment.id)).toEqual(['a', 'b']);
  });

  it('rebuilds a single stored card and a stored cards list', () => {
    const one = historyToMessages([
      row({
        toolType: 'plan_action_confirm',
        toolData: { type: 'plan_action_confirm', payload: { action: 'resume', params: {}, summary: 'Retomar' } },
      }),
    ]);
    expect(one.map(m => m.kind)).toEqual(['text', 'planActionConfirm']);
    const list = historyToMessages([
      row({
        toolType: 'plan_review',
        toolData: {
          cards: [
            { type: 'plan_adjustment', payload: adjustment('a') },
            { type: 'plan_action_confirm', payload: { action: 'end', params: {}, summary: 'Terminar' } },
          ],
        },
      }),
    ]);
    expect(list.map(m => m.kind)).toEqual(['text', 'planAdjustment', 'planActionConfirm']);
  });
});
