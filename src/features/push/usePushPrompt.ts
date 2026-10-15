import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { requestPushPrompt } from '@app/features/push/pushPromptStore';
import type { PromptReason } from '@app/features/push/pushPermission';

// The first time an existing user enters Comunidad or the inbox, the
// pre-permission screen may come up (once; see shouldPrompt).
export function usePushPromptOnFocus(reason: PromptReason): void {
  useFocusEffect(
    useCallback(() => {
      requestPushPrompt(reason);
    }, [reason]),
  );
}
