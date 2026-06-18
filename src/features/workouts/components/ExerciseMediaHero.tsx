import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Heart, Pause, Play } from 'lucide-react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ExerciseMediaHeroProps = {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  title: string;
  height: number;
  isFavorite: boolean;
  topInset: number;
  onBack: () => void;
  onToggleFavorite: () => void;
};

export function ExerciseMediaHero({
  videoUrl,
  thumbnailUrl,
  imageUrl,
  title,
  height,
  isFavorite,
  topInset,
  onBack,
  onToggleFavorite,
}: ExerciseMediaHeroProps) {
  const { theme } = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const posterUrl = thumbnailUrl || imageUrl || null;
  const canPreviewVideo = Boolean(videoUrl);
  const shouldShowImage = Boolean(posterUrl && !imageFailed);

  const styles = StyleSheet.create({
    hero: {
      height,
      backgroundColor: theme.colors.surfaceMuted,
    },
    media: {
      width: '100%',
      height: '100%',
    },
    fallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceMuted,
    },
    fallbackTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
    },
    fallbackLabel: {
      marginTop: theme.spacing.xs,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      textAlign: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.14)',
    },
    actionButton: {
      position: 'absolute',
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.86)',
      shadowColor: '#000000',
      ...theme.elevations.subtle,
    },
    backButton: {
      left: theme.spacing.lg,
    },
    favoriteButton: {
      right: theme.spacing.lg,
    },
    playButton: {
      position: 'absolute',
      alignSelf: 'center',
      top: '50%',
      width: 76,
      height: 76,
      marginTop: -38,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.9)',
      shadowColor: '#000000',
      ...theme.elevations.prominent,
    },
  });

  return (
    <View style={styles.hero}>
      {shouldShowImage && posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.media}
          resizeMode="cover"
          accessibilityLabel={title}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Vista previa</Text>
          <Text style={styles.fallbackLabel}>Media no disponible todavía</Text>
        </View>
      )}

      <View pointerEvents="none" style={styles.overlay} />

      <Pressable
        onPress={onBack}
        style={[styles.actionButton, styles.backButton, { top: 20 }]}
      >
        <ArrowLeft
          color={theme.colors.textPrimary}
          size={18}
          strokeWidth={2.2}
        />
      </Pressable>

      <Pressable
        onPress={onToggleFavorite}
        style={[
          styles.actionButton,
          styles.favoriteButton,
          { top: 20 },
        ]}
      >
        <Heart
          color={theme.colors.textPrimary}
          fill={isFavorite ? theme.colors.textPrimary : 'transparent'}
          size={18}
          strokeWidth={2.2}
        />
      </Pressable>

      {canPreviewVideo ? (
        <Pressable
          onPress={() => {
            // TODO(video): connect this state to the final native video player.
            setIsPlayingPreview(current => !current);
          }}
          style={({ pressed }) => [
            styles.playButton,
            pressed ? { transform: [{ scale: 0.97 }] } : null,
          ]}
        >
          {isPlayingPreview ? (
            <Pause color={theme.colors.textPrimary} size={28} fill="none" />
          ) : (
            <Play color={theme.colors.textPrimary} size={30} fill="none" />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
