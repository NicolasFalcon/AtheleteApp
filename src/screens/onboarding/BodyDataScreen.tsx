import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@app/components/ScreenContainer';
import { OnboardingProgress } from '@app/components/onboarding/OnboardingProgress';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingStackParamList } from '@app/types/navigation';
import { AppTextInput, Button } from '@app/components/ui';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BodyData'>;

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string): string {
  if (!value) {
    return 'Selecciona tu fecha de nacimiento';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function BodyDataScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState<{
    birthDate?: string;
    weight?: string;
    height?: string;
  }>({});

  const selectedDate = useMemo(() => {
    if (onboardingDraft.birthDate) {
      const date = new Date(`${onboardingDraft.birthDate}T00:00:00`);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date(1995, 0, 1);
  }, [onboardingDraft.birthDate]);

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.xxl,
    },
    heading: {
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    dateField: {
      gap: theme.spacing.xs,
    },
    dateLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    dateButton: {
      minHeight: 54,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: errors.birthDate ? theme.colors.danger : theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
    },
    dateText: {
      color: onboardingDraft.birthDate
        ? theme.colors.textPrimary
        : theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    field: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    backButton: {
      minWidth: 56,
    },
    continueButton: {
      flex: 1,
    },
  });

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (date) {
      updateOnboardingDraft({ birthDate: formatDate(date) });
    }
  };

  const handleContinue = () => {
    const nextErrors: typeof errors = {};
    const weight = Number(onboardingDraft.weight);
    const height = Number(onboardingDraft.height);

    if (!onboardingDraft.birthDate) {
      nextErrors.birthDate = 'Obligatorio';
    }

    if (!weight || weight < 30 || weight > 300) {
      nextErrors.weight = '30–300 kg';
    }

    if (!height || height < 100 || height > 250) {
      nextErrors.height = '100–250 cm';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    navigation.navigate(ONBOARDING_ROUTES.TrainingFrequency);
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <OnboardingProgress step={2} />
      <View style={styles.heading}>
        <Text style={styles.title}>Tus datos corporales</Text>
        <Text style={styles.subtitle}>
          Usamos esto para calcular tus objetivos.
        </Text>
      </View>
      <View style={styles.dateField}>
        <Text style={styles.dateLabel}>Fecha de nacimiento</Text>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={styles.dateButton}>
          <Text style={styles.dateText}>
            {formatDisplayDate(onboardingDraft.birthDate)}
          </Text>
        </Pressable>
        {errors.birthDate ? (
          <Text style={styles.errorText}>{errors.birthDate}</Text>
        ) : null}
      </View>
      {showPicker ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          mode="date"
          onChange={handleDateChange}
          value={selectedDate}
        />
      ) : null}
      <View style={styles.row}>
        <View style={styles.field}>
          <AppTextInput
            error={errors.weight}
            inputMode="decimal"
            keyboardType="numeric"
            label="Peso (kg)"
            onChangeText={value =>
              updateOnboardingDraft({ weight: Number(value) || undefined })
            }
            placeholder="75"
            value={
              onboardingDraft.weight ? String(onboardingDraft.weight) : ''
            }
          />
        </View>
        <View style={styles.field}>
          <AppTextInput
            error={errors.height}
            inputMode="numeric"
            keyboardType="numeric"
            label="Estatura (cm)"
            onChangeText={value =>
              updateOnboardingDraft({ height: Number(value) || undefined })
            }
            placeholder="175"
            value={
              onboardingDraft.height ? String(onboardingDraft.height) : ''
            }
          />
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          fullWidth={false}
          label="←"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          variant="outline"
        />
        <Button
          label="Continuar"
          onPress={handleContinue}
          style={styles.continueButton}
        />
      </View>
    </ScreenContainer>
  );
}
