import {useMemo} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppHeader} from '@app/components';
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
  const insets = useSafeAreaInsets();

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
      paddingBottom: insets.bottom + theme.spacing.lg,
      gap: theme.spacing.lg,
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
        <AppHeader
          showBackButton
          title="Ciencia del cuerpo"
          backFallbacks={[PROGRESS_ROUTES.Progress]}
        />

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
