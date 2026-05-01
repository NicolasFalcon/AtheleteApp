import { createEllieClient } from '@athelete/data/ellie-client';
import { getSupabasePublishableKey, getSupabaseUrl } from './runtimeEnv';

const CHAT_URL = `${getSupabaseUrl()}/functions/v1/ellie-chat`;
const SUPABASE_PUBLISHABLE_KEY = getSupabasePublishableKey();
const ellieClient = createEllieClient({
  chatUrl: CHAT_URL,
  publishableKey: SUPABASE_PUBLISHABLE_KEY,
});

export type ChatMessage = import('@athelete/data/ellie-client').EllieClientMessage;

export interface EllieUserContext {
  name: string;
  goal: string;
  trainingDaysPerWeek: number;
  isPremium: boolean;
  todayWorkoutDone: boolean;
  workoutsThisWeek: number;
  lastWorkoutDate: string | null;
  currentStreak: number;
  nutritionLogged: boolean;
  nutritionTargetActive: boolean;
  challengeDay: number;
  challengeActive: boolean;
  completedChallengeDays: number;
  points: number;
}

export type EllieGenerationResult = import('@athelete/data/ellie-client').EllieGenerationResult;

/**
 * Unified chat call. The edge function now uses non-streaming + tool-calling
 * for ALL chat messages (not just explicit generation mode).
 * 
 * Returns either:
 * - A structured tool-call result (workout/nutrition plan)
 * - An SSE text stream for plain conversational responses
 */
export async function callEllieChat({
  messages,
  userContext,
  mode,
  onDelta,
  onDone,
  onToolResult,
  onError,
}: {
  messages: ChatMessage[];
  userContext: string;
  mode?: 'generate_workout' | 'generate_nutrition';
  onDelta: (text: string) => void;
  onDone: () => void;
  onToolResult: (result: EllieGenerationResult) => void;
  onError: (error: string) => void;
}) {
  return ellieClient.callEllieChat({
    messages,
    userContext,
    mode,
    onDelta,
    onDone,
    onToolResult,
    onError,
  });
}

/** Legacy streaming chat — kept for backward compat but now wraps callEllieChat */
export async function streamEllieChat(opts: {
  messages: ChatMessage[];
  userContext: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  return ellieClient.streamEllieChat({
    ...opts,
  });
}

/** Non-streaming generation mode for explicit CTA buttons */
export async function generateWithEllie({
  messages,
  userContext,
  mode,
}: {
  messages: ChatMessage[];
  userContext: string;
  mode: 'generate_workout' | 'generate_nutrition';
}): Promise<EllieGenerationResult> {
  return ellieClient.generateWithEllie({ messages, userContext, mode });
}
