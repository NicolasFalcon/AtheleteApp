import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, LivingHalo, Sheet, TextV2, useToast } from '@app/components/v2';
import { PROMPT_COPY } from '@app/features/push/pushCopy';
import { shouldPrompt } from '@app/features/push/pushPermission';
import { clearPushPrompt, subscribePushPrompt } from '@app/features/push/pushPromptStore';
import { pushRegistration, readPermission, requestPermission } from '@app/features/push/pushRuntime';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import type { PromptReason } from '@app/features/push/pushPermission';

export const askedKey = (userId: string) => `@athelete/push-prompt-asked/${userId}`;

async function wasAsked(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(askedKey(userId))) === '1';
  } catch {
    return false;
  }
}

async function markAsked(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(askedKey(userId), '1');
  } catch {
    // Not remembering it only means it may be offered once more.
  }
}

// The v2 pre-permission screen ("Entérate cuando importa"). Never at launch:
// only when someone asked for it (end of onboarding, first time in Comunidad
// or in the inbox) and the system has not been asked yet. The system dialog
// comes only after "Activar notificaciones".
export function PushPermissionHost() {
  const { profile, flow } = useAuth();
  const language = useProfileLanguage();
  const toast = useToast();
  const userId = profile?.id;
  const ready = flow === 'app' && Boolean(profile?.onboardingCompleted);
  const [requested, setRequested] = useState<PromptReason | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribePushPrompt(setRequested), []);

  useEffect(() => {
    if (!requested || !ready || !userId) {
      return undefined;
    }
    let cancelled = false;
    // Let the screen that asked finish its transition first.
    const timer = setTimeout(async () => {
      const [permission, alreadyAsked] = await Promise.all([readPermission(), wasAsked(userId)]);
      if (cancelled) {
        return;
      }
      if (shouldPrompt({ permission, alreadyAsked, onboardingCompleted: ready })) {
        setOpen(true);
      } else {
        clearPushPrompt();
      }
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, requested, userId]);

  const close = useCallback(() => {
    setOpen(false);
    clearPushPrompt();
  }, []);

  const later = useCallback(() => {
    if (userId) {
      markAsked(userId).catch(() => undefined);
    }
    close();
  }, [close, userId]);

  const enable = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    if (userId) {
      await markAsked(userId);
    }
    close();
    const permission = await requestPermission();
    if (permission === 'granted') {
      pushRegistration.sync().catch(() => undefined);
      toast.show(language === 'es' ? 'Notificaciones activadas' : 'Notifications on');
    }
    setBusy(false);
  }, [busy, close, language, toast, userId]);

  return (
    <Sheet
      open={open}
      onClose={later}
      hideHeader
      footer={
        <View style={styles.actions}>
          <Button label={PROMPT_COPY.enable[language]} fullWidth loading={busy} onPress={() => void enable()} />
          <Button label={PROMPT_COPY.later[language]} variant="secondary" fullWidth onPress={later} />
        </View>
      }
    >
      <View style={styles.body}>
        <LivingHalo size={48} state="idle" />
        <TextV2 variant="title22">{PROMPT_COPY.title[language]}</TextV2>
        <TextV2 variant="body" tone="secondary">
          {PROMPT_COPY.text[language]}
        </TextV2>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingTop: 8 },
  actions: { gap: 10 },
});
