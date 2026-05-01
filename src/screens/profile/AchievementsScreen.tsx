import {StyleSheet} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {Loader} from '@app/components/ui';
import {BadgeGridCard} from '@app/features/profile/components/BadgeGridCard';
import {useProfileOverview} from '@app/hooks/useProfileOverview';
import {useAppTheme} from '@app/hooks/useAppTheme';

export function AchievementsScreen() {
  const {theme} = useAppTheme();
  const overviewQuery = useProfileOverview();

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.lg,
    },
  });

  if (overviewQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando logros..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <AppHeader
        showBackButton
        title="Logros"
        subtitle="Todos tus badges desbloqueados y los que aún te faltan por conseguir."
      />

      <BadgeGridCard
        badges={overviewQuery.data?.badges || []}
        embedded={false}
      />
    </ScreenContainer>
  );
}
