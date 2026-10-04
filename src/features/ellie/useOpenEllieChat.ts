import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { APP_ROUTES } from '@app/constants/routes';
import type { EllieMode } from '@app/features/ellie/chatModel';
import type { AppStackParamList } from '@app/types/navigation';

// The single entry to the ELLIE chat from any screen (Inicio, Progreso,
// Notificaciones, Nutrición…): without an ask it continues the thread; with
// one, the chat sends it on arrival.
export function useOpenEllieChat() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return useCallback(
    (ask?: { text: string; mode?: EllieMode }) =>
      navigation.navigate(APP_ROUTES.EllieChat, {
        prompt: ask?.text,
        mode: ask?.mode,
      }),
    [navigation],
  );
}
