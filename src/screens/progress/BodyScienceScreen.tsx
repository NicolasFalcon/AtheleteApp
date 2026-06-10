import {useMemo} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {BookOpen} from 'lucide-react-native';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {EmptyState} from '@app/components/ui';
import {PROGRESS_ROUTES} from '@app/constants/routes';
import {getBodyScienceArticleImage} from '@app/features/body-science/articleImages';
import {BodyScienceArticleCard} from '@app/features/body-science/components/BodyScienceArticleCard';
import {
  bodyScienceArticles,
  categoryCaptions,
  categoryDisplayNames,
  featuredArticleIds,
} from '@app/features/body-science/bodyScienceData';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {ProgressStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<ProgressStackParamList, 'BodyScience'>;

const categoryOrder = ['Training', 'Recovery', 'Nutrition', 'Mindset'] as const;

export function BodyScienceScreen({navigation}: Props) {
  const {theme} = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();

  const featuredArticle = bodyScienceArticles.find(
    article => article.id === featuredArticleIds[0],
  );

  const articlesByCategory = useMemo(
    () =>
      categoryOrder.map(category => ({
        category,
        articles: bodyScienceArticles.filter(article => article.category === category),
      })),
    [],
  );

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: tabBarHeight + theme.spacing.md,
      gap: theme.spacing.lg,
    },
    header: {
      gap: 6,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 24,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    categorySection: {
      gap: 10,
    },
    categoryTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    categoryCaption: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    list: {
      gap: 10,
    },
  });

  const openArticle = (articleId: string) => {
    navigation.navigate(PROGRESS_ROUTES.BodyScienceArticle, {articleId});
  };

  if (!featuredArticle || bodyScienceArticles.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            title="Sin artículos disponibles"
            description="La biblioteca educativa aparecerá aquí cuando haya contenido publicado."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BookOpen color={theme.colors.textPrimary} size={22} strokeWidth={2.1} />
            <Text style={styles.title}>Ciencia del cuerpo</Text>
          </View>
          <Text style={styles.subtitle}>
            Aprende cómo tu entrenamiento, recuperación y nutrición trabajan juntos.
          </Text>
        </View>

        <BodyScienceArticleCard
          article={featuredArticle}
          imageSource={getBodyScienceArticleImage(featuredArticle.category, true)}
          variant="hero"
          onPress={() => openArticle(featuredArticle.id)}
        />

        {articlesByCategory.map(({category, articles}) => (
          <View key={category} style={styles.categorySection}>
            <View>
              <Text style={styles.categoryTitle}>
                {categoryDisplayNames[category] || category}
              </Text>
              <Text style={styles.categoryCaption}>
                {categoryCaptions[category]}
              </Text>
            </View>
            <View style={styles.list}>
              {articles.map(article => (
                <BodyScienceArticleCard
                  key={article.id}
                  article={article}
                  imageSource={getBodyScienceArticleImage(article.category)}
                  onPress={() => openArticle(article.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
