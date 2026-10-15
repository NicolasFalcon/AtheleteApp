import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { VOICE_LOCALE } from '@app/features/ellie/voice/speaker';

// Speech recognition. Screens and the controller only know `SpeechListener`.
export type RecognitionAccess = {
  granted: boolean;
  // false once the system will not ask again (→ Ajustes).
  canAskAgain: boolean;
  // Never asked: show the explanation first.
  undetermined: boolean;
};

export type RecognitionHandlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (code: string) => void;
};

export interface SpeechListener {
  getAccess(): Promise<RecognitionAccess>;
  // Microphone + speech recognition dialogs (iOS shows each once).
  requestAccess(): Promise<RecognitionAccess>;
  start(language: EllieLanguage, handlers: RecognitionHandlers): void;
  // Ends and delivers the final result.
  stop(): void;
  // Ends without a result.
  abort(): void;
}

type PermissionLike = { granted: boolean; canAskAgain: boolean; status?: string };

export function toAccess(response: PermissionLike): RecognitionAccess {
  return {
    granted: response.granted,
    canAskAgain: response.canAskAgain,
    undetermined: !response.granted && response.canAskAgain && response.status !== 'denied',
  };
}

// expo-speech-recognition (Apple Speech). Recognition runs on the device when
// the phone supports it for the language; otherwise iOS uses Apple's servers
// (the permission text of the Info.plist covers it).
export class ExpoSpeechListener implements SpeechListener {
  private subscriptions: { remove: () => void }[] = [];

  private module() {
    return (require('expo-speech-recognition') as typeof import('expo-speech-recognition'))
      .ExpoSpeechRecognitionModule;
  }

  async getAccess() {
    return toAccess(await this.module().getPermissionsAsync());
  }

  async requestAccess() {
    return toAccess(await this.module().requestPermissionsAsync());
  }

  private clear() {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
  }

  start(language: EllieLanguage, handlers: RecognitionHandlers, onDevice = true) {
    const module = this.module();
    this.clear();
    const useOnDevice = onDevice && module.supportsOnDeviceRecognition();
    this.subscriptions = [
      module.addListener('result', event => {
        const text = event.results[0]?.transcript ?? '';
        if (event.isFinal) {
          handlers.onFinal(text);
        } else {
          handlers.onPartial(text);
        }
      }),
      module.addListener('error', event => {
        // The language is not installed for on-device recognition: try the
        // regular recognizer once.
        if (event.error === 'language-not-supported' && useOnDevice) {
          this.start(language, handlers, false);
          return;
        }
        handlers.onError(event.error);
      }),
      module.addListener('end', () => {
        this.clear();
        handlers.onEnd();
      }),
    ];
    module.start({
      lang: VOICE_LOCALE[language],
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      requiresOnDeviceRecognition: useOnDevice,
      // Music is lowered while she listens, not stopped.
      iosCategory: {
        category: 'playAndRecord',
        categoryOptions: ['duckOthers', 'defaultToSpeaker', 'allowBluetooth'],
        mode: 'default',
      },
    });
  }

  stop() {
    this.module().stop();
  }

  abort() {
    this.clear();
    this.module().abort();
  }
}
