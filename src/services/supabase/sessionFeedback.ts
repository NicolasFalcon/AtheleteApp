import { isNetworkError } from '@app/features/session/sessionOutbox';
import type { BodyZone, Effort } from '@app/features/session/restMessages';
import { getSupabaseClient } from '@app/services/supabase/client';

// Feedback during and after a workout (contract sfb-1,
// docs/backend/SESSION_FEEDBACK_SHAPES.md): the check-in and discomfort
// answers of the rest messages and the final 1–5 rating. Both RPCs are
// idempotent (log_session_feedback by client id; rate_session overwrites).

export type FeedbackErrorCode =
  | 'session_not_found'
  | 'offline'
  | 'unauthorized'
  | 'invalid'
  | 'unknown';

export class FeedbackError extends Error {
  code: FeedbackErrorCode;
  constructor(code: FeedbackErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'FeedbackError';
    this.code = code;
  }
}

type Raw = Record<string, unknown>;

async function call(name: string, args: Record<string, unknown>): Promise<Raw> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      rpc: string,
      params: object,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new FeedbackError('unknown', 'Supabase no está configurado.');
  }
  let response: Awaited<ReturnType<typeof client.rpc>>;
  try {
    response = await client.rpc(name, args);
  } catch (thrown) {
    throw new FeedbackError(isNetworkError(thrown) ? 'offline' : 'unknown', String(thrown));
  }
  const { data, error } = response;
  if (error) {
    throw new FeedbackError(
      error.code === '42501' ? 'unauthorized' : isNetworkError(error) ? 'offline' : 'unknown',
      error.message,
    );
  }
  const body = (data && typeof data === 'object' ? data : {}) as Raw;
  if (body.ok !== true) {
    const err = (body.error && typeof body.error === 'object' ? body.error : {}) as Raw;
    const code = err.code === 'session_not_found' || err.code === 'unauthorized'
      ? err.code
      : typeof err.code === 'string'
      ? 'invalid'
      : 'unknown';
    throw new FeedbackError(code, typeof err.message === 'string' ? err.message : String(err.code ?? code));
  }
  return body;
}

export type SessionFeedbackWrite = {
  clientId: string;
  sessionId: string;
  exerciseId: string | null;
} & (
  | { kind: 'effort'; effort: Effort; note?: null }
  | { kind: 'discomfort'; bodyZone: BodyZone; note: string | null }
);

export async function logSessionFeedback(write: SessionFeedbackWrite): Promise<void> {
  await call('log_session_feedback', {
    p_session_id: write.sessionId,
    p_exercise_id: write.exerciseId,
    p_kind: write.kind,
    p_effort: write.kind === 'effort' ? write.effort : null,
    p_body_zone: write.kind === 'discomfort' ? write.bodyZone : null,
    p_note: write.note ?? null,
    p_client_id: write.clientId,
  });
}

export async function rateSession(params: {
  sessionId: string;
  rating: number;
  note: string | null;
}): Promise<void> {
  await call('rate_session', {
    p_session_id: params.sessionId,
    p_rating: params.rating,
    p_note: params.note,
  });
}
