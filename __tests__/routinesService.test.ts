import { ellieRoutineInput, parseTool } from '../src/features/ellie/resultParsing';
import { chatReducer, initialChatState, type WorkoutCardMessage } from '../src/features/ellie/chatModel';
import { deletedRoutineText, routineErrorCopy } from '../src/features/workouts/routineErrors';
import {
  RoutineError,
  buildRoutinePayload,
  createRoutinesService,
  routineInputFrom,
} from '../src/services/routines/routinesService';
import { getWorkoutAccess } from '../src/shared';

const routineRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  title: 'Pierna',
  description: null,
  type: 'strength',
  difficulty: 'intermediate',
  duration: 45,
  calories: 300,
  target_muscles: ['legs'],
  routine_category: 'tren_inferior',
  origin: 'user',
  is_mine: true,
  can_edit: true,
  archived: false,
  thumb_key: 'movekit/thumbs/squat.webp',
  created_at: '2026-10-16T10:00:00Z',
  updated_at: '2026-10-16T10:00:00Z',
  exercises: [
    { id: 'te1', exercise_id: 'e1', block: 'warmup', position: 1, name: 'Movilidad de cadera', sets: 1, reps: 10, duration: null, rest_time: 30, notes: null, planned_weight_kg: null, thumb_key: 'movekit/thumbs/hip.webp', tracking_metrics: ['reps'], is_unilateral: false },
    { id: 'te2', exercise_id: 'e2', block: 'main', position: 2, name: 'Sentadilla', sets: 4, reps: 8, duration: null, rest_time: 90, notes: null, planned_weight_kg: 60, thumb_key: 'movekit/thumbs/squat.webp', tracking_metrics: ['reps', 'weight'], is_unilateral: false },
    { id: 'te3', exercise_id: 'e3', block: 'cooldown', position: 3, name: 'Estiramiento', sets: 1, reps: null, duration: 60, rest_time: 0, notes: null, planned_weight_kg: null, thumb_key: null, tracking_metrics: ['time'], is_unilateral: true },
  ],
  ...overrides,
});

describe('get_routine', () => {
  it('maps the routine and keeps the backend order (warmup → main → cooldown)', async () => {
    const rpc = jest.fn(async () => ({ ok: true, routine: routineRow() }));
    const routine = await createRoutinesService(rpc).getRoutine('r1');
    expect(rpc).toHaveBeenCalledWith('get_routine', { _id: 'r1' });
    expect(routine.exercises.map(exercise => [exercise.block, exercise.name])).toEqual([
      ['warmup', 'Movilidad de cadera'],
      ['main', 'Sentadilla'],
      ['cooldown', 'Estiramiento'],
    ]);
    expect(routine.exercises[1]).toMatchObject({ exerciseId: 'e2', position: 2, restTime: 90, plannedWeightKg: 60, thumbKey: 'movekit/thumbs/squat.webp' });
    expect(routine).toMatchObject({ origin: 'user', isMine: true, canEdit: true, routineCategory: 'tren_inferior', exerciseCount: 3 });
  });

  it('routine_not_found is a typed error', async () => {
    const service = createRoutinesService(async () => ({ ok: false, error: 'routine_not_found' }));
    await expect(service.getRoutine('x')).rejects.toMatchObject({ code: 'routine_not_found' });
  });

  it('only the owner edits; an official routine or an archived one is read-only', async () => {
    const service = createRoutinesService(async (_name, args) => ({
      ok: true,
      routine:
        args._id === 'official'
          ? routineRow({ id: 'official', origin: 'official', is_mine: false, can_edit: false })
          : routineRow({ archived: true, can_edit: false }),
    }));
    expect(getWorkoutAccess(await service.getRoutine('official'), 'u1').canEdit).toBe(false);
    expect(getWorkoutAccess(await service.getRoutine('mine'), 'u1')).toMatchObject({ isOwnedByCurrentUser: true, canEdit: false });
  });
});

