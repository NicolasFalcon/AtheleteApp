import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, ScreenContainer } from '@app/components';
import { AppTextInput, Button, Card, Loader } from '@app/components/ui';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { APP_ROUTES } from '@app/constants/routes';
import { updateProfileDetails } from '@app/services/supabase/profile';
import type { OnboardingGoal } from '@app/types/auth';

const goals: Array<{key: OnboardingGoal; label: string}> = [
  {key: 'lose_weight', label: 'Perder peso'},
  {key: 'gain_muscle', label: 'Ganar músculo'},
  {key: 'maintain', label: 'Mantenerme'},
  {key: 'improve_health', label: 'Mejorar salud'},
];

export function EditProfileScreen() {
  const {theme} = useAppTheme();
  const {profile, refreshProfile} = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [goal, setGoal] = useState<OnboardingGoal>('maintain');
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '');
  const [weight, setWeight] = useState(profile?.weight ? String(profile.weight) : '');
  const [height, setHeight] = useState(profile?.height ? String(profile.height) : '');
  const [trainingDays, setTrainingDays] = useState(
    profile?.trainingDaysPerWeek ? String(profile.trainingDaysPerWeek) : '',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(profile.name || '');
    setGoal(profile.goal || 'maintain');
    setBirthDate(profile.birthDate || '');
    setWeight(profile.weight ? String(profile.weight) : '');
    setHeight(profile.height ? String(profile.height) : '');
    setTrainingDays(profile.trainingDaysPerWeek ? String(profile.trainingDaysPerWeek) : '');
  }, [profile]);

  const styles = StyleSheet.create({
    form: {
      gap: 14,
    },
    card: {
      padding: 18,
      borderRadius: 28,
      gap: 14,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
    },
    goalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    goalOption: {
      minHeight: 40,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    goalOptionActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    goalLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    goalLabelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    rowItem: {
      flex: 1,
    },
  });

  if (!profile) {
    return (
      <ScreenContainer>
        <Loader label="Cargando perfil..." />
      </ScreenContainer>
    );
  }

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateProfileDetails(profile.id, {
        name: name.trim(),
        goal,
        birthDate: birthDate.trim() || null,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        trainingDaysPerWeek: trainingDays ? Number(trainingDays) : null,
      });
      await refreshProfile();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.form}>
      <AppHeader
        showBackButton
        title="Editar perfil"
        backFallbacks={[APP_ROUTES.Profile]}
      />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Información personal</Text>
        <AppTextInput
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
        />
        <AppTextInput
          label="Fecha de nacimiento"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <AppTextInput
              label="Peso"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="kg"
            />
          </View>
          <View style={styles.rowItem}>
            <AppTextInput
              label="Altura"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="cm"
            />
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Mis objetivos</Text>
        <View style={styles.goalGrid}>
          {goals.map(option => {
            const active = goal === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setGoal(option.key)}
                style={({pressed}) => [
                  styles.goalOption,
                  active ? styles.goalOptionActive : null,
                  pressed ? {opacity: 0.9} : null,
                ]}>
                <Text
                  style={[
                    styles.goalLabel,
                    active ? styles.goalLabelActive : null,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <AppTextInput
          label="Entrenamiento por semana"
          value={trainingDays}
          onChangeText={setTrainingDays}
          keyboardType="number-pad"
          placeholder="6"
        />
      </Card>

      <Button
        label={saving ? 'Guardando...' : 'Guardar cambios'}
        onPress={handleSave}
        disabled={saving}
      />
    </ScreenContainer>
  );
}
