import { StyleSheet, View } from 'react-native';
import { Button, LivingHalo, Sheet, TextV2 } from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import {
  visionFailureCopy,
  type VisionAction,
  type VisionContext,
  type VisionFailureInput,
} from '@app/features/vision/visionCopy';

const LABELS: Record<EllieLanguage, Record<VisionAction, { meal: string; machine: string }>> = {
  es: {
    other_photo: { meal: 'Otra foto', machine: 'Otra foto' },
    quick_kcal: { meal: 'Registrar solo kcal', machine: 'Elegir a mano' },
    retry: { meal: 'Reintentar', machine: 'Reintentar' },
    dismiss: { meal: 'Ahora no', machine: 'Ahora no' },
    login: { meal: 'Iniciar sesión', machine: 'Iniciar sesión' },
    manual: { meal: 'Elegir a mano', machine: 'Elegir a mano' },
    ask_ellie: { meal: 'Preguntar a ELLIE', machine: 'Preguntar a ELLIE' },
  },
  en: {
    other_photo: { meal: 'Another photo', machine: 'Another photo' },
    quick_kcal: { meal: 'Log just kcal', machine: 'Pick by hand' },
    retry: { meal: 'Try again', machine: 'Try again' },
    dismiss: { meal: 'Not now', machine: 'Not now' },
    login: { meal: 'Sign in', machine: 'Sign in' },
    manual: { meal: 'Pick by hand', machine: 'Pick by hand' },
    ask_ellie: { meal: 'Ask ELLIE', machine: 'Ask ELLIE' },
  },
};

// The sheet that explains why a photo could not be analysed (design §23.5):
// Halo 36, title 22/600, text 15, a primary 56 and a muted secondary 48. It
// sits over the dimmed photo. Offline: the Halo is a still sphere.
export function VisionFailureSheet({
  failure,
  context,
  language,
  onAction,
  onClose,
}: {
  failure: VisionFailureInput | null;
  context: VisionContext;
  language: EllieLanguage;
  onAction: (action: VisionAction) => void;
  onClose: () => void;
}) {
  const copy = failure ? visionFailureCopy(failure, context, language) : null;
  const label = (action: VisionAction) => LABELS[language][action][context];
  return (
    <Sheet
      open={copy !== null}
      onClose={onClose}
      hideHeader
      footer={
        copy ? (
          <View style={styles.actions}>
            <Button label={label(copy.actions[0])} fullWidth onPress={() => onAction(copy.actions[0])} />
            {copy.actions[1] ? (
              <Button
                label={label(copy.actions[1])}
                variant="secondary"
                fullWidth
                onPress={() => onAction(copy.actions[1] as VisionAction)}
              />
            ) : null}
          </View>
        ) : null
      }
    >
      {copy ? (
        <View style={styles.body}>
          <LivingHalo size={36} state={failure?.code === 'offline' ? 'offline' : 'idle'} />
          <TextV2 variant="title22">{copy.title}</TextV2>
          <TextV2 variant="body" tone="secondary">
            {copy.text}
          </TextV2>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  actions: { gap: 10 },
});
