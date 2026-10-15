import { Platform } from 'react-native';

// The audio session while ELLIE talks or listens: other apps' audio (music,
// podcasts) is lowered ("duck") only for as long as needed, and when she is
// done the session is deactivated telling the others to resume at full volume.
export interface AudioSession {
  // Before speaking: duck other audio.
  duckForSpeech(): void;
  // After listening or speaking: give the audio back as it was.
  release(): void;
}

type Category = { category: string; categoryOptions: string[]; mode: string };

export class IOSAudioSession implements AudioSession {
  private previous: Category | null = null;

  private module() {
    return (require('expo-speech-recognition') as typeof import('expo-speech-recognition'))
      .ExpoSpeechRecognitionModule;
  }

  duckForSpeech() {
    if (Platform.OS !== 'ios') {
      return;
    }
    try {
      const module = this.module();
      if (!this.previous) {
        this.previous = module.getAudioSessionCategoryAndOptionsIOS() as Category;
      }
      module.setCategoryIOS({
        category: 'playback',
        categoryOptions: ['duckOthers'],
        mode: 'spokenAudio',
      });
      module.setAudioSessionActiveIOS(true, { notifyOthersOnDeactivation: true });
    } catch {
      // Without the session control the system keeps its defaults.
    }
  }

  release() {
    if (Platform.OS !== 'ios') {
      return;
    }
    try {
      const module = this.module();
      module.setAudioSessionActiveIOS(false, { notifyOthersOnDeactivation: true });
      if (this.previous) {
        module.setCategoryIOS(this.previous as Parameters<typeof module.setCategoryIOS>[0]);
        this.previous = null;
      }
    } catch {
      // Already inactive.
    }
  }
}
