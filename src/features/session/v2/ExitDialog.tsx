import { StyleSheet, View } from 'react-native';
import { Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';

// Salir del entreno (Overlays.dc.html · SESSION_06; handoff §7: "Guardar
// para después o descartar · Salir sin guardar / Seguir"). Rendered outside
// the session scene and above every session layer (pause, rest, menu):
// white card in Light, #1C1B19 with a hairline in Dark.
export function ExitDialog({
  busy,
  onCancel,
  onSaveForLater,
  onDiscard,
}: {
  busy: null | 'save' | 'discard';
  onCancel: () => void;
  onSaveForLater: () => void;
  onDiscard: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const dark = mode === 'dark';

  return (
    <View style={styles.root}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Cancelar"
        onPress={onCancel}
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
            label="Guardar para después"
            loading={busy === 'save'}
            loadingLabel="Guardando"
            disabled={Boolean(busy)}
            onPress={onSaveForLater}
            style={styles.primary}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ busy: busy === 'discard', disabled: Boolean(busy) }}
            disabled={Boolean(busy)}
            onPress={onDiscard}
            style={styles.secondary}
          >
            <TextV2
              variant="bodyStrong"
              color={dark ? colors.ember.textOnDark : colors.ember.deep}
            >
              {busy === 'discard' ? 'Saliendo…' : 'Salir sin guardar'}
            </TextV2>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            disabled={Boolean(busy)}
            onPress={onCancel}
            style={styles.secondary}
          >
            <TextV2 variant="bodyStrong">Cancelar</TextV2>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Above the pause / rest layers (zIndex 4), the header (5) and the menu (9).
  root: { ...StyleSheet.absoluteFill, zIndex: 20, elevation: 20 },
  center: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 6,
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
