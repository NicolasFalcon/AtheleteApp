import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type EquipmentBubbleProps = {
  label: string;
  count: number;
  icon: LucideIcon;
  image: ImageSourcePropType;
  onPress: () => void;
};

// "Por equipamiento": circular object photo (76) with an icon badge (24).
export function EquipmentBubble({
  label,
  count,
  icon: Icon,
  image,
  onPress,
}: EquipmentBubbleProps) {
  const { colors, mode } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} ejercicios`}
      onPress={onPress}
      style={styles.wrap}
    >
      <View style={styles.circle}>
        <View style={styles.clip}>
          <Image source={image} resizeMode="cover" style={styles.fill} />
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                mode === 'light' ? '#FFFFFF' : colors.surface.raised,
            },
          ]}
        >
          <Icon size={13} color={colors.text.primary} strokeWidth={2} />
        </View>
      </View>
      <TextV2 variant="metaStrong" align="center" style={styles.label}>
        {label}
      </TextV2>
      <TextV2 variant="eyebrow" tone="secondary" style={styles.count}>
        {String(count)}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 78,
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1F1D1B',
    boxShadow: '0 8px 20px rgba(0,0,0,.12)',
  },
  clip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 38,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    lineHeight: 16,
  },
  count: {
    marginTop: -5,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
});
