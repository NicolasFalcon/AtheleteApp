import { ArrowLeft, Clock3 } from 'lucide-react-native';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Button, EmptyState } from '@app/components/ui';
import { APP_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { getBodyScienceArticleImage } from '@app/features/body-science/articleImages';
import { BodyScienceCategoryBadge } from '@app/features/body-science/components/BodyScienceCategoryBadge';
import { BodyScienceRichContent } from '@app/features/body-science/components/BodyScienceRichContent';
import { bodyScienceArticles } from '@app/features/body-science/bodyScienceData';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'BodyScienceArticle'>;

export function BodyScienceArticleDetailScreen({navigation, route}: Props) {
  const handleSafeBack = () =>
    safeGoBack(navigation, [
      APP_ROUTES.BodyScience,
      tabFallback(TAB_ROUTES.Progress),
    ]);
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const article =
    bodyScienceArticles.find(item => item.id === route.params.articleId) || null;

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    hero: {
      height: 260,
      backgroundColor: theme.colors.surfaceMuted,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.32)',
    },
    backButton: {
      position: 'absolute',
      left: theme.spacing.lg,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(17,17,17,0.4)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.16)',
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    articleHeader: {
      marginTop: -28,
      borderRadius: 28,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
      gap: 12,
      marginBottom: theme.spacing.lg,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 25,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 31,
      letterSpacing: -0.7,
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    readTime: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    readTimeLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    missingWrap: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
  });

  if (!article) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingWrap}>
          <EmptyState
            title="Artículo no encontrado"
            description="No pudimos encontrar este contenido en Ciencia del cuerpo."
          />
          <Button label="Volver" onPress={handleSafeBack} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={getBodyScienceArticleImage(article.category, true)}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <Pressable
            onPress={handleSafeBack}
            style={[styles.backButton, {top: insets.top + 10}]}>
            <ArrowLeft color="#FFFFFF" size={18} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.articleHeader}>
            <View style={styles.metaRow}>
              <BodyScienceCategoryBadge category={article.category} />
              <View style={styles.readTime}>
                <Clock3
                  color={theme.colors.textSecondary}
                  size={13}
                  strokeWidth={2}
                />
                <Text style={styles.readTimeLabel}>
                  {article.readTimeMinutes} min de lectura
                </Text>
              </View>
            </View>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.summary}>{article.summary}</Text>
          </View>

          <BodyScienceRichContent content={article.content} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
