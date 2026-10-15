import type { EllieLanguage } from '@app/features/ellie/ellieCopy';

// ELLIE's voice. Screens only know `Speaker`, so the on-device voice can later
// be swapped for one that comes from the server without touching them.
export interface Speaker {
  // Speaks and resolves when it finished or was stopped. Rejects on an error
  // of the synthesizer.
  speak(text: string, language: EllieLanguage): Promise<void>;
  // Interrupts at once (resolves the pending `speak`).
  stop(): void;
}

// BCP-47 tag used for recognition and speech.
export const VOICE_LOCALE: Record<EllieLanguage, string> = { es: 'es-ES', en: 'en-US' };

export type DeviceVoice = {
  identifier: string;
  name?: string;
  language: string;
  quality?: string;
};

// The best installed voice for the language: the exact locale first (es-ES /
// en-US), then any voice of that language; Enhanced / Premium before Default.
// null = let the system choose by language.
export function pickVoice(voices: readonly DeviceVoice[], language: EllieLanguage): string | null {
  const locale = VOICE_LOCALE[language].toLowerCase().replace('_', '-');
  const primary = language;
  const rank = (voice: DeviceVoice) => {
    const tag = voice.language.toLowerCase().replace('_', '-');
    const place = tag === locale ? 0 : tag.startsWith(`${primary}-`) || tag === primary ? 1 : 9;
    const quality = voice.quality === 'Premium' ? 0 : voice.quality === 'Enhanced' ? 1 : 2;
    return place * 10 + quality;
  };
  const candidates = voices.filter(voice => rank(voice) < 90);
  if (candidates.length === 0) {
    return null;
  }
  return [...candidates].sort((a, b) => rank(a) - rank(b))[0].identifier;
}

// What is read aloud: the answer without markdown marks, links or emoji.
export function plainSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/(\*\*|__|\*|_)/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// expo-speech on the device (AVSpeechSynthesizer).
export class DeviceSpeaker implements Speaker {
  private finish: (() => void) | null = null;
  private voices: DeviceVoice[] | null = null;

  private speech() {
    return require('expo-speech') as typeof import('expo-speech');
  }

  private async voiceFor(language: EllieLanguage): Promise<string | null> {
    try {
      if (!this.voices) {
        this.voices = (await this.speech().getAvailableVoicesAsync()) as DeviceVoice[];
      }
      return pickVoice(this.voices, language);
    } catch {
      return null;
    }
  }

  async speak(text: string, language: EllieLanguage): Promise<void> {
    const Speech = this.speech();
    const voice = await this.voiceFor(language);
    await new Promise<void>((resolve, reject) => {
      this.finish = resolve;
      Speech.speak(plainSpeech(text), {
        language: VOICE_LOCALE[language],
        ...(voice ? { voice } : {}),
        onDone: () => {
          this.finish = null;
          resolve();
        },
        onStopped: () => {
          this.finish = null;
          resolve();
        },
        onError: error => {
          this.finish = null;
          reject(error);
        },
      });
    });
  }

  stop() {
    try {
      this.speech().stop();
    } catch {
      // Nothing speaking.
    }
    this.finish?.();
    this.finish = null;
  }
}
