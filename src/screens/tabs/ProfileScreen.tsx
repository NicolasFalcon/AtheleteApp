import {useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {Bell, Settings, Sun, Target, Trophy} from 'lucide-react-native';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Loader, EmptyState} from '@app/components/ui';
import {PROFILE_ROUTES} from '@app/constants/routes';
import {AtheletePointsCard} from '@app/features/profile/components/AtheletePointsCard';
import {BadgeGridCard} from '@app/features/profile/components/BadgeGridCard';
import {CurrentPlanSummaryCard} from '@app/features/profile/components/CurrentPlanSummaryCard';
import {ProfileHeroCard} from '@app/features/profile/components/ProfileHeroCard';
import {ProfilePreferencesCard} from '@app/features/profile/components/ProfilePreferencesCard';
import {ProfileQuickLinkRow} from '@app/features/profile/components/ProfileQuickLinkRow';
import {useAuth} from '@app/hooks/useAuth';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useProfileOverview} from '@app/hooks/useProfileOverview';
import {useProfilePreferences} from '@app/hooks/useProfilePreferences';
import type {ProfileStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileRoot'>;
type ThemePreference = 'light' | 'dark' | 'system';

const goalLabels: Record<string, string> = {
  lose_weight: 'Perder peso',
  gain_muscle: 'Ganar músculo',
  maintain: 'Mantenerme',
  improve_health: 'Mejorar salud',
};

function calculateAge(birthDate: string | null): string {
  if (!birthDate) {
    return '—';
  }

  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const monthOffset = today.getMonth() - birth.getMonth();

  if (
    monthOffset < 0 ||
    (monthOffset === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return String(age);
}

export function ProfileScreen({navigation}: Props) {
  const {theme, preferredMode, setPreferredMode} = useAppTheme();
  const {profile, signOut} = useAuth();
  const overviewQuery = useProfileOverview();
  const preferences = useProfilePreferences();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollRef = useRef<ScrollView>(null);
  const [preferencesY, setPreferencesY] = useState(0);

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
    quickLinks: {
      gap: 8,
    },
  });

  if (!profile || overviewQuery.isLoading || !preferences.hydrated) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando perfil..." />
      </SafeAreaView>
    );
  }

  if (overviewQuery.error) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            title="No pudimos cargar tu perfil"
            description="Vuelve a intentarlo en unos minutos o revisa la conexión con Supabase."
          />
        </View>
      </SafeAreaView>
    );
  }

  const overview = overviewQuery.data;
  const goalLabel = profile.goal ? goalLabels[profile.goal] || 'Sin objetivo' : 'Sin objetivo';
  const trainingLabel = profile.trainingDaysPerWeek
    ? `${profile.trainingDaysPerWeek} días/sem`
    : 'Sin frecuencia';
  const challengeSummary = overview?.challenge
    ? `Día ${overview.challenge.challengeDay} de 33`
    : 'Sin reto';
  const challengeMetaLabel = overview?.challenge
    ? `Día ${overview.challenge.challengeDay}`
    : 'Sin reto';
  const challengeValue = overview?.challenge
    ? String(overview.challenge.completedDays)
    : '—';
  const nutritionSummary = overview?.nutritionPlan ? 'Plan activo' : 'Sin plan';

  const openPreferences = () => {
    scrollRef.current?.scrollTo({y: preferencesY - 24, animated: true});
  };

  const handlePreferencesLayout = (event: LayoutChangeEvent) => {
    setPreferencesY(event.nativeEvent.layout.y);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ProfileHeroCard
          name={profile.name || 'Usuario'}
          email={profile.email}
          goalLabel={goalLabel}
          trainingLabel={trainingLabel}
          ageLabel={calculateAge(profile.birthDate)}
          weightLabel={profile.weight ? String(profile.weight) : '—'}
          heightLabel={profile.height ? String(profile.height) : '—'}
        />

        <AtheletePointsCard
          points={overview?.points || 0}
          currentStreak={overview?.currentStreak || 0}
          longestStreak={overview?.longestStreak || 0}
          challengeDayLabel={challengeMetaLabel}
          challengeValue={challengeValue}
        />

        <View style={styles.quickLinks}>
          <ProfileQuickLinkRow
            icon={Settings}
            title="Editar perfil"
            subtitle="Información personal"
            onPress={() => navigation.navigate(PROFILE_ROUTES.EditProfile)}
          />
          <ProfileQuickLinkRow
            icon={Target}
            title="Mis objetivos"
            subtitle="Meta y frecuencia"
            onPress={() => navigation.navigate(PROFILE_ROUTES.EditProfile)}
          />
          <ProfileQuickLinkRow
            icon={Trophy}
            title="Logros"
            subtitle="Badges desbloqueados"
            onPress={() => navigation.navigate(PROFILE_ROUTES.Achievements)}
          />
          <ProfileQuickLinkRow
            icon={Bell}
            title="Notificaciones"
            subtitle="Recordatorios activos"
            onPress={openPreferences}
          />
          <ProfileQuickLinkRow
            icon={Sun}
            title="Apariencia"
            subtitle="Tema de la app"
            onPress={openPreferences}
          />
        </View>

        <CurrentPlanSummaryCard
          goalLabel={goalLabel}
          trainingLabel={trainingLabel}
          nutritionLabel={nutritionSummary}
          challengeLabel={challengeSummary}
          onEdit={() => navigation.navigate(PROFILE_ROUTES.EditProfile)}
          onOpenNutrition={() => navigation.navigate(PROFILE_ROUTES.NutritionPlan)}
        />

        <BadgeGridCard
          badges={overview?.badges || []}
          embedded
          onOpenAll={() => navigation.navigate(PROFILE_ROUTES.Achievements)}
        />

        <View onLayout={handlePreferencesLayout}>
          <ProfilePreferencesCard
            preferredMode={preferredMode as ThemePreference}
            onChangeMode={setPreferredMode}
            notifications={preferences.notifications}
            onToggleNotifications={preferences.updateNotifications}
            onSignOut={signOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
