import {ArrowRight, CheckCircle2, Dumbbell, TrendingUp} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type Core33IntroViewProps = {
  onNext: () => void;
};

const steps = [
  {
    icon: Dumbbell,
    text: 'Elige 3 hábitos simples en entrenamiento, salud y mentalidad.',
  },
  {
    icon: CheckCircle2,
    text: 'Márcalos cada día durante 33 días para sostener la racha.',
  },
  {
    icon: TrendingUp,
    text: 'Sigue tu progreso real desde Inicio, Progreso y Perfil.',
  },
];

export function Core33IntroView({onNext}: Core33IntroViewProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    wrap: {
      gap: 20,
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    badgeLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 1.4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 30,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 34,
      letterSpacing: -1.1,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 320,
    },
    copyGroup: {
      gap: 10,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    stepsList: {
      gap: 12,
    },
    howItWorksCard: {
      padding: 18,
      borderRadius: 26,
      gap: 16,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    stepText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 22,
      flex: 1,
    },
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.badgeLabel}>CORE · 33</Text>
      </View>

      <View style={styles.copyGroup}>
        <Text style={styles.title}>3 hábitos. 33 días. Disciplina real.</Text>
        <Text style={styles.subtitle}>
          Construye consistencia un día a la vez con un reto simple, medible y
          conectado a tu progreso real.
        </Text>
      </View>

      <Card style={styles.howItWorksCard}>
        <Text style={styles.sectionLabel}>Cómo funciona</Text>
        <View style={styles.stepsList}>
          {steps.map(step => (
            <View key={step.text} style={styles.stepRow}>
              <View style={styles.iconWrap}>
                <step.icon
                  color={theme.colors.textPrimary}
                  size={16}
                  strokeWidth={2.1}
                />
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button
        label="Elegir mis hábitos"
        onPress={onNext}
        accessoryRight={
          <ArrowRight
            color={theme.colors.accentContrast}
            size={16}
            strokeWidth={2.2}
          />
        }
        style={{borderRadius: theme.radii.pill}}
      />
    </View>
  );
}
