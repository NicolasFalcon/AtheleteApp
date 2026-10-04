import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Flame, Play, Zap } from 'lucide-react-native';
import {
  PressableScale,
  ProgressRing,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  challengeStatus,
  type HistoryRow,
  type QuizMasterProgress,
  type QuizPhotoKey,
  type WeekDay,
} from '@app/features/quiz/quizModel';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import type { QuizCategoryPreview } from '@app/types/quiz';

// PLACEHOLDER photos of the handoff package with the Quiz treatment baked in
// (saturate .4 · contrast 1.08 · brightness .7).
export const QUIZ_PHOTOS: Record<QuizPhotoKey, ImageSourcePropType> = {
  nutrition: require('@app/assets/v2/photos/quiz/nutrition.jpg'),
  training: require('@app/assets/v2/photos/quiz/training.jpg'),
  recovery: require('@app/assets/v2/photos/quiz/recovery.jpg'),
};

export type QuizCategoryView = {
  category: QuizCategoryPreview;
  photo: QuizPhotoKey;
};

// "TUS PUNTOS" and the figure.
export function PointsFigure({ points }: { points: number | null }) {
  return (
    <View style={styles.pointsBlock}>
      <TextV2 variant="eyebrow" tone="secondary">
        Tus puntos
      </TextV2>
      <TextV2 variant="displayS" accessibilityLabel={`${points ?? 0} puntos`}>
        {points === null ? '—' : formatThousands(points)}
      </TextV2>
    </View>
  );
}

// Week of play: seven dots (Ember = played), today ringed in ink.
export function WeekDots({ days, line }: { days: WeekDay[]; line: string }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.week} accessible accessibilityLabel={line}>
      <View style={styles.dots}>
        {days.map((day, index) => (
          <View key={index} style={styles.dotCell}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: day.played ? colors.ember.base : 'transparent',
                  boxShadow: day.today
                    ? `0 0 0 2px ${colors.bg}, 0 0 0 3.5px ${colors.text.primary}`
                    : day.played
                    ? 'none'
                    : `inset 0 0 0 1.5px ${colors.outline.strong}`,
                },
              ]}
            />
            <TextV2 variant="micro" tone="tertiary" style={styles.dotLabel}>
              {day.label}
            </TextV2>
          </View>
        ))}
      </View>
      <TextV2 variant="caption" tone="secondary">
        {line}
      </TextV2>
    </View>
  );
}

// Hero of the portada: the challenge of the day over its photo.
export function DailyChallengeCard({
  view,
  rounds,
  onPress,
}: {
  view: QuizCategoryView;
  // Questions of a round.
  rounds: number;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const status = challengeStatus(view.category);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Desafío del día: ${view.category.name}. Jugar`}
      onPress={onPress}
      style={[styles.daily, { backgroundColor: '#141312' }]}
    >
      <Image
        source={QUIZ_PHOTOS[view.photo]}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(20,19,18,.2)', 'rgba(20,19,18,.15)', 'rgba(20,19,18,.94)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,91,31,.22)', 'rgba(255,91,31,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.pill, { backgroundColor: colors.ember.base }]}>
        <Zap size={12} color={colors.ember.onText} strokeWidth={2.4} />
        <TextV2 variant="micro" color={colors.ember.onText} style={styles.pillText}>
          DESAFÍO DEL DÍA
        </TextV2>
      </View>
      <View style={styles.dailyBottom}>
        <View style={styles.dailyText}>
          <TextV2 variant="title26" color="#FFFFFF">
            {view.category.name}
          </TextV2>
          <TextV2 variant="body" color="#D8D6D1">
            {`${rounds} preguntas · unos 2 minutos · ${
              status.best ? `tu récord ${status.best}` : 'aún sin récord'
            }`}
          </TextV2>
        </View>
        <View style={styles.dailyFoot}>
          <View style={styles.rule}>
            <Flame size={14} color="rgba(255,255,255,.7)" strokeWidth={2} />
            <TextV2 variant="meta" color="#A8A6A1">
              Racha ×2 desde 3 aciertos
            </TextV2>
          </View>
          <View style={styles.play}>
            <TextV2 variant="cta" color="#121212">
              Jugar
            </TextV2>
            <Play size={15} color="#121212" fill="#121212" strokeWidth={2} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

// One challenge: photo, the record in a ring, status and the goal line.
export function ChallengeCard({
  view,
  onPress,
}: {
  view: QuizCategoryView;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const status = challengeStatus(view.category);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${view.category.name}. ${status.goal}`}
      onPress={onPress}
      style={styles.challenge}
    >
      <View style={styles.challengePhoto}>
        <Image
          source={QUIZ_PHOTOS[view.photo]}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(20,19,18,.1)', 'rgba(20,19,18,.88)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ProgressRing
          size={48}
          strokeWidth={4}
          progress={status.ratio}
          fillColor="rgba(20,19,18,.55)"
          style={styles.ring}
        >
          <TextV2 variant="label" color="#FFFFFF">
            {status.figure}
          </TextV2>
        </ProgressRing>
        <View style={styles.challengeText}>
          <TextV2
            variant="eyebrow"
            color={status.kind === 'perfect' ? colors.ember.textOnDark : '#A8A6A1'}
          >
            {status.eyebrow}
          </TextV2>
          <TextV2 variant="sub" color="#FFFFFF" numberOfLines={2}>
            {view.category.name}
          </TextV2>
        </View>
      </View>
      <TextV2 variant="meta" tone="secondary" numberOfLines={1} style={styles.goal}>
        {status.goal}
      </TextV2>
    </PressableScale>
  );
}

