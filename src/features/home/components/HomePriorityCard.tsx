import type { LucideIcon } from 'lucide-react-native';
import { ArrowRight } from 'lucide-react-native';
import {
  ImageBackground,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProgressBar } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type HomePriorityCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  progress: number;
  progressLabel: string;
  ctaLabel: string;
  Icon: LucideIcon;
  backgroundSource: ImageSourcePropType;
  overlayOpacity?: number;
  onPress: () => void;
};

export function HomePriorityCard({
  eyebrow,
  title,
  description,
  progress,
  progressLabel,
  ctaLabel,
  Icon,
  backgroundSource,
  overlayOpacity = 0.68,
  onPress,
}: HomePriorityCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <ImageBackground
      imageStyle={styles.backgroundImage}
      source={backgroundSource}
      style={styles.card}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
        ]}
      />
      <View style={styles.sideShade} />
      <View style={styles.halo} />
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.content,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.iconBox}>
            <Icon color="#FFFFFF" size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>PRIORIDAD</Text>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
            <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
          </View>
          <ProgressBar
            color="#FFFFFF"
            max={100}
            trackColor="rgba(255,255,255,0.2)"
            value={progress}
          />
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
          <ArrowRight color="#111111" size={17} strokeWidth={2.3} />
        </View>
      </Pressable>
    </ImageBackground>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      minHeight: 218,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
      backgroundColor: '#0A0A0A',
      shadowColor: '#000000',
      ...theme.elevations.prominent,
    },
    backgroundImage: {
      borderRadius: theme.radii.lg,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
    },
    sideShade: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '72%',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    halo: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      right: -54,
      top: -72,
      backgroundColor: 'rgba(255,255,255,0.055)',
    },
    content: {
      flex: 1,
      minHeight: 218,
      padding: 18,
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }],
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    badge: {
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.2)',
      backgroundColor: 'rgba(0,0,0,0.2)',
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    badgeLabel: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 0.8,
    },
    copy: {
      gap: 4,
    },
    eyebrow: {
      color: 'rgba(255,255,255,0.72)',
      opacity: 0.68,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.semibold,
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: theme.typography.weights.bold,
    },
    description: {
      color: 'rgba(255,255,255,0.72)',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 19,
    },
    progressBlock: {
      gap: 7,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressLabel: {
      color: 'rgba(255,255,255,0.68)',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    progressValue: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    cta: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: theme.radii.pill,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    ctaLabel: {
      color: '#111111',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.bold,
    },
  });
}
