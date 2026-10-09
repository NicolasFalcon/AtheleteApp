import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';
import type {
  EllieChatRouteParams,
  EllieVoiceRouteParams,
} from '@app/types/navigation';

// Development only: each ELLIE screen and state with sample conversations:
// nothing is sent to ELLIE or stored. Used by the dev menu ("Ver pantallas de
// ELLIE") and athelete://dev/ellie?screen=<key>.
export const ELLIE_DEV_SCREENS = [
  { key: 'home', label: 'Portada · datos reales (ELLIE_01)' },
  { key: 'homeResume', label: 'Portada · con conversación por retomar' },
  { key: 'homeEmpty', label: 'Portada · primera vez' },
  { key: 'homeLoading', label: 'Portada · cargando' },
  { key: 'homeError', label: 'Portada · error con reintento' },
  { key: 'first', label: 'Chat · primer contacto (ELLIE_02)' },
  { key: 'chat', label: 'Chat · conversación' },
  { key: 'thinking', label: 'Chat · ELLIE escribiendo' },
  { key: 'plan', label: 'Chat · plan nutricional (ELLIE_03)' },
  { key: 'planActivating', label: 'Chat · activando plan' },
  { key: 'planError', label: 'Chat · error al activar' },
  { key: 'planActive', label: 'Chat · plan activo' },
  { key: 'routine', label: 'Chat · rutina propuesta' },
  { key: 'offline', label: 'Chat · sin conexión (STATE_08)' },
  { key: 'server', label: 'Chat · error del servidor' },
  { key: 'limit', label: 'Chat · límite alcanzado' },
  { key: 'loading', label: 'Chat · cargando' },
  { key: 'historyError', label: 'Chat · historial no cargó' },
  { key: 'voiceIdle', label: 'Voz · reposo (ELLIE_04)' },
  { key: 'voiceListening', label: 'Voz · escuchando (ELLIE_05)' },
  { key: 'voiceThinking', label: 'Voz · procesando (ELLIE_06)' },
  { key: 'voiceSpeaking', label: 'Voz · respondiendo (ELLIE_07)' },
] as const;

export type EllieDevScreen = (typeof ELLIE_DEV_SCREENS)[number]['key'];

export function isEllieDevScreen(value: string | null): value is EllieDevScreen {
  return ELLIE_DEV_SCREENS.some(screen => screen.key === value);
}

const TAB_STATES: Partial<
  Record<EllieDevScreen, 'empty' | 'data' | 'loading' | 'error'>
> = {
  homeResume: 'data',
  homeEmpty: 'empty',
  homeLoading: 'loading',
  homeError: 'error',
};

const VOICE_DEV_STATES: Partial<
  Record<EllieDevScreen, NonNullable<EllieVoiceRouteParams['devState']>>
> = {
  voiceIdle: 'idle',
  voiceListening: 'listening',
  voiceThinking: 'thinking',
  voiceSpeaking: 'speaking',
};

export async function openEllieDevScreen(screen: EllieDevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  if (screen === 'home' || screen in TAB_STATES) {
    navigationRef.navigate('MainTabs', {
      screen: 'Ellie',
      params: { devState: TAB_STATES[screen] },
    });
    return true;
  }
  const voice = VOICE_DEV_STATES[screen];
  if (voice) {
    navigationRef.dispatch(
      StackActions.push('EllieVoice' as never, { devState: voice } as never),
    );
    return true;
  }
  const params: EllieChatRouteParams = {
    devState: screen as NonNullable<EllieChatRouteParams['devState']>,
  };
  navigationRef.dispatch(StackActions.push('EllieChat' as never, params as never));
  return true;
}

let cursor = -1;

export async function openNextEllieDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % ELLIE_DEV_SCREENS.length;
  const target = ELLIE_DEV_SCREENS[cursor];
  return (await openEllieDevScreen(target.key)) ? target.label : null;
}
