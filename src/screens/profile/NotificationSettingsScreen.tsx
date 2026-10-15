import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, Plus } from 'lucide-react-native';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  PressableScale,
  Row,
  StatusBarV2,
  SwitchV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { ROOT_ROUTES } from '@app/constants/routes';
import { hourLabel, permissionAction, permissionLine, settingsCopy } from '@app/features/push/pushCopy';
import type { PushPermission } from '@app/features/push/pushPermission';
import { stepHour } from '@app/features/push/pushPrefsModel';
import { pushRegistration, readPermission, requestPermission } from '@app/features/push/pushRuntime';
import { usePushPrefs } from '@app/features/push/usePushPrefs';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'NotificationSettings'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Ajustes › Notificaciones push: the state of the system permission (with
// "Abrir Ajustes" when it is denied), the two categories that can be turned
// off and the quiet hours. The reminders of workouts / hydration are the
// switches of Ajustes › Preferencias.
export function NotificationSettingsScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const language = useProfileLanguage();
  const copy = settingsCopy(language);
  const { prefs, update } = usePushPrefs();
  const [permission, setPermission] = useState<PushPermission | null>(null);

  const refresh = useCallback(() => {
    readPermission()
      .then(setPermission)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    // Coming back from the system Ajustes.
    const state = AppState.addEventListener('change', next => {
      if (next === 'active') {
        refresh();
      }
    });
    return () => state.remove();
  }, [refresh]);

  const act = async () => {
    if (permission === 'denied') {
      Linking.openSettings().catch(() => undefined);
      return;
    }
    const next = await requestPermission();
    setPermission(next);
    if (next === 'granted') {
      pushRegistration.sync().catch(() => undefined);
    }
  };

  const action = permission ? permissionAction(permission, language) : null;
  const quiet = prefs.quietHours;

  const stepper = (label: string, value: number, key: 'quietStart' | 'quietEnd') => (
    <View style={[styles.hourRow, { borderBottomColor: colors.divider }]}>
      <TextV2 variant="body" style={styles.flex}>
        {label}
      </TextV2>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label} −1`}
        onPress={() => update({ [key]: stepHour(value, -1) })}
        style={[styles.step, { backgroundColor: colors.surface.muted }]}
      >
        <Minus size={16} strokeWidth={2} color={colors.text.primary} />
      </PressableScale>
      <TextV2 variant="bodyStrong" style={styles.hour}>
        {hourLabel(value)}
      </TextV2>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label} +1`}
        onPress={() => update({ [key]: stepHour(value, 1) })}
        style={[styles.step, { backgroundColor: colors.surface.muted }]}
      >
        <Plus size={16} strokeWidth={2} color={colors.text.primary} />
      </PressableScale>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={copy.title}
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 28 }}
      >
        <View>
          <Eyebrow style={styles.title}>{copy.system}</Eyebrow>
          <Row
            title={permission ? permissionLine(permission, language) : '…'}
            trailing={
              action ? <Button label={action} size="sm" onPress={() => void act()} /> : undefined
            }
          />
        </View>

        <View>
          <Row
            title={copy.social}
            subtitle={copy.socialSub}
            trailing={
              <SwitchV2
                accessibilityLabel={copy.social}
                value={prefs.social}
                onValueChange={value => update({ social: value })}
              />
            }
          />
          <Row
            title={copy.challenges}
            subtitle={copy.challengesSub}
            trailing={
              <SwitchV2
                accessibilityLabel={copy.challenges}
                value={prefs.challenges}
                onValueChange={value => update({ challenges: value })}
              />
            }
          />
          <Row
            title={copy.quiet}
            subtitle={copy.quietSub}
            trailing={
              <SwitchV2
                accessibilityLabel={copy.quiet}
                value={quiet.enabled}
                onValueChange={value => update({ quietEnabled: value })}
              />
            }
          />
          {quiet.enabled ? (
            <>
              {stepper(copy.from, quiet.start, 'quietStart')}
              {stepper(copy.until, quiet.end, 'quietEnd')}
            </>
          ) : null}
        </View>

        <TextV2 variant="meta" tone="tertiary">
          {copy.moderation}
        </TextV2>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  title: { marginBottom: 4 },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hour: { width: 56, textAlign: 'center' },
});
