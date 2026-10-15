import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { AudioSession } from '@app/features/ellie/voice/audioSession';
import type { SpeechListener } from '@app/features/ellie/voice/recognizer';
import type { Speaker } from '@app/features/ellie/voice/speaker';
import {
  INITIAL_VOICE,
  voiceReducer,
  type VoiceEvent,
  type VoiceState,
} from '@app/features/ellie/voice/voiceMachine';
import { EllieError } from '@app/services/ellie/ellieService';

export type VoiceAnswer = { text: string; hasPlan: boolean };

export type VoiceControllerDeps = {
  listener: SpeechListener;
  speaker: Speaker;
  audio: AudioSession;
  // Sends what was said to ellie-chat as a normal message.
  ask: (text: string) => Promise<VoiceAnswer>;
  language: () => EllieLanguage;
  onState: (state: VoiceState) => void;
  // The end of the sentence: this long without the transcript changing.
  silenceMs?: number;
  // Nothing said at all for this long: back to rest.
  noSpeechMs?: number;
};

export const SILENCE_MS = 1600;
export const NO_SPEECH_MS = 8000;

// Orchestrates the voice: recognizer → ellie-chat → speaker, with the machine
// of voiceMachine.ts deciding the order. Plain class (no React) so the whole
// flow can be tested with fakes; useEllieVoice wraps it.
export class VoiceController {
  private state: VoiceState = INITIAL_VOICE;
  // Increments on every cancel / new turn: late callbacks of an old turn are ignored.
  private turn = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
  private asked = false;
  private destroyed = false;

  constructor(private readonly deps: VoiceControllerDeps) {}

  getState() {
    return this.state;
  }

  private dispatch(event: VoiceEvent) {
    const next = voiceReducer(this.state, event);
    if (next !== this.state) {
      this.state = next;
      this.deps.onState(next);
    }
  }

  private clearTimers() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer);
      this.noSpeechTimer = null;
    }
  }

  // ── The main button / the halo ───────────────────────────────────────────
  async tap() {
    if (this.destroyed) {
      return;
    }
    switch (this.state.phase) {
      case 'listening': {
        this.clearTimers();
        const spoken = this.state.transcript;
        this.deps.listener.stop();
        this.dispatch({ type: 'tap' });
        if (this.getState().phase === 'thinking') {
          this.think(spoken.trim()).catch(() => undefined);
        } else {
          this.deps.listener.abort();
          this.deps.audio.release();
        }
        return;
      }
      case 'thinking':
        this.turn += 1;
        this.dispatch({ type: 'tap' });
        return;
      case 'speaking':
        this.interrupt();
        return;
      default:
        await this.begin();
    }
  }

  // The permission explanation was accepted: ask the system, then listen.
  async confirmPermission() {
    this.dispatch({ type: 'rationale_closed' });
    const access = await this.deps.listener.requestAccess().catch(() => null);
    if (access?.granted) {
      await this.begin();
    } else {
      this.dispatch({ type: 'permission_denied' });
    }
  }

  dismissRationale() {
    this.dispatch({ type: 'rationale_closed' });
  }

  private async begin() {
    const access = await this.deps.listener.getAccess().catch(() => null);
    if (!access?.granted) {
      this.dispatch({ type: access?.undetermined ? 'needs_rationale' : 'permission_denied' });
      return;
    }
    this.turn += 1;
    const turn = this.turn;
    this.asked = false;
    this.dispatch({ type: 'tap' });
    const { silenceMs = SILENCE_MS, noSpeechMs = NO_SPEECH_MS } = this.deps;
    const guard = <T extends unknown[]>(fn: (...args: T) => void) =>
      (...args: T) => {
        if (turn === this.turn && !this.destroyed) {
          fn(...args);
        }
      };

    this.noSpeechTimer = setTimeout(() => {
      if (turn === this.turn && this.state.phase === 'listening' && !this.state.transcript) {
        this.deps.listener.abort();
        this.dispatch({ type: 'recognition_end' });
        this.deps.audio.release();
      }
    }, noSpeechMs);

    this.deps.listener.start(this.deps.language(), {
      onPartial: guard(text => {
        this.dispatch({ type: 'partial', text });
        if (this.noSpeechTimer) {
          clearTimeout(this.noSpeechTimer);
          this.noSpeechTimer = null;
        }
        // The sentence ends after a silence: ask the recognizer to finish.
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
        }
        this.silenceTimer = setTimeout(() => {
          if (turn === this.turn && this.state.phase === 'listening') {
            this.deps.listener.stop();
          }
        }, silenceMs);
      }),
      onFinal: guard(text => {
        this.clearTimers();
        this.dispatch({ type: 'final', text });
        this.afterListening(turn);
      }),
      onEnd: guard(() => {
        this.clearTimers();
        this.dispatch({ type: 'recognition_end' });
        this.afterListening(turn);
      }),
      onError: guard(code => {
        this.clearTimers();
        this.dispatch({ type: 'recognition_error', code });
        this.deps.audio.release();
        if (this.state.phase === 'thinking') {
          this.afterListening(turn);
        }
      }),
    });
  }

  // Recognition is over: if there is a sentence it goes to ELLIE (once).
  private afterListening(turn: number) {
    this.deps.audio.release();
    if (this.state.phase === 'thinking' && !this.asked && turn === this.turn) {
      this.think(this.state.transcript).catch(() => undefined);
    }
  }

  private async think(text: string) {
    if (this.asked) {
      return;
    }
    this.asked = true;
    const turn = this.turn;
    try {
      const answer = await this.deps.ask(text);
      if (turn !== this.turn || this.destroyed) {
        return;
      }
      this.dispatch({ type: 'reply', text: answer.text, hasPlan: answer.hasPlan });
      if (this.state.phase === 'speaking') {
        await this.speak(answer.text, turn);
      }
    } catch (error) {
      if (turn !== this.turn || this.destroyed) {
        return;
      }
      this.dispatch({
        type: 'reply_error',
        failure:
          error instanceof EllieError
            ? { code: error.code, used: error.used, limit: error.limit }
            : { code: 'unknown' },
      });
    }
  }

  private async speak(text: string, turn: number) {
    this.deps.audio.duckForSpeech();
    try {
      await this.deps.speaker.speak(text, this.deps.language());
      if (turn === this.turn && !this.destroyed) {
        this.dispatch({ type: 'speech_done' });
      }
    } catch {
      if (turn === this.turn && !this.destroyed) {
        this.dispatch({ type: 'speech_error' });
      }
    } finally {
      this.deps.audio.release();
    }
  }

  // Tapping while she speaks: silence now and back to rest.
  private interrupt() {
    this.turn += 1;
    this.deps.speaker.stop();
    this.dispatch({ type: 'tap' });
    this.deps.audio.release();
  }

  // Leaving the screen: nothing keeps running.
  destroy() {
    this.destroyed = true;
    this.turn += 1;
    this.clearTimers();
    this.deps.listener.abort();
    this.deps.speaker.stop();
    this.deps.audio.release();
  }
}
