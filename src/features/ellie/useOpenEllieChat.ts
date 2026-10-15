import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  // The screen the question comes from travels as client_context ("progress",
  // "nutrition_plan"…): never user data.
  const source = useRoute().name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  return useCallback(
    (ask?: { text: string; mode?: EllieMode }) =>
      navigation.navigate(APP_ROUTES.EllieChat, {
        prompt: ask?.text,
        mode: ask?.mode,
        source,
      }),
    [navigation, source],
  );
}
