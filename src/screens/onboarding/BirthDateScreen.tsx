import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BirthDate'>;

function formatDate(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    '0',
  )}-${`${date.getDate()}`.padStart(2, '0')}`;
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function formatDisplayDate(date: Date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

export function BirthDateScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const styles = createStyles(theme);
  const selectedDate = useMemo(
    () =>
      onboardingDraft.birthDate
        ? new Date(`${onboardingDraft.birthDate}T12:00:00`)
        : new Date(1995, 0, 1),
    [onboardingDraft.birthDate],
  );
  const maximumDate = new Date();
  maximumDate.setFullYear(maximumDate.getFullYear() - 13);

  return (
    <ProfileSetupLayout
      continueDisabled={!onboardingDraft.birthDate}
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate(ONBOARDING_ROUTES.Gender)}
      step={1}
      subtitle="Tu fecha se mantiene privada y nos ayuda a calcular recomendaciones más precisas."
      title="¿Cuál es tu fecha de nacimiento?"
    >
      {Platform.OS === 'android' ? (
        <Pressable
          onPress={() => setShowAndroidPicker(true)}
          style={styles.androidField}
        >
          <Text style={styles.androidFieldText}>
            {onboardingDraft.birthDate || 'Seleccionar fecha'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.pickerCard}>
          <DateTimePicker
            display="spinner"
            locale="es-ES"
            maximumDate={maximumDate}
            mode="date"
            onChange={(_event, date) => {
              if (date) {
                updateOnboardingDraft({ birthDate: formatDate(date) });
              }
            }}
            style={styles.iosPicker}
            testID="birth-date-picker"
            textColor={theme.colors.textPrimary}
            themeVariant={theme.mode}
            value={selectedDate}
          />
        </View>
      )}
      {Platform.OS === 'android' && showAndroidPicker ? (
        <DateTimePicker
          display="default"
          maximumDate={maximumDate}
          mode="date"
          onChange={(_event, date) => {
            setShowAndroidPicker(false);
            if (date) {
              updateOnboardingDraft({ birthDate: formatDate(date) });
            }
          }}
          value={selectedDate}
        />
      ) : null}
      {onboardingDraft.birthDate ? (
        <Text style={styles.selection}>
          Fecha seleccionada: {formatDisplayDate(selectedDate)}
        </Text>
      ) : null}
    </ProfileSetupLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    pickerCard: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    iosPicker: {
      width: '100%',
      height: 216,
      backgroundColor: theme.colors.surface,
    },
    androidField: {
      minHeight: 62,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    androidFieldText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    selection: {
      marginTop: theme.spacing.md,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      textAlign: 'center',
    },
  });
}
