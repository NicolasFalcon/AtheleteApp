import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { LivingHalo, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';

// Inicio · ELLIE band (v2.12 §22.3): integrated, full width, 28/20 padding,
// no border or dividers, a very soft Ember wash, lit Halo of 56 pt. The copy
// is fixed. It opens the chat without sending anything.
export const ELLIE_BAND_COPY = {
  eyebrow: 'ELLIE',
  line: 'Siempre aquí para tu entrenamiento.',
  action: 'Hablar con ELLIE',
} as const;

export function EllieBand({ onPress }: { onPress: () => void }) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`ELLIE. ${ELLIE_BAND_COPY.line} ${ELLIE_BAND_COPY.action}`}
      onPress={onPress}
      style={styles.band}
    >
      {/* Background only (on Fabric a padded gradient container shifts its
          children). */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,91,31,.08)', 'rgba(255,91,31,.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LivingHalo size="band" state="idle" lit />
      <View style={styles.texts}>
        <TextV2 variant="eyebrow" color={colors.ellie.textSecondary} style={styles.eyebrow}>
          {ELLIE_BAND_COPY.eyebrow}
        </TextV2>
        <TextV2 variant="voice" style={styles.line}>
          {ELLIE_BAND_COPY.line}
        </TextV2>
        <View style={styles.action}>
          <TextV2 variant="bodyStrong" style={styles.actionText}>
            {ELLIE_BAND_COPY.action}
          </TextV2>
          <ArrowRight size={15} color={colors.text.primary} strokeWidth={2} />
        </View>
      </View>
      <View style={[styles.status, { backgroundColor: 'rgba(255,91,31,.14)' }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.ember.base }]} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Breaks out of the sheet's side padding.
  band: {
    marginHorizontal: -20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  texts: { flex: 1, minWidth: 0, gap: 8 },
  eyebrow: { letterSpacing: 1.1 },
  line: { fontSize: 18, lineHeight: 24, paddingRight: 24 },
  action: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { fontSize: 15 },
  status: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
