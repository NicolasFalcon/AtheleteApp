import {ArrowLeft, ArrowRight, Brain, Calendar, Dumbbell, Hash, Heart} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {Core33HabitSelection} from '@app/services/supabase/core33';

type Core33SummaryViewProps = {
  habits: Core33HabitSelection;
  onBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

const META = {
  training: {label: 'Entrenamiento', icon: Dumbbell},
  health: {label: 'Salud', icon: Heart},
  mind: {label: 'Mentalidad', icon: Brain},
} as const;

export function Core33SummaryView({
  habits,
  onBack,
  onConfirm,
  loading = false,
}: Core33SummaryViewProps) {
  const {theme} = useAppTheme();
  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const styles = StyleSheet.create({
    wrap: {
      gap: 16,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 24,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.7,
    },
    headerCopy: {
      gap: 6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
    },
    habitCard: {
      padding: 16,
      borderRadius: 22,
      gap: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    habitContent: {
      flex: 1,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    habitLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    habitValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      marginTop: 2,
    },
    summaryCard: {
      padding: 16,
      borderRadius: 22,
      gap: 10,
    },
    summaryText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 6,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.bold,
    },
    dayLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      textAlign: 'center',
      textTransform: 'capitalize',
    },
    footer: {
      gap: 10,
    },
    backButton: {
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    backLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Tu compromiso</Text>
        <Text style={styles.subtitle}>
          Revisa tus hábitos elegidos antes de comenzar el reto real.
        </Text>
      </View>

      {(Object.keys(META) as Array<keyof typeof META>).map(key => {
        const Icon = META[key].icon;
        return (
          <Card key={key} style={styles.habitCard}>
            <View style={styles.iconWrap}>
              <Icon
                color={theme.colors.textPrimary}
                size={16}
                strokeWidth={2.1}
              />
            </View>
            <View style={styles.habitContent}>
              <Text style={styles.habitLabel}>{META[key].label}</Text>
              <Text style={styles.habitValue}>{habits[key]}</Text>
            </View>
          </Card>
        );
      })}

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          Durante los próximos 33 días marcarás estos 3 hábitos cada jornada.
          Si fallas un día, la racha se corta, pero el progreso real queda
          registrado.
        </Text>
      </Card>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Calendar
            color={theme.colors.textSecondary}
            size={16}
            strokeWidth={2}
          />
          <Text style={styles.metricLabel}>Inicio</Text>
          <Text style={styles.metricValue}>Hoy</Text>
        </View>
        <View style={styles.metricCard}>
          <Hash
            color={theme.colors.textSecondary}
            size={16}
            strokeWidth={2}
          />
          <Text style={styles.metricLabel}>Duración</Text>
          <Text style={styles.metricValue}>33 días</Text>
        </View>
        <View style={styles.metricCard}>
          <Dumbbell
            color={theme.colors.textSecondary}
            size={16}
            strokeWidth={2}
          />
          <Text style={styles.metricLabel}>Hábitos</Text>
          <Text style={styles.metricValue}>3</Text>
        </View>
      </View>

      <Text style={styles.dayLabel}>{todayLabel}</Text>

      <View style={styles.footer}>
        <Button
          label="Comenzar reto"
          onPress={onConfirm}
          loading={loading}
          accessoryRight={
            <ArrowRight
              color={theme.colors.accentContrast}
              size={16}
              strokeWidth={2.2}
            />
          }
          style={{borderRadius: theme.radii.pill}}
        />
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft
            size={12}
            color={theme.colors.textSecondary}
            strokeWidth={2.1}
          />
          <Text style={styles.backLabel}>Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}
