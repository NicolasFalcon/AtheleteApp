import { ArrowRight } from 'lucide-react-native';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, ProgressBar } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

const challengeBannerImage = {
  uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80',
};

type ChallengeBannerCardProps = {
  challenge: {
    status?: 'active' | 'completed' | 'abandoned';
    challengeDay: number;
    completedDays: number;
    streak: number;
    completedToday: number;
    totalHabits: number;
    progressPct: number;
  } | null;
  onPress: () => void;
};

export function ChallengeBannerCard({
  challenge,
  onPress,
}: ChallengeBannerCardProps) {
  const { theme } = useAppTheme();
  const activeChallenge = challenge;
  const isActive = Boolean(activeChallenge);
  const isCompleted = activeChallenge?.status === 'completed';

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      overflow: 'hidden',
      backgroundColor: '#0B0B0B',
      ...theme.elevations.card,
    },
    background: {
      minHeight: 214,
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.56)',
    },
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    badge: {
      borderRadius: theme.radii.pill,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    badgeLabel: {
      color: '#111111',
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 0.8,
    },
    stateBadge: {
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
      backgroundColor: 'rgba(255,255,255,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    stateLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 19,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: 'rgba(255,255,255,0.68)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    pill: {
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
      backgroundColor: 'rgba(255,255,255,0.08)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 7,
    },
    pillLabel: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    button: {
      borderColor: '#FFFFFF',
      backgroundColor: '#FFFFFF',
      minHeight: 46,
      paddingHorizontal: 20,
      borderRadius: theme.radii.pill,
      alignSelf: 'flex-start',
    },
    buttonLabel: {
      color: '#111111',
      fontSize: 14,
    },
  });

  return (
    <ImageBackground
      source={challengeBannerImage}
      imageStyle={styles.card}
      style={styles.card}
    >
      <View style={styles.overlay} />
      <Pressable onPress={onPress} style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>CORE · 33</Text>
          </View>
          {isActive ? (
            <View style={styles.stateBadge}>
              <Text style={styles.stateLabel}>
                {isCompleted ? 'COMPLETADO' : 'EN CURSO'}
              </Text>
            </View>
          ) : null}
        </View>

        {!isActive ? (
          <>
            <Text style={styles.title}>3 hábitos. 33 días.</Text>
            <Text style={styles.subtitle}>
              Disciplina real, un día a la vez.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {isCompleted
                ? 'Core 33 completado'
                : `Día ${activeChallenge!.challengeDay} de 33`}
            </Text>
            <Text style={styles.subtitle}>
              {isCompleted
                ? `Terminaste el reto con ${
                    activeChallenge!.completedDays
                  } días cerrados.`
                : activeChallenge!.completedToday ===
                  activeChallenge!.totalHabits
                ? `Hoy ya completaste tus ${
                    activeChallenge!.totalHabits
                  } hábitos.`
                : `Hoy llevas ${activeChallenge!.completedToday} de ${
                    activeChallenge!.totalHabits
                  } hábitos.`}
            </Text>
            <ProgressBar
              value={isCompleted ? 100 : activeChallenge!.progressPct}
              max={100}
              color="#FFFFFF"
            />
            <View style={styles.pillsRow}>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>
                  {isCompleted
                    ? '100% completado'
                    : `${activeChallenge!.progressPct}% completado`}
                </Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>
                  {activeChallenge!.completedDays} días · Racha{' '}
                  {activeChallenge!.streak}
                </Text>
              </View>
            </View>
          </>
        )}

        <Button
          label={
            !isActive
              ? 'Comenzar reto'
              : isCompleted
              ? 'Ver reto'
              : 'Continuar reto'
          }
          onPress={onPress}
          fullWidth={false}
          accessoryRight={
            <ArrowRight color="#111111" size={16} strokeWidth={2.4} />
          }
          style={styles.button}
          textStyle={styles.buttonLabel}
        />
      </Pressable>
    </ImageBackground>
  );
}
