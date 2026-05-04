import {ArrowLeft, ArrowRight, Brain, Dumbbell, Heart} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Button, Card, Chip} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {
  getCore33HabitPresets,
  type Core33HabitSelection,
} from '@app/services/supabase/core33';

type Core33HabitSelectionViewProps = {
  value: Core33HabitSelection;
  onChange: (value: Core33HabitSelection) => void;
  onBack: () => void;
  onNext: () => void;
};

const pillarIcons = {
  training: Dumbbell,
  health: Heart,
  mind: Brain,
} as const;

export function Core33HabitSelectionView({
  value,
  onChange,
  onBack,
  onNext,
}: Core33HabitSelectionViewProps) {
  const {theme} = useAppTheme();
  const pillars = getCore33HabitPresets();
  const allSelected = Boolean(value.training && value.health && value.mind);

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
    card: {
      padding: 16,
      borderRadius: 24,
      gap: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillarLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chipLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
    chipLabelSelected: {
      color: theme.colors.accentContrast,
    },
    input: {
      minHeight: 44,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 14,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
    },
    helper: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    selectionCard: {
      padding: 16,
      borderRadius: 24,
      gap: 8,
    },
    selectionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    selectionText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
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
        <Text style={styles.title}>Elige tus 3 hábitos</Text>
        <Text style={styles.subtitle}>
          Un hábito por pilar. Simples, medibles y realistas para sostener 33
          días.
        </Text>
      </View>

      {pillars.map(pillar => {
        const Icon = pillarIcons[pillar.key];
        const activeValue = value[pillar.key];
        const isPreset = pillar.options.includes(activeValue);

        return (
          <Card key={pillar.key} style={styles.card}>
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Icon
                  color={theme.colors.textPrimary}
                  size={14}
                  strokeWidth={2.1}
                />
              </View>
              <Text style={styles.pillarLabel}>{pillar.label}</Text>
            </View>

            <View style={styles.chipsRow}>
              {pillar.options.map(option => {
                const selected = activeValue === option;
                return (
                  <Chip
                    key={option}
                    selected={selected}
                    onPress={() =>
                      onChange({
                        ...value,
                        [pillar.key]: selected ? '' : option,
                      })
                    }>
                    <Text
                      style={[
                        styles.chipLabel,
                        selected ? styles.chipLabelSelected : null,
                      ]}>
                      {option}
                    </Text>
                  </Chip>
                );
              })}
            </View>

            <TextInput
              value={isPreset ? '' : activeValue}
              placeholder="O escribe un hábito personalizado…"
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.input}
              onChangeText={text =>
                onChange({
                  ...value,
                  [pillar.key]: text,
                })
              }
            />
            <Text style={styles.helper}>
              Elige una opción rápida o escribe la tuya.
            </Text>
          </Card>
        );
      })}

      {(value.training || value.health || value.mind) ? (
        <Card style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>Tu selección</Text>
          {value.training ? (
            <Text style={styles.selectionText}>
              Entrenamiento · {value.training}
            </Text>
          ) : null}
          {value.health ? (
            <Text style={styles.selectionText}>Salud · {value.health}</Text>
          ) : null}
          {value.mind ? (
            <Text style={styles.selectionText}>Mentalidad · {value.mind}</Text>
          ) : null}
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Button
          label="Continuar"
          disabled={!allSelected}
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
