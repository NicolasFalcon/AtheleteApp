import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { LivingHalo, type LivingHaloState } from '@app/components/v2/LivingHalo';
import { EllieActionButton } from '@app/components/v2/EllieActionButton';
import { PressableScale } from '@app/components/v2/PressableScale';
import { Eyebrow, TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type EllieSurfaceProps = {
  message: string;
  eyebrow?: string;
  // `ai`: the action calls the AI → compact Halo action (§22.2).
  action?: { label: string; onPress: () => void; ai?: boolean };
  orbSize?: number;
  orbState?: LivingHaloState;
  style?: StyleProp<ViewStyle>;
};

// Full-bleed band with the Living Halo and ELLIE's voice (17/400, no bubble).
// No radius, border or dividers; only a very soft Ember wash behind it.
export function EllieSurface({
  message,
  eyebrow = 'ELLIE',
  action,
  orbSize = 44,
  orbState = 'idle',
  style,
}: EllieSurfaceProps) {
  const { colors, layout } = useThemeV2();

  return (
    <View style={[styles.band, { paddingHorizontal: layout.gutter }, style]}>
      {/* Background only: on Fabric a padded LinearGradient used as a
          container offsets itself and its children by the padding. */}
      <LinearGradient
        colors={[...colors.ellie.wash]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LivingHalo size={orbSize} state={orbState} />
      <View style={styles.texts}>
        {eyebrow ? (
          <Eyebrow color={colors.ellie.textSecondary}>{eyebrow}</Eyebrow>
        ) : null}
        <TextV2 variant="voice">{message}</TextV2>
        {action?.ai ? (
          <EllieActionButton
            label={action.label}
            variant="compact"
            onPress={action.onPress}
          />
        ) : action ? (
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
