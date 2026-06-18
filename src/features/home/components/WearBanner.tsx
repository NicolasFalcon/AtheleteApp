import { ArrowRight } from 'lucide-react-native';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { atheleteWearEditorial } from '@app/assets/images';
import { useAppTheme } from '@app/hooks/useAppTheme';

type WearBannerProps = {
  onPress: () => void;
};

export function WearBanner({ onPress }: WearBannerProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    shell: {
      borderRadius: theme.radii.md,
      shadowColor: '#000000',
      ...theme.elevations.prominent,
    },
    clip: {
      borderRadius: theme.radii.md,
      overflow: 'hidden',
    },
    background: {
      minHeight: 92,
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.58)',
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    textWrap: {
      flex: 1,
    },
    label: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 1.1,
    },
    title: {
      marginTop: 4,
      color: 'rgba(255,255,255,0.7)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    cta: {
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 10,
      backgroundColor: 'rgba(255,255,255,0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ctaLabel: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.shell}>
      <ImageBackground
        source={atheleteWearEditorial}
        imageStyle={styles.clip}
        style={styles.clip}
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <View style={styles.textWrap}>
            <Text style={styles.label}>ATHELETE WEAR</Text>
            <Text style={styles.title}>
              Diseñado para entrenar. Hecho para durar.
            </Text>
          </View>
          <Pressable onPress={onPress} style={styles.cta}>
            <Text style={styles.ctaLabel}>Ver colección</Text>
            <ArrowRight color="#FFFFFF" size={14} strokeWidth={2.2} />
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}
