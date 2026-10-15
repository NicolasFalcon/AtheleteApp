import { Modal, StyleSheet, View } from 'react-native';
import { Button, TextV2, useThemeV2 } from '@app/components/v2';

// Centered card for a decision with consequences (design: "Diálogo", radius
// 28, 28 pt margins): the destructive action in Ember deep, Cancel muted.
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors, mode } = useThemeV2();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(14,13,12,.55)' }]}>
        <View style={[styles.card, { backgroundColor: colors.surface.raised }]}>
          <TextV2 variant="title22">{title}</TextV2>
          <TextV2 variant="body" tone="secondary">
            {text}
          </TextV2>
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              loading={busy}
              disabled={busy}
              fullWidth
              style={{ backgroundColor: mode === 'dark' ? '#FF8A5C' : '#C23D0B' }}
            />
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: 28, padding: 24, gap: 12 },
  actions: { gap: 10, marginTop: 8 },
});
