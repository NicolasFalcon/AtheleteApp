import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Flame, Zap } from 'lucide-react-native';
import {
  IconButton,
  PressableScale,
  StatusBarV2,
  TextV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  categoryPhotoKey,
  challengeStatus,
  ROUND_SIZE,
} from '@app/features/quiz/quizModel';
import { QUIZ_PHOTOS } from '@app/features/quiz/v2/QuizParts';
import { useQuizOverview } from '@app/hooks/useQuiz';
import { SceneScope } from '@app/providers/ThemeProvider';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';
import type { QuizCategoryPreview } from '@app/types/quiz';

type Props = AppScreenProps<'QuizChallenge'>;

// Quiz · inicio de desafío (QUIZ_02): the category full screen with the
// record, the rules of the streak in two lines and "Empezar" in Ember. A
// scene: dark in both modes.
export function QuizChallengeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { categoryId, categoryName, categoryIcon } = route.params;
  const dev = __DEV__ ? route.params.devState : undefined;
  const overviewQuery = useQuizOverview();

  const sample = useMemo(() => {
    if (!__DEV__ || !dev) {
      return null;
    }
    const fixtures = require('@app/dev/quizFixtures') as typeof import('@app/dev/quizFixtures');
    return fixtures.quizOverviewFixture(dev === 'record' ? 'data' : 'new');
  }, [dev]);

  const categories = (sample ?? overviewQuery.data)?.categories;
  const index = categories?.findIndex(item => item.id === categoryId) ?? -1;
  const category: QuizCategoryPreview | undefined =
    index >= 0 ? categories?.[index] : undefined;
  const photo = categoryPhotoKey(
    { slug: category?.slug, name: categoryName },
    Math.max(index, 0),
  );
  const status = category ? challengeStatus(category) : null;
  const questions = category ? Math.min(category.questionCount, ROUND_SIZE) : ROUND_SIZE;
  const noQuestions = Boolean(category) && category?.questionCount === 0;

  const start = () =>
    navigation.navigate(APP_ROUTES.QuizQuestion, {
      categoryId,
      categoryName,
      categoryIcon,
    });

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <Image source={QUIZ_PHOTOS[photo]} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(20,19,18,.55)', 'rgba(20,19,18,.1)', 'rgba(20,19,18,.8)', '#141312']}
          locations={[0, 0.3, 0.62, 0.9]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <IconButton
            icon={ArrowLeft}
            variant="glass"
            accessibilityLabel="Volver"
            onPress={() => safeGoBack(navigation, [APP_ROUTES.QuizLanding])}
          />
        </View>

        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <View style={styles.head}>
            <TextV2 variant="eyebrow" color="#FF8A5C" style={styles.eyebrow}>
              {`DESAFÍO · ${status?.eyebrow ?? 'QUIZ'}`}
            </TextV2>
            <TextV2 variant="title28" color="#FFFFFF" style={styles.name} accessibilityRole="header">
              {categoryName}
            </TextV2>
            <TextV2 variant="bodyL" color="#D8D6D1">
              {category?.description || 'Demuestra lo que sabes y supera tu récord.'}
            </TextV2>
          </View>

          <View style={styles.trio}>
            <Stat value={String(questions)} label="preguntas" />
            <View style={styles.rule} />
            <Stat value={status?.best ?? '–'} label="tu récord" />
            <View style={styles.rule} />
            <Stat value="×3" label="multiplicador máx." ember />
          </View>

          <View style={styles.rules}>
            <View style={styles.ruleLine}>
              <Flame size={14} color="rgba(255,255,255,.7)" strokeWidth={2} />
              <TextV2 variant="meta" color="#D8D6D1">
                3 aciertos seguidos: cada punto vale ×2
              </TextV2>
            </View>
            <View style={styles.ruleLine}>
              <Zap size={14} color="rgba(255,255,255,.7)" strokeWidth={2} />
              <TextV2 variant="meta" color="#D8D6D1">
                5 seguidos: ×3. Un fallo reinicia la racha.
              </TextV2>
            </View>
          </View>

          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: noQuestions }}
            disabled={noQuestions}
            onPress={start}
            style={[styles.cta, { opacity: noQuestions ? 0.5 : 1 }]}
          >
            <TextV2 variant="sub" color="#121212" style={styles.ctaText}>
              {noQuestions ? 'Sin preguntas todavía' : 'Empezar'}
            </TextV2>
            {noQuestions ? null : <ArrowRight size={18} color="#121212" strokeWidth={2.4} />}
          </PressableScale>
        </View>
      </View>
    </SceneScope>
  );
}

function Stat({ value, label, ember }: { value: string; label: string; ember?: boolean }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <TextV2 variant="title24" color={ember ? '#FF5B1F' : '#FFFFFF'}>
        {value}
      </TextV2>
      <TextV2 variant="caption" color="#8C8A85">
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141312' },
  top: { paddingHorizontal: 16, alignItems: 'flex-start' },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, gap: 22 },
  head: { gap: 6 },
  eyebrow: { fontWeight: '700' },
  name: { fontSize: 32, lineHeight: 36, fontWeight: '600', letterSpacing: -0.64 },
  trio: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  stat: { flex: 1 },
  rule: { width: 1, backgroundColor: 'rgba(255,255,255,.12)' },
  rules: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  ruleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: {
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF5B1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: { fontSize: 18, fontWeight: '700' },
});
