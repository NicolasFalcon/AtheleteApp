import type {LucideIcon} from 'lucide-react-native';
import {
  Apple,
  ArrowLeft,
  Award,
  Brain,
  Dumbbell,
  Flame,
  GraduationCap,
  LayoutGrid,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {Button, Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {ALL_BADGES} from '@app/shared';

type QuizScoreSummaryCardProps = {
  categoryName: string;
  categoryIcon: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  score: number;
  isPerfect: boolean;
  unlockedBadges: string[];
  onRetry: () => void;
  onGoBack: () => void;
};

function getFeedback(score: number) {
  if (score <= 40) {
    return 'Buen intento';
  }

  if (score < 70) {
    return 'Vas mejorando';
  }

  if (score < 90) {
    return 'Muy bien';
  }

  return 'Excelente resultado';
}

function getCategoryIcon(icon: string): LucideIcon {
  if (icon === 'apple') {
    return Apple;
  }

  if (icon === 'dumbbell') {
    return Dumbbell;
  }

  return Brain;
}

function ResultRing({score}: {score: number}) {
  const {theme} = useAppTheme();
  const size = 184;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(100, Math.max(0, score)) / 100;
  const dashOffset = circumference * (1 - ratio);
  const feedback = getFeedback(score);
  const ringColor = score >= 70 ? theme.colors.success : '#D99A2B';

  const styles = StyleSheet.create({
    shell: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    svg: {
      position: 'absolute',
      transform: [{rotate: '-90deg'}],
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    score: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 42,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -1.8,
      lineHeight: 48,
    },
    feedbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    feedback: {
      color: ringColor,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.shell}>
      <Svg height={size} width={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{score}%</Text>
        <View style={styles.feedbackRow}>
          <Sparkles color={ringColor} size={13} strokeWidth={2.2} />
          <Text style={styles.feedback}>{feedback}</Text>
        </View>
      </View>
    </View>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  tint,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tint: string;
}) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    metric: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${tint}16`,
      marginBottom: 2,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 19,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 23,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      lineHeight: 14,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.metric}>
      <View style={styles.iconWrap}>
        <Icon color={tint} size={16} strokeWidth={2} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function QuizScoreSummaryCard({
  categoryName,
  categoryIcon,
  correctCount,
  totalQuestions,
  pointsEarned,
  score,
  isPerfect,
  unlockedBadges,
  onRetry,
  onGoBack,
}: QuizScoreSummaryCardProps) {
  const {theme} = useAppTheme();
  const CategoryIcon = getCategoryIcon(categoryIcon);
  const badgeTitles = unlockedBadges
    .map(id => ALL_BADGES.find(badge => badge.id === id)?.title)
    .filter(Boolean) as string[];
  const recommendationTitle =
    score >= 90 ? 'Siguiente desafío' : 'Siguiente paso recomendado';
  const recommendation =
    score >= 90
      ? 'Prueba otra categoría y sigue ampliando tus conocimientos.'
      : `Repasa ${categoryName.toLowerCase()} para mejorar tu precisión.`;

  const styles = StyleSheet.create({
    shell: {
      width: '100%',
      gap: 14,
      alignItems: 'center',
    },
    backButton: {
      alignSelf: 'flex-start',
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.subtle,
    },
    hero: {
      alignItems: 'center',
      gap: 10,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 24,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    categoryChip: {
      minHeight: 32,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    categoryLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    feedback: {
      width: '100%',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
    },
    feedbackPrimary: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
      lineHeight: 20,
    },
    feedbackSecondary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 330,
    },
    statsCard: {
      width: '100%',
      paddingHorizontal: 10,
      paddingVertical: 14,
    },
    statsRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: 4,
    },
    recommendationCard: {
      width: '100%',
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    recommendationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    recommendationCopy: {
      flex: 1,
      gap: 2,
    },
    recommendationTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    recommendationText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 16,
    },
    unlockedText: {
      color: theme.colors.success,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
      marginTop: 2,
    },
    actions: {
      width: '100%',
      gap: 9,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: theme.radii.pill,
    },
    secondaryButton: {
      minHeight: 50,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 2,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <View style={styles.shell}>
      <Pressable
        onPress={onGoBack}
        style={({pressed}) => [
          styles.backButton,
          pressed ? {opacity: 0.78} : null,
        ]}>
        <ArrowLeft
          color={theme.colors.textPrimary}
          size={19}
          strokeWidth={2}
        />
      </Pressable>

      <View style={styles.hero}>
        <ResultRing score={score} />
        <Text style={styles.heading}>
          {isPerfect ? 'Quiz perfecto' : 'Quiz completado'}
        </Text>
        <View style={styles.categoryChip}>
          <CategoryIcon
            color={theme.colors.textPrimary}
            size={15}
            strokeWidth={2}
          />
          <Text style={styles.categoryLabel}>{categoryName}</Text>
        </View>
      </View>

      <View style={styles.feedback}>
        <Text style={styles.feedbackPrimary}>
          Respondiste {correctCount} de {totalQuestions} preguntas correctamente.
        </Text>
        <Text style={styles.feedbackSecondary}>
          {isPerfect
            ? 'Dominaste esta categoría. Sigue avanzando para desbloquear nuevos logros.'
            : 'Sigue aprendiendo y vuelve a intentarlo para mejorar tu porcentaje y ganar más puntos.'}
        </Text>
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Metric
            icon={Trophy}
            value={`${correctCount}/${totalQuestions}`}
            label="Correctas"
            tint="#4F8A5B"
          />
          <View style={styles.divider} />
          <Metric
            icon={Target}
            value={`${score}%`}
            label="Precisión"
            tint="#D99A2B"
          />
          <View style={styles.divider} />
          <Metric
            icon={Award}
            value={`+${pointsEarned}`}
            label="Puntos obtenidos"
            tint="#7656B5"
          />
        </View>
      </Card>

      <Card style={styles.recommendationCard}>
        <View style={styles.recommendationIcon}>
          <GraduationCap
            color={theme.colors.textPrimary}
            size={19}
            strokeWidth={2}
          />
        </View>
        <View style={styles.recommendationCopy}>
          <Text style={styles.recommendationTitle}>
            {recommendationTitle}
          </Text>
          <Text style={styles.recommendationText}>{recommendation}</Text>
          {badgeTitles.length > 0 ? (
            <Text style={styles.unlockedText}>
              Logro desbloqueado: {badgeTitles.join(', ')}
            </Text>
          ) : null}
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="Intentar otra vez"
          onPress={onRetry}
          style={styles.primaryButton}
          accessoryRight={
            <RefreshCw
              color={theme.colors.accentContrast}
              size={17}
              strokeWidth={2}
            />
          }
        />
        <Button
          label="Volver a categorías"
          variant="outline"
          onPress={onGoBack}
          style={styles.secondaryButton}
          accessoryRight={
            <LayoutGrid
              color={theme.colors.textPrimary}
              size={17}
              strokeWidth={2}
            />
          }
        />
      </View>

      <View style={styles.footer}>
        <Flame color="#D99A2B" size={14} strokeWidth={2} />
        <Text style={styles.footerText}>
          ¡Cada intento te hace mejor!
        </Text>
      </View>
    </View>
  );
}
