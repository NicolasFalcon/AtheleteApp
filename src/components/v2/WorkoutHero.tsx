import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { TextV2 } from '@app/components/v2/TextV2';
import { SceneScope } from '@app/providers/ThemeProvider';

export type WorkoutHeroStat = { value: string; label: string };

export type WorkoutHeroProps = {
  image: ImageSourcePropType;
  height: number;
  eyebrow: string;
  title: string;
  // Detalle de rutina: trío of figures with dividers.
  stats?: WorkoutHeroStat[];
  // Rutinas: a meta line with a trailing action (play button).
  meta?: string;
  metaTrailing?: ReactNode;
  // Buttons pinned at the top (back / favourite / share).
  top?: ReactNode;
  topOffset?: number;
  // Detail hero darkens to the plate at the bottom (the sheet rises over it).
  variant?: 'detail' | 'card';
  bottomInset?: number;
  // Remote photos are not baked: an extra dark layer (brightness .8).
  dim?: boolean;
  onImageError?: () => void;
  style?: StyleProp<ViewStyle>;
};

// Workout Hero (handoff §5): full-bleed photo with title and figures on top.
// Scene in both modes.
export function WorkoutHero({
  image,
  height,
  eyebrow,
  title,
  stats,
  meta,
  metaTrailing,
  top,
  topOffset = 58,
  variant = 'card',
  bottomInset = 22,
  dim = true,
  onImageError,
  style,
}: WorkoutHeroProps) {
  const detail = variant === 'detail';

  return (
    <SceneScope>
      <View style={[styles.hero, { height }, style]}>
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={image}
            resizeMode="cover"
            style={styles.fill}
            onError={onImageError}
          />
        </View>
        {dim ? <View style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient
              id="heroWarm"
              cx="72%"
              cy="25%"
              rx="70%"
              ry="58%"
              fx="72%"
              fy="25%"
            >
              <Stop offset="0" stopColor="rgb(255,150,90)" stopOpacity={0.1} />
              <Stop offset="0.7" stopColor="rgb(20,19,18)" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroWarm)" />
        </Svg>
        <LinearGradient
          pointerEvents="none"
          colors={
            detail
              ? [
                  'rgba(20,19,18,.5)',
                  'rgba(20,19,18,0)',
                  'rgba(20,19,18,.3)',
                  '#141312',
                ]
              : ['rgba(20,19,18,0)', 'rgba(20,19,18,.92)']
          }
          locations={detail ? [0, 0.3, 0.55, 0.96] : [0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        {top ? (
          <View style={[styles.top, { top: topOffset }]}>{top}</View>
        ) : null}
        <View
          style={[styles.bottom, { bottom: bottomInset, gap: detail ? 14 : 8 }]}
        >
          <TextV2 variant="eyebrow" color="#A8A6A1">
            {eyebrow}
          </TextV2>
          <TextV2
            variant={detail ? 'title24' : 'title22'}
            color="#FFFFFF"
            numberOfLines={2}
            style={detail ? styles.detailTitle : undefined}
          >
            {title}
          </TextV2>
          {meta ? (
            <View style={styles.metaRow}>
              <TextV2
                variant="meta"
                color="#D8D6D1"
                numberOfLines={1}
                style={styles.flex}
              >
                {meta}
              </TextV2>
              {metaTrailing}
            </View>
          ) : null}
          {stats ? (
            <View style={styles.stats}>
              {stats.map((stat, index) => (
                <View key={stat.label} style={styles.statWrap}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View>
                    <TextV2
                      variant="displayS"
                      color="#FFFFFF"
                      style={styles.statValue}
                    >
                      {stat.value}
                    </TextV2>
                    <TextV2 variant="meta" color="#A8A6A1">
                      {stat.label}
                    </TextV2>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#141312',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  dim: {
    backgroundColor: 'rgba(20,19,18,.2)',
  },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  detailTitle: {
    marginTop: -6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
  },
  statWrap: {
    flexDirection: 'row',
  },
  divider: {
    width: 1,
    marginHorizontal: 13,
    backgroundColor: 'rgba(255,255,255,.14)',
  },
  statValue: {
    fontSize: 30,
    letterSpacing: -0.6,
  },
});
