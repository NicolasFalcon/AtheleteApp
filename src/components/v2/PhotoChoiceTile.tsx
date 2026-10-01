import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { haptics } from '@app/components/v2/haptics';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type PhotoChoiceTileProps = {
  title: string;
  subtitle?: string;
  photo: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

// Answer tile with a photo (onboarding goal): 196 pt, radius 22, scrim from
// 38 % to .9, title 17/600 + subtitle 13 on the photo. Selected: 3 pt ring in
// the primary ink and an Ember check that pops in.
export function PhotoChoiceTile({
  title,
  subtitle,
  photo,
  selected,
  onPress,
  height = 196,
  style,
}: PhotoChoiceTileProps) {
  const { colors, scene } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[
        styles.tile,
        {
          height,
          backgroundColor: scene.plate,
          boxShadow: selected ? `0 0 0 3px ${colors.text.primary}` : undefined,
        },
        style,
      ]}
    >
      <View style={styles.clip}>
        <Image source={photo} resizeMode="cover" style={styles.photo} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.9)']}
          locations={[0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
        {selected ? (
          <Animated.View
            entering={ZoomIn.duration(400)}
            style={[styles.check, { backgroundColor: colors.ember.base }]}
          >
            <Check color={colors.ember.onText} size={15} strokeWidth={2.5} />
          </Animated.View>
        ) : null}
        <View style={styles.texts}>
          <TextV2 variant="cta" color={scene.onDark.primary}>
            {title}
          </TextV2>
          {subtitle ? (
            <TextV2 variant="meta" color={scene.onDark.secondary}>
              {subtitle}
            </TextV2>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 22,
  },
  clip: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  check: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    gap: 3,
  },
});
