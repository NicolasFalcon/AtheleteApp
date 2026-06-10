import {BookOpen, ChevronRight, Clock3} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BodyScienceCategoryBadge} from '@app/features/body-science/components/BodyScienceCategoryBadge';
import {
  bodyScienceArticles,
  featuredArticleIds,
} from '@app/features/body-science/bodyScienceData';
import {useAppTheme} from '@app/hooks/useAppTheme';

type BodyScienceProgressCardProps = {
  onOpenArticle: (articleId: string) => void;
  onOpenLibrary: () => void;
};

export function BodyScienceProgressCard({
  onOpenArticle,
  onOpenLibrary,
}: BodyScienceProgressCardProps) {
  const {theme} = useAppTheme();
  const featured = featuredArticleIds
    .map(id => bodyScienceArticles.find(article => article.id === id))
    .filter(Boolean)
    .slice(0, 3);

  const styles = StyleSheet.create({
    card: {
      borderRadius: 28,
      padding: 16,
      gap: 13,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    openButton: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    openLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    list: {
      gap: 8,
    },
    row: {
      borderRadius: 18,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowMetaText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <BookOpen
              color={theme.colors.textPrimary}
              size={18}
              strokeWidth={2.1}
            />
            <Text style={styles.title}>Ciencia del cuerpo</Text>
          </View>
          <Text style={styles.subtitle}>
            Aprende cómo entrenamiento, recuperación y nutrición explican tu progreso.
          </Text>
        </View>
        <Pressable
          onPress={onOpenLibrary}
          style={({pressed}) => [styles.openButton, pressed ? {opacity: 0.86} : null]}>
          <Text style={styles.openLabel}>Ver todo</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {featured.map(article => (
          <Pressable
            key={article!.id}
            onPress={() => onOpenArticle(article!.id)}
            style={({pressed}) => [styles.row, pressed ? {opacity: 0.88} : null]}>
            <View style={styles.rowContent}>
              <BodyScienceCategoryBadge category={article!.category} compact />
              <Text numberOfLines={1} style={styles.rowTitle}>
                {article!.title}
              </Text>
              <View style={styles.rowMeta}>
                <Clock3
                  color={theme.colors.textSecondary}
                  size={12}
                  strokeWidth={2}
                />
                <Text style={styles.rowMetaText}>
                  {article!.readTimeMinutes} min de lectura
                </Text>
              </View>
            </View>
            <ChevronRight
              color={theme.colors.textSecondary}
              size={18}
              strokeWidth={2}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
