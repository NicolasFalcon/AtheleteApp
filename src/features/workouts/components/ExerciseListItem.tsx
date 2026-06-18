import { useEffect, useState } from 'react';
import { ChevronRight, Dumbbell, Heart, Target } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  bodyPartLabels,
  equipmentLabels,
  levelLabels,
  type LibraryExercise,
} from '@app/shared';

type ExerciseListItemProps = {
  exercise: LibraryExercise;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

export function ExerciseListItem({
  exercise,
  isFavorite,
  onToggleFavorite,
  onPress,
}: ExerciseListItemProps) {
  const { theme } = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [exercise.id, exercise.thumbnailUrl]);

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      gap: 10,
      overflow: 'hidden',
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    imageWrap: {
      width: 76,
      height: 82,
      flexShrink: 0,
      alignSelf: 'flex-start',
      borderRadius: theme.radii.sm,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    fallbackLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    titleCopy: {
      flex: 1,
      minWidth: 0,
    },
    levelBadge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginBottom: 2,
    },
    levelLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 9,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 19,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 1,
    },
    footerLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    favoriteButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
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
          <Text style={styles.fallbackLabel}>Sin imagen</Text>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelLabel}>
                {levelLabels[exercise.level] || exercise.level}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.title}>
              {exercise.name}
            </Text>
          </View>
          <Pressable
            onPress={event => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            style={styles.favoriteButton}
          >
            <Heart
              color={
                isFavorite
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary
              }
              fill={isFavorite ? theme.colors.textPrimary : 'transparent'}
              size={16}
              strokeWidth={2}
            />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Dumbbell
              color={theme.colors.textSecondary}
              size={14}
              strokeWidth={2}
            />
            <Text style={styles.metaLabel}>
              {equipmentLabels[exercise.equipment] || exercise.equipment}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Target
              color={theme.colors.textSecondary}
              size={14}
              strokeWidth={2}
            />
            <Text style={styles.metaLabel}>
              {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Ver técnica</Text>
          <ChevronRight color={theme.colors.textSecondary} size={16} />
        </View>
      </View>
    </Pressable>
  );
}
