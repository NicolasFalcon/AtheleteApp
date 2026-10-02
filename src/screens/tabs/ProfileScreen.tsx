import { useCallback, useRef, useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react-native';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Card, Loader, EmptyState } from '@app/components/ui';
import { BackButton } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { useOpenCore33 } from '@app/features/core33/useOpenCore33';
import { BadgeGridCard } from '@app/features/profile/components/BadgeGridCard';
import { CurrentPlanSummaryCard } from '@app/features/profile/components/CurrentPlanSummaryCard';
import { ProfileHeroCard } from '@app/features/profile/components/ProfileHeroCard';
import { ProfilePersonalInfoCard } from '@app/features/profile/components/ProfilePersonalInfoCard';
import { ProfilePreferencesCard } from '@app/features/profile/components/ProfilePreferencesCard';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useProfilePreferences } from '@app/hooks/useProfilePreferences';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

// Perfil left the tab bar (phase 4): it is a stacked screen opened from the
// avatar, so it has its own back button and no tab bar clearance.
type Props = AppScreenProps<'Profile'>;
type ThemePreference = 'light' | 'dark' | 'system';
type ProfileSection = 'profile' | 'plan' | 'achievements' | 'preferences' | 'account';

const PROFILE_SECTIONS: Array<{ id: ProfileSection; label: string }> = [
  { id: 'profile', label: 'Perfil' },
  { id: 'plan', label: 'Plan' },
  { id: 'achievements', label: 'Logros' },
  { id: 'preferences', label: 'Preferencias' },
  { id: 'account', label: 'Cuenta' },
];