// "Desafíos": horizontal strip of cards that bleeds to the edges.
export function ChallengeStrip({
  views,
  onOpen,
}: {
  views: QuizCategoryView[];
  onOpen: (category: QuizCategoryPreview) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.stripBleed}
    >
      {views.map(view => (
        <ChallengeCard
          key={view.category.id}
          view={view}
          onPress={() => onOpen(view.category)}
        />
      ))}
    </ScrollView>
  );
}

// Progress towards Quiz Master: one segment per active category.
export function MasterRow({
  progress,
  perfect,
}: {
  progress: QuizMasterProgress;
  // Which categories are at 100 %, in order.
  perfect: boolean[];
}) {
  const { colors, radius } = useThemeV2();

  return (
    <View
      accessible
      accessibilityLabel={`Quiz Master. ${progress.line}`}
      style={[
        styles.master,
        { borderRadius: radius.cardCompact, backgroundColor: colors.surface.raised, boxShadow: 'none', borderColor: colors.divider },
      ]}
    >
      <View style={styles.masterHead}>
        <TextV2 variant="eyebrow" tone="secondary">
          Quiz Master
        </TextV2>
        <TextV2 variant="metaStrong">{progress.line}</TextV2>
      </View>
      <View style={styles.masterBar}>
        {perfect.map((done, index) => (
          <View
            key={index}
            style={[
              styles.masterSeg,
              { backgroundColor: done ? colors.ember.base : colors.surface.track },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// "Últimas rondas": title, when, points and score of the saved rounds.
export function HistoryList({ rows }: { rows: HistoryRow[] }) {
  const { colors } = useThemeV2();

  return (
    <View>
      <TextV2 variant="eyebrow" tone="secondary" style={styles.historyHead}>
        Últimas rondas
      </TextV2>
      {rows.map(row => (
        <View
          key={row.id}
          accessible
          accessibilityLabel={`${row.title}, ${row.when}, ${row.score}, ${row.points} puntos`}
          style={[styles.historyRow, { borderTopColor: colors.divider }]}
        >
          <TextV2 variant="body" style={styles.historyTitle} numberOfLines={1}>
            {row.title}
          </TextV2>
          <TextV2 variant="meta" tone="secondary">
            {row.when}
          </TextV2>
          <TextV2 variant="metaStrong" tone="secondary" style={styles.historyPoints}>
            {`+${row.points}`}
          </TextV2>
          <TextV2 variant="cta" style={styles.historyScore}>
            {row.score}
          </TextV2>
        </View>
      ))}
    </View>
  );
}

export function QuizPortadaSkeleton() {
  return (
    <SkeletonGroup>
      <View style={styles.skeleton}>
        <View style={styles.skeletonHead}>
          <Skeleton width={110} height={52} radius={14} />
          <Skeleton width={120} height={34} radius={10} />
        </View>
        <Skeleton height={300} radius={28} />
        <Skeleton width={120} height={22} radius={11} />
        <View style={styles.skeletonCards}>
          <Skeleton width={168} height={210} radius={24} />
          <Skeleton width={168} height={210} radius={24} />
        </View>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  pointsBlock: { gap: 4 },
  week: { alignItems: 'flex-end', gap: 6 },
  dots: { flexDirection: 'row', gap: 4 },
  dotCell: { alignItems: 'center', gap: 4 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotLabel: { fontSize: 9, lineHeight: 11 },
  daily: {
    height: 300,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 20px 44px rgba(0,0,0,.18)',
  },
  pill: {
    position: 'absolute',
    left: 18,
    top: 16,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: { fontWeight: '700', letterSpacing: 0.66 },
  dailyBottom: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 14 },
  dailyText: { gap: 4 },
  dailyFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  play: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strip: { gap: 12, paddingHorizontal: 20, paddingBottom: 8 },
  stripBleed: { marginHorizontal: -20 },
  challenge: { width: 168, gap: 10 },
  challengePhoto: {
    height: 210,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#141312',
  },
  ring: { position: 'absolute', right: 12, top: 12 },
  challengeText: { position: 'absolute', left: 14, right: 14, bottom: 14, gap: 3 },
  goal: { paddingHorizontal: 2 },
  master: { padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  masterHead: { gap: 4 },
  masterBar: { flexDirection: 'row', gap: 4 },
  masterSeg: { flex: 1, height: 5, borderRadius: 3 },
  historyHead: { paddingBottom: 6 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyTitle: { flex: 1 },
  historyPoints: { minWidth: 44, textAlign: 'right' },
  historyScore: { minWidth: 44, textAlign: 'right' },
  skeleton: { gap: 22, paddingTop: 8 },
  skeletonHead: { flexDirection: 'row', justifyContent: 'space-between' },
  skeletonCards: { flexDirection: 'row', gap: 12 },
});
