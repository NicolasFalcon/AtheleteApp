import {ArrowRight} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Card, Chip, CircularProgress} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {ProgressChallenge} from '@app/services/supabase/progress';

type ActiveChallengeCardProps = {
  challenge: ProgressChallenge | null;
  onOpen: () => void;
};

export function ActiveChallengeCard({
  challenge,
  onOpen,
}: ActiveChallengeCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 24,
      gap: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    headerCopy: {
      flex: 1,
    },
    status: {
      alignSelf: 'flex-start',
      minHeight: 28,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: challenge ? theme.colors.accent : theme.colors.surfaceMuted,
    },
    statusLabel: {
      color: challenge ? theme.colors.accentContrast : theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.4,
      marginTop: 10,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      marginTop: 4,
      lineHeight: 20,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    cta: {
      minHeight: 48,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    ctaLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  if (!challenge) {
    return (
      <Card style={styles.card}>
        <View>
          <View style={styles.status}>
            <Text style={styles.statusLabel}>Sin iniciar</Text>
          </View>
          <Text style={styles.title}>Athelete Core · 33</Text>
          <Text style={styles.subtitle}>
            3 hábitos. 33 días. Disciplina real.
          </Text>
        </View>

        <Pressable
          onPress={onOpen}
          style={({pressed}) => [styles.cta, pressed ? {opacity: 0.88} : null]}>
          <Text style={styles.ctaLabel}>Ver reto</Text>
          <ArrowRight
            color={theme.colors.accentContrast}
            size={17}
            strokeWidth={2}
          />
        </Pressable>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.status}>
            <Text style={styles.statusLabel}>Activo</Text>
          </View>
          <Text style={styles.title}>Athelete Core · 33</Text>
          <Text style={styles.subtitle}>
            Día {challenge.challengeDay} de 33 · {challenge.progressPct}% completado
          </Text>
        </View>
        <CircularProgress
          value={challenge.progressPct}
          size={86}
          strokeWidth={6}
          label={`${challenge.progressPct}%`}
        />
      </View>

      <View style={styles.chips}>
        {challenge.habits.map(habit => (
          <Chip key={habit.id} style={styles.chip}>
            <Text style={styles.chipLabel}>{habit.name}</Text>
          </Chip>
        ))}
      </View>

      <Pressable
        onPress={onOpen}
        style={({pressed}) => [styles.cta, pressed ? {opacity: 0.88} : null]}>
        <Text style={styles.ctaLabel}>Ver reto</Text>
        <ArrowRight
          color={theme.colors.accentContrast}
          size={17}
          strokeWidth={2}
        />
      </Pressable>
    </Card>
  );
}
