import {useEffect, useState} from 'react';
import {ChevronRight, Dumbbell, Heart, Target} from 'lucide-react-native';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
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
  const {theme} = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [exercise.id, exercise.thumbnailUrl]);

  const styles = StyleSheet.create({
    card: {
      borderRadius: 28,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 14,
      overflow: 'hidden',
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    imageWrap: {
      width: 86,
      height: 92,
      flexShrink: 0,
      alignSelf: 'flex-start',
      borderRadius: 24,
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
      gap: 8,
    },
    levelLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 2.2,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: -0.4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    footerLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    favoriteButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        pressed ? {transform: [{scale: 0.99}]} : null,
      ]}>
      <View style={styles.imageWrap}>
        {exercise.thumbnailUrl && !imageFailed ? (
          <Image
            source={{uri: exercise.thumbnailUrl}}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={styles.fallbackLabel}>Sin imagen</Text>
        )}
      </View>
      <View style={styles.content}>
        <View>
          <Text style={styles.levelLabel}>
            {levelLabels[exercise.level] || exercise.level}
          </Text>
          <Text numberOfLines={2} style={styles.title}>
            {exercise.name}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Dumbbell color={theme.colors.textSecondary} size={14} strokeWidth={2} />
            <Text style={styles.metaLabel}>
              {equipmentLabels[exercise.equipment] || exercise.equipment}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Target color={theme.colors.textSecondary} size={14} strokeWidth={2} />
            <Text style={styles.metaLabel}>
              {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Ver técnica y detalles</Text>
          <ChevronRight color={theme.colors.textSecondary} size={18} />
        </View>
      </View>
      <Pressable
        onPress={event => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        style={styles.favoriteButton}>
        <Heart
          color={isFavorite ? theme.colors.textPrimary : theme.colors.textSecondary}
          fill={isFavorite ? theme.colors.textPrimary : 'transparent'}
          size={18}
          strokeWidth={2}
        />
      </Pressable>
    </Pressable>
  );
}
