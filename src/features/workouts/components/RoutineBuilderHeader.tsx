import {ArrowLeft} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {RoutineBuilderStep} from '@app/features/workouts/types';

type RoutineBuilderHeaderProps = {
  mode: 'create' | 'edit';
  step: RoutineBuilderStep;
  onBack: () => void;
};

function getStepTitle(mode: 'create' | 'edit', step: RoutineBuilderStep) {
  if (step === 'details') {
    return mode === 'edit' ? 'Editar rutina' : 'Nueva rutina';
  }

  if (step === 'exercises') {
    return 'Seleccionar ejercicios';
  }

  return 'Configurar rutina';
}

function getStepNumber(step: RoutineBuilderStep) {
  return step === 'details' ? 1 : step === 'exercises' ? 2 : 3;
}

export function RoutineBuilderHeader({
  mode,
  step,
  onBack,
}: RoutineBuilderHeaderProps) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const completedSteps = getStepNumber(step);

  const styles = StyleSheet.create({
    container: {
      paddingTop: insets.top + theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.4,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    progressRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    progressSegment: {
      height: 4,
      borderRadius: theme.radii.pill,
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
    },
    progressSegmentActive: {
      backgroundColor: theme.colors.accent,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft
            color={theme.colors.textPrimary}
            size={18}
            strokeWidth={2.2}
          />
        </Pressable>
        <View>
          <Text style={styles.title}>{getStepTitle(mode, step)}</Text>
          <Text style={styles.subtitle}>Paso {completedSteps} de 3</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {[1, 2, 3].map(index => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index <= completedSteps ? styles.progressSegmentActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}
