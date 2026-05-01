import {StyleSheet, Text, View} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {Card, EmptyState, Loader} from '@app/components/ui';
import {ActiveChallengeCard} from '@app/features/progress/components/ActiveChallengeCard';
import {useProgressData} from '@app/hooks/useProgressData';
import {useAppTheme} from '@app/hooks/useAppTheme';

export function ChallengeScreen() {
  const {theme} = useAppTheme();
  const {overviewQuery} = useProgressData();

  const styles = StyleSheet.create({
    statsCard: {
      padding: 16,
      borderRadius: 24,
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  if (overviewQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando reto..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <AppHeader showBackButton title="Core · 33" />

      <ActiveChallengeCard
        challenge={overviewQuery.data?.challenge || null}
        onOpen={() => undefined}
      />

      {overviewQuery.data?.challenge ? (
        <Card style={styles.statsCard}>
          <Text style={styles.title}>Estado actual</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Hábitos completados hoy</Text>
            <Text style={styles.value}>
              {overviewQuery.data.challenge.completedToday}/
              {overviewQuery.data.challenge.totalHabits}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Días cerrados</Text>
            <Text style={styles.value}>
              {overviewQuery.data.challenge.completedDays}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Racha actual</Text>
            <Text style={styles.value}>
              {overviewQuery.data.challenge.currentStreak} días
            </Text>
          </View>
        </Card>
      ) : (
        <EmptyState
          title="Todavía no has iniciado el reto"
          description="Cuando actives Core · 33, verás aquí tu progreso real por día y tus hábitos elegidos."
        />
      )}
    </ScreenContainer>
  );
}
