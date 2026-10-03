import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { EllieOrb, type EllieOrbState } from '@app/components/v2/EllieOrb';
import { PressableScale } from '@app/components/v2/PressableScale';
import { Eyebrow, TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type EllieSurfaceProps = {
  message: string;
  eyebrow?: string;
  action?: { label: string; onPress: () => void };
  orbSize?: number;
  orbState?: EllieOrbState;
  style?: StyleProp<ViewStyle>;
};

// Full-bleed linen band with the orb and ELLIE's voice (17/400, no bubble).
// ELLIE's material is identity, not a card: no radius, no border.
export function EllieSurface({
  message,
  eyebrow = 'ELLIE',
  action,
  orbSize = 44,
  orbState = 'breathing',
  style,
}: EllieSurfaceProps) {
  const { colors, layout } = useThemeV2();
  const linen = colors.ellie.linen.slice(0, 2);

  return (
    <View style={[styles.band, { paddingHorizontal: layout.gutter }, style]}>
      {/* Background only: on Fabric a padded LinearGradient used as a
          container offsets itself and its children by the padding. */}
      <LinearGradient
        colors={linen.length > 1 ? linen : [linen[0], linen[0]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <EllieOrb size={orbSize} state={orbState} />
      <View style={styles.texts}>
        <Eyebrow color={colors.ellie.textSecondary}>{eyebrow}</Eyebrow>
        <TextV2 variant="voice">{message}</TextV2>
        {action ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={10}
            onPress={action.onPress}
            style={styles.action}
          >
            <TextV2 variant="bodyStrong">{action.label}</TextV2>
            <ArrowRight color={colors.text.primary} size={16} strokeWidth={2} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 24,
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
});
