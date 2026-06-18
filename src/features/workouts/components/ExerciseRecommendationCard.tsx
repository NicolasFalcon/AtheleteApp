import { ChevronRight, Heart } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  bodyPartLabels,
  equipmentLabels,
  type LibraryExercise,
} from '@app/shared';

type ExerciseRecommendationCardProps = {
  exercise: LibraryExercise;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

export function ExerciseRecommendationCard({
  exercise,
  isFavorite,
  onToggleFavorite,
  onPress,
}: ExerciseRecommendationCardProps) {
  const { theme } = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [exercise.id, exercise.thumbnailUrl]);

  const styles = StyleSheet.create({
    card: {
      width: 190,
      borderRadius: theme.radii.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.elevations.card,
    },
    imageWrap: {
      height: 116,
      backgroundColor: theme.colors.surfaceMuted,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    fallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    favorite: {
      position: 'absolute',
      top: 9,
      right: 9,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(17,17,17,0.48)',
    },
    body: {
      padding: 11,
      gap: 5,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 9,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: theme.typography.weights.semibold,
      minHeight: 38,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 5,
    },
    meta: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? { transform: [{ scale: 0.985 }] } : null,
      ]}
    >
      <View style={styles.imageWrap}>
        {exercise.thumbnailUrl && !imageFailed ? (
          <Image
            source={{ uri: exercise.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackLabel}>Sin imagen</Text>
          </View>
        )}
        <Pressable
          onPress={event => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          style={styles.favorite}
        >
          <Heart
            color="#FFFFFF"
            fill={isFavorite ? '#FFFFFF' : 'transparent'}
            size={16}
            strokeWidth={2}
          />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>
          {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
        </Text>
        <Text numberOfLines={2} style={styles.title}>
          {exercise.name}
        </Text>
        <View style={styles.footer}>
          <Text numberOfLines={1} style={styles.meta}>
            {equipmentLabels[exercise.equipment] || exercise.equipment}
          </Text>
          <ChevronRight color={theme.colors.textSecondary} size={14} />
        </View>
      </View>
    </Pressable>
  );
}