describe('save / update / delete', () => {
  const input = {
    title: '  Pierna  ',
    description: '',
    type: 'strength' as const,
    difficulty: 'intermediate' as const,
    duration: 45,
    calories: 300,
    targetMuscles: ['legs'],
    exercises: [
      { exerciseId: 'e2', sets: 25, reps: 500, restTime: 2000 },
      { exerciseId: 'e3', sets: 3, reps: 12, duration: 45, block: 'cooldown' as const },
    ],
  };

  it('builds the contract payload: origin user, block main by default, values inside the limits', () => {
    expect(buildRoutinePayload(input)).toEqual({
      title: 'Pierna',
      type: 'strength',
      difficulty: 'intermediate',
      duration: 45,
      calories: 300,
      target_muscles: ['legs'],
      origin: 'user',
      exercises: [
        { exercise_id: 'e2', block: 'main', sets: 20, reps: 200, duration: null, rest_time: 900, notes: null, planned_weight_kg: null },
        { exercise_id: 'e3', block: 'cooldown', sets: 3, reps: null, duration: 45, rest_time: 60, notes: null, planned_weight_kg: null },
      ],
    });
  });

  it('save_user_routine / update_user_routine / delete_user_routine', async () => {
    const rpc = jest.fn(async (name: string) =>
      name === 'delete_user_routine'
        ? { ok: true, archived: true }
        : { ok: true, replayed: false, routine: routineRow() },
    );
    const service = createRoutinesService(rpc);
    expect((await service.saveRoutine(input)).replayed).toBe(false);
    expect(rpc).toHaveBeenLastCalledWith('save_user_routine', { _payload: buildRoutinePayload(input) });
    await service.updateRoutine('r1', input);
    expect(rpc).toHaveBeenLastCalledWith('update_user_routine', { _id: 'r1', _payload: buildRoutinePayload(input) });
    expect(await service.deleteRoutine('r1')).toEqual({ archived: true });
    expect(rpc).toHaveBeenLastCalledWith('delete_user_routine', { _id: 'r1' });
  });

  it('maps the errors of the contract with their details', async () => {
    const invalid = createRoutinesService(async () => ({ ok: false, error: 'invalid_input', field: 'title' }));
    await expect(invalid.saveRoutine(input)).rejects.toMatchObject({ code: 'invalid_input', field: 'title' });
    const missing = createRoutinesService(async () => ({ ok: false, error: 'exercise_not_found', exercise_ids: ['e9'] }));
    await expect(missing.saveRoutine(input)).rejects.toMatchObject({ code: 'exercise_not_found', exerciseIds: ['e9'] });
    const chat = createRoutinesService(async () => ({ ok: false, error: 'chat_message_not_found' }));
    await expect(chat.saveRoutine(input, { origin: 'ellie', chatMessageId: 'm1' })).rejects.toBeInstanceOf(RoutineError);
  });

  it('an edit keeps every exercise with its block; a row without catalog exercise cannot be sent', () => {
    const routine = createRoutinesService(async () => ({ ok: true, routine: routineRow() }));
    return routine.getRoutine('r1').then(workout => {
      expect(routineInputFrom(workout).exercises.map(exercise => exercise.block)).toEqual(['warmup', 'main', 'cooldown']);
      expect(() =>
        routineInputFrom({ ...workout, exercises: [{ ...workout.exercises[0], exerciseId: null }] }),
      ).toThrow(RoutineError);
    });
  });
});

describe('ELLIE: one message = one routine', () => {
  const tool = {
    type: 'generate_workout_plan' as const,
    data: {
      title: 'Empuje',
      type: 'strength',
      difficulty: 'beginner',
      duration: 30,
      calories: 200,
      target_muscles: ['chest'],
      exercises: [
        { exercise_id: 'e1', slug: 'push-up', name: 'Flexiones', sets: 3, reps: 12, rest_time: 60 },
        { exercise_id: 'e2', slug: 'dip', name: 'Fondos', sets: 3, reps: '10', rest_time: 90 },
      ],
    },
  };

  it('sends origin ellie, chat_message_id = message.id and tool_data.exercises', () => {
    const parsed = parseTool(tool, 'msg-1', '');
    expect(parsed?.card).toMatchObject({ kind: 'workout', messageId: 'msg-1' });
    const card = parsed!.card as WorkoutCardMessage;
    const payload = buildRoutinePayload(ellieRoutineInput(card.workout), { origin: 'ellie', chatMessageId: card.messageId! });
    expect(payload).toMatchObject({
      origin: 'ellie',
      chat_message_id: 'msg-1',
      exercises: [
        { exercise_id: 'e1', block: 'main', sets: 3, reps: 12, rest_time: 60 },
        { exercise_id: 'e2', block: 'main', sets: 3, reps: 10, rest_time: 90 },
      ],
    });
  });

  it('saving the same message twice answers the same routine (replayed), no duplicate', async () => {
    const saved = new Map<string, string>();
    const rpc = jest.fn(async (_name: string, args: Record<string, unknown>) => {
      const payload = args._payload as { chat_message_id: string };
      const replayed = saved.has(payload.chat_message_id);
      if (!replayed) {
        saved.set(payload.chat_message_id, `routine-${saved.size + 1}`);
      }
      return { ok: true, replayed, routine: routineRow({ id: saved.get(payload.chat_message_id), origin: 'ellie' }) };
    });
    const service = createRoutinesService(rpc);
    const card = parseTool(tool, 'msg-1', '')!.card as WorkoutCardMessage;
    const first = await service.saveRoutine(ellieRoutineInput(card.workout), { origin: 'ellie', chatMessageId: 'msg-1' });
    const second = await service.saveRoutine(ellieRoutineInput(card.workout), { origin: 'ellie', chatMessageId: 'msg-1' });
    expect(first).toMatchObject({ replayed: false, routine: { id: 'routine-1' } });
    expect(second).toMatchObject({ replayed: true, routine: { id: 'routine-1' } });
    expect(saved.size).toBe(1);
  });

  it('"Otra versión" keeps the card in place but saves the new message', () => {
    const first = parseTool(tool, 'msg-1', '')!;
    let state = chatReducer(initialChatState('Hola'), { type: 'tool', id: 'assistant-x', card: first.card });
    const next = parseTool(tool, 'msg-1', '')!;
    (next.card as { messageId?: string }).messageId = 'msg-2';
    state = chatReducer(state, { type: 'replace', id: 'msg-1', card: next.card });
    expect(state.messages.find(message => message.id === 'msg-1')).toMatchObject({ messageId: 'msg-2' });
  });
});

