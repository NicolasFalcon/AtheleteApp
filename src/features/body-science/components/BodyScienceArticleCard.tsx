import {BookOpen, ChevronRight, Clock3} from 'lucide-react-native';
import {Image, ImageSourcePropType, Pressable, StyleSheet, Text, View} from 'react-native';
import {BodyScienceCategoryBadge} from '@app/features/body-science/components/BodyScienceCategoryBadge';
import type {BodyScienceArticle} from '@app/features/body-science/bodyScienceData';
import {useAppTheme} from '@app/hooks/useAppTheme';

type BodyScienceArticleCardProps = {
  article: BodyScienceArticle;
  imageSource: ImageSourcePropType;
  onPress: () => void;
  variant?: 'hero' | 'row';
};

export function BodyScienceArticleCard({
  article,
  imageSource,
  onPress,
  variant = 'row',
}: BodyScienceArticleCardProps) {
  const {theme} = useAppTheme();
  const isHero = variant === 'hero';

  const styles = StyleSheet.create({
    heroCard: {
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    heroImage: {
      width: '100%',
      height: 190,
    },
    heroOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      backgroundColor: 'rgba(0,0,0,0.48)',
      gap: 8,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 25,
      letterSpacing: -0.4,
    },
    heroSummary: {
      color: 'rgba(255,255,255,0.76)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    rowCard: {
      borderRadius: 24,
      padding: 12,
      flexDirection: 'row',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    rowImage: {
      width: 86,
      height: 104,
      borderRadius: 18,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
      gap: 7,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    rowSummary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    action: {
      color: isHero ? '#FFFFFF' : theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  if (isHero) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [styles.heroCard, pressed ? {opacity: 0.92} : null]}>
        <Image source={imageSource} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay}>
          <BodyScienceCategoryBadge category={article.category} compact />
          <Text numberOfLines={2} style={styles.heroTitle}>{article.title}</Text>
          <Text numberOfLines={2} style={styles.heroSummary}>{article.summary}</Text>
          <View style={styles.actionRow}>
            <Text style={styles.action}>Leer ahora</Text>
            <ChevronRight color="#FFFFFF" size={14} strokeWidth={2.2} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.rowCard, pressed ? {opacity: 0.92} : null]}>
      <Image source={imageSource} style={styles.rowImage} resizeMode="cover" />
      <View style={styles.rowContent}>
        <BodyScienceCategoryBadge category={article.category} compact />
        <Text numberOfLines={2} style={styles.rowTitle}>{article.title}</Text>
        <Text numberOfLines={2} style={styles.rowSummary}>{article.summary}</Text>
        <View style={styles.metaRow}>
          <Clock3 color={theme.colors.textSecondary} size={12} strokeWidth={2} />
          <Text style={styles.meta}>{article.readTimeMinutes} min de lectura</Text>
          <BookOpen color={theme.colors.textSecondary} size={12} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}
