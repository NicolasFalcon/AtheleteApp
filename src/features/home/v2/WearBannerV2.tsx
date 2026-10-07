import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import { SceneScope } from '@app/providers/ThemeProvider';

// ATHELETE Wear banner (Home.dc.html). Wear is ATHELETE's upcoming clothing
// line (an announcement, not a device or a connection). The photo fades to the plate with a
// gradient instead of the prototype's mask-image.
export function WearBannerV2({ onPress }: { onPress: () => void }) {
  return (
    <SceneScope>
      <WearContent onPress={onPress} />
    </SceneScope>
  );
}

function WearContent({ onPress }: { onPress: () => void }) {
  const { radius, scene } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="ATHELETE Wear, la próxima línea de ropa. Próximamente."
      onPress={onPress}
      style={[
        styles.card,
        { borderRadius: radius.card, backgroundColor: scene.plate },
      ]}
    >
      <View style={styles.photoBox}>
        <Image
          source={HOME_PHOTOS.wear}
          resizeMode="cover"
          style={styles.photo}
        />
        <LinearGradient
          colors={[scene.plate, 'rgba(20,19,18,0)']}
          locations={[0, 0.55]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="wearGlow"
            cx="100%"
            cy="0%"
            rx="120%"
            ry="90%"
            fx="100%"
            fy="0%"
          >
            <Stop offset="0" stopColor="rgb(255,91,31)" stopOpacity={0.1} />
            <Stop offset="0.55" stopColor="rgb(255,91,31)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wearGlow)" />
      </Svg>
      <View style={styles.content}>
        <View style={styles.brand}>
          <TextV2 variant="wordmark">ATHELETE</TextV2>
          <View
            style={[styles.rule, { backgroundColor: scene.onDark.tertiary }]}
          />
          <TextV2 variant="wordmark" tone="tertiary" style={styles.wear}>
            WEAR
          </TextV2>
        </View>
        <View style={styles.bottom}>
          <TextV2 variant="title24" style={styles.title}>
            Hecho para durar.
          </TextV2>
          <View
            style={[
              styles.link,
              { borderBottomColor: scene.glass.onPhotoStrong },
            ]}
          >
            <TextV2 variant="metaStrong">Próximamente</TextV2>
            <ArrowRight
              size={13}
              color={scene.onDark.primary}
              strokeWidth={2}
            />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 156,
    overflow: 'hidden',
    marginBottom: 12,
  },
  photoBox: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '72%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    left: 20,
    right: 20,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rule: {
    width: 14,
    height: StyleSheet.hairlineWidth * 2,
  },
  wear: {
    fontWeight: '500',
  },
  bottom: {
    gap: 12,
  },
  title: {
    maxWidth: 190,
  },
  link: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
  },
});