describe('list_routines and get_today_suggestion', () => {
  it('passes the cursor and reads next_cursor', async () => {
    const rpc = jest.fn(async (_name: string, args: Record<string, unknown>) => ({
      ok: true,
      items: [routineRow({ id: args._cursor ? 'r2' : 'r1', exercises: undefined, exercise_count: 6 })],
      next_cursor: args._cursor ? null : 'c1',
    }));
    const service = createRoutinesService(rpc);
    const first = await service.listRoutines({ scope: 'mine', limit: 80 });
    expect(rpc).toHaveBeenLastCalledWith('list_routines', { _scope: 'mine', _limit: 50, _cursor: null });
    expect(first.nextCursor).toBe('c1');
    expect(first.items[0]).toMatchObject({ id: 'r1', exerciseCount: 6, exercises: [], thumbKey: 'movekit/thumbs/squat.webp' });
    const second = await service.listRoutines({ scope: 'mine', cursor: first.nextCursor });
    expect(rpc).toHaveBeenLastCalledWith('list_routines', { _scope: 'mine', _limit: 20, _cursor: 'c1' });
    expect(second).toMatchObject({ nextCursor: null, items: [{ id: 'r2' }] });
  });

  it('reads the suggestion, and source none as no suggestion', async () => {
    const rpc = jest.fn(async () => ({
      ok: true,
      source: 'rules',
      suggestion: { routine_id: 'r1', title: 'Pierna', routine_category: 'tren_inferior', zone: 'lower', difficulty: 'intermediate', duration: 45, origin: 'official', reason: 'Ayer hiciste tren superior', reason_code: 'alternate_lower', last_zone: 'upper', date: '2026-10-16' },
    }));
    const today = await createRoutinesService(rpc).getTodaySuggestion('America/Santiago');
    expect(rpc).toHaveBeenCalledWith('get_today_suggestion', { _tz: 'America/Santiago' });
    expect(today).toMatchObject({ source: 'rules', suggestion: { routineId: 'r1', duration: 45, reason: 'Ayer hiciste tren superior' } });
    const none = await createRoutinesService(async () => ({ ok: true, source: 'none', suggestion: null })).getTodaySuggestion(null);
    expect(none).toEqual({ source: 'none', suggestion: null });
  });
});

describe('error texts (es / en)', () => {
  it('maps every contract error, with the field of invalid_input', () => {
    expect(routineErrorCopy(new RoutineError('invalid_input', { field: 'title' }), 'es').message).toMatch('80 caracteres');
    expect(routineErrorCopy(new RoutineError('invalid_input', { field: 'exercises[3]' }), 'en').message).toMatch('sets');
    expect(routineErrorCopy(new RoutineError('exercise_not_found'), 'es').title).toBe('Ejercicio no disponible');
    expect(routineErrorCopy(new RoutineError('routine_not_found'), 'en').title).toBe('Routine not found');
    expect(routineErrorCopy(new RoutineError('chat_message_not_found'), 'es').message).toMatch('ELLIE');
    expect(routineErrorCopy(new Error('x'), 'es').title).toBe('Algo salió mal');
    expect(deletedRoutineText(true, 'es')).toMatch('archivó');
  });
});
