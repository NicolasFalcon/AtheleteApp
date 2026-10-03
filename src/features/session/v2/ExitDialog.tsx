import { StyleSheet, View } from 'react-native';
import { Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';

// Salir del entreno (Overlays.dc.html · SESSION_06). Rendered outside the
// session scene: white card in Light, #1C1B19 with a hairline in Dark.
export function ExitDialog({
  saving,
  onStay,
  onSaveAndExit,
}: {
  saving: boolean;
  onStay: () => void;
  onSaveAndExit: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const dark = mode === 'dark';

  return (
    <View style={StyleSheet.absoluteFill}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Seguir entrenando"
        onPress={onStay}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? 'rgba(0,0,0,.55)' : 'rgba(18,18,18,.32)' },
        ]}
      />
      <View style={styles.center} pointerEvents="box-none">
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            dark
              ? {
                  backgroundColor: '#1C1B19',
                  boxShadow:
                    '0 0 0 1px rgba(255,255,255,.06), 0 18px 44px rgba(0,0,0,.5)',
                }
              : {
                  backgroundColor: colors.surface.raised,
                  boxShadow: '0 12px 32px rgba(0,0,0,.18)',
                },
          ]}
        >
          <TextV2 variant="section">¿Salir del entreno?</TextV2>
          <TextV2 variant="body" tone="secondary" style={styles.body}>
            Tu progreso queda guardado para retomarlo desde Inicio.
          </TextV2>
          <Button
            label="Seguir entrenando"
            onPress={onStay}
            style={styles.primary}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ busy: saving }}
            disabled={saving}
            onPress={onSaveAndExit}
            style={styles.secondary}
          >
            <TextV2 variant="bodyStrong">
              {saving ? 'Guardando…' : 'Guardar y salir'}
            </TextV2>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  body: { lineHeight: 22 },
  primary: { marginTop: 14 },
  secondary: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