const goalLabels: Record<string, string> = {
  lose_weight: 'Perder peso',
  gain_muscle: 'Ganar músculo',
  maintain: 'Mantenerme',
  improve_health: 'Mejorar salud',
  performance: 'Rendimiento',
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

export function ProfileScreen({ navigation }: Props) {
  const { theme, preferredMode, setPreferredMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const openCore33 = useOpenCore33();
  const { profile, signOut } = useAuth();
  const overviewQuery = useProfileOverview();
  const preferences = useProfilePreferences();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<ProfileSection, number>>({
    profile: 0,
    plan: 0,
    achievements: 0,
    preferences: 0,
    account: 0,
  });
  const [activeSection, setActiveSection] =
    useState<ProfileSection>('profile');

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom:
        Math.max(insets.bottom, theme.spacing.md) + theme.spacing.lg,
      gap: theme.spacing.md,
    },
    backRow: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    anchorBar: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.subtle,
    },
    anchorButton: {
      flex: 1,
      minHeight: 34,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    anchorButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    anchorLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
    },
    anchorLabelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    accountCard: {
      borderRadius: theme.radii.md,
      padding: 16,
      gap: 10,
    },
    accountTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    signOutButton: {
      minHeight: 46,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    signOutLabel: {
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
    },
  });

  const recordSectionLayout = useCallback(
    (section: ProfileSection) => (event: LayoutChangeEvent) => {
      sectionOffsets.current[section] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToSection = useCallback((section: ProfileSection) => {
    setActiveSection(section);
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionOffsets.current[section] - 10),
      animated: true,
    });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const marker = event.nativeEvent.contentOffset.y + 72;
      let nextSection: ProfileSection = 'profile';

      PROFILE_SECTIONS.forEach(section => {
        if (marker >= sectionOffsets.current[section.id]) {
          nextSection = section.id;
        }
      });

      const reachedBottom =
        event.nativeEvent.contentOffset.y +
          event.nativeEvent.layoutMeasurement.height >=
        event.nativeEvent.contentSize.height - 24;

      if (reachedBottom) {
        nextSection = 'account';
      }

      setActiveSection(current =>
        current === nextSection ? current : nextSection,
      );
    },
    [],
  );

  const backRow = (
    <View style={styles.backRow}>
      <BackButton
        onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])}
      />
    </View>
  );

  if (!profile || overviewQuery.isLoading || !preferences.hydrated) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {backRow}
        <Loader label="Cargando perfil..." />
      </SafeAreaView>
    );
  }

  if (overviewQuery.error) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {backRow}
        <View style={styles.content}>
          <EmptyState
            title="No pudimos cargar tu perfil"
            description="Vuelve a intentarlo en unos minutos o revisa la conexión con Supabase."
            icon={
              <RefreshCw
                color={theme.colors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            }
            actionLabel="Reintentar"
            onAction={() => {
              overviewQuery.refetch().catch(() => {});
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const overview = overviewQuery.data;
  const goalLabel = profile.goal
    ? goalLabels[profile.goal] || 'Sin objetivo'
    : 'Sin objetivo';
  const trainingLabel = profile.trainingDaysPerWeek
    ? `${profile.trainingDaysPerWeek} días/sem`
    : 'Sin frecuencia';
  const challengeSummary = overview?.challenge
    ? overview.challenge.status === 'completed'
      ? 'Completado · 33 días'
      : `Día ${overview.challenge.challengeDay} de 33`
    : 'Sin reto';
  const nutritionSummary = overview?.nutritionPlan
    ? overview.todayNutritionLog &&
      ((overview.todayNutritionLog.calories || 0) > 0 ||
        (overview.todayNutritionLog.protein || 0) > 0)
      ? `${overview.todayNutritionLog.calories} kcal hoy`
      : 'Plan activo'
    : 'Sin plan';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {backRow}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeroCard
          avatarKey={profile.avatarKey}
          profilePhotoUrl={profile.profilePhotoUrl}
          name={profile.name || 'Usuario'}
          email={profile.email}
          goalLabel={goalLabel}
          trainingLabel={trainingLabel}
          points={overview?.points || 0}
          currentStreak={overview?.currentStreak || 0}
          badgeCount={overview?.badges.length || 0}
          onEdit={() => navigation.navigate(APP_ROUTES.EditProfile)}
        />

        <View style={styles.anchorBar}>
          {PROFILE_SECTIONS.map(section => {
            const active = activeSection === section.id;

            return (
              <Pressable
                key={section.id}
                onPress={() => scrollToSection(section.id)}
                style={({ pressed }) => [
                  styles.anchorButton,
                  active ? styles.anchorButtonActive : null,
                  pressed ? { opacity: 0.78 } : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.anchorLabel,
                    active ? styles.anchorLabelActive : null,
                  ]}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          onLayout={recordSectionLayout('profile')}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Perfil</Text>
          <ProfilePersonalInfoCard
            ageLabel={calculateAge(profile.birthDate)}
            weightLabel={profile.weight ? String(profile.weight) : '—'}
            heightLabel={profile.height ? String(profile.height) : '—'}
            onEdit={() => navigation.navigate(APP_ROUTES.EditProfile)}
          />
        </View>

        <View onLayout={recordSectionLayout('plan')}>
          <CurrentPlanSummaryCard
            goalLabel={goalLabel}
            trainingLabel={trainingLabel}
            nutritionLabel={nutritionSummary}
            challengeLabel={challengeSummary}
            onEdit={() => navigation.navigate(APP_ROUTES.EditProfile)}
            onOpenNutrition={() =>
              navigation.navigate(APP_ROUTES.NutritionPlan)
            }
            onOpenChallenge={openCore33}
          />
        </View>

        <View onLayout={recordSectionLayout('achievements')}>
          <BadgeGridCard
            badges={overview?.badges || []}
            embedded
            previewCount={5}
            points={overview?.points || 0}
            currentStreak={overview?.currentStreak || 0}
            onOpenAll={() => navigation.navigate(APP_ROUTES.Achievements)}
          />
        </View>

        <View onLayout={recordSectionLayout('preferences')}>
          <ProfilePreferencesCard
            preferredMode={preferredMode as ThemePreference}
            onChangeMode={setPreferredMode}
            notifications={preferences.notifications}
            onToggleNotifications={preferences.updateNotifications}
          />
        </View>

        <View onLayout={recordSectionLayout('account')}>
          <Card style={styles.accountCard}>
            <Text style={styles.accountTitle}>Cuenta</Text>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed ? { opacity: 0.82 } : null,
              ]}
            >
              <Text style={styles.signOutLabel}>Cerrar sesión</Text>
              <LogOut
                color={theme.colors.danger}
                size={16}
                strokeWidth={1.8}
              />
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
