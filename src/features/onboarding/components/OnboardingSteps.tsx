import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Activity,
  Cable,
  Check,
  Dumbbell,
  Layers,
  Minus,
  PersonStanding,
  Plus,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Button,
  ChoiceTile,
  Eyebrow,
  IconButton,
  IconChoiceContent,
  PhotoChoiceTile,
  PressableScale,
  RulerInput,
  Sheet,
  TextV2,
  haptics,
  useThemeV2,
} from '@app/components/v2';
import {
  DAYS_RANGE,
  DURATIONS,
  EQUIPMENT,
  GOALS,
  HEIGHT_RANGE,
  LEVELS,
  RECOMMENDED_DURATION,
  WEIGHT_RANGE,
  daysLine,
  toggleEquipment,
  weekPattern,
  type OnboardingAnswers,
} from '@app/features/onboarding/onboardingModel';

type StepProps = {
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
  onSubmit?: () => void;
};

// ── 1 · Nombre ─────────────────────────────────────────────────────────────
export function NameStep({ answers, update, onSubmit }: StepProps) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.gap10}>
      <TextInput
        value={answers.name}
        onChangeText={name => update({ name })}
        placeholder="Tu nombre"
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Tu nombre"
        selectionColor={colors.text.primary}
        style={[
          styles.nameInput,
          {
            color: colors.text.primary,
            borderBottomColor: colors.text.primary,
          },
        ]}
      />
      <TextV2 variant="meta" tone="secondary">
        Así te llamará ELLIE.
      </TextV2>
    </View>
  );
}

// ── 2 · Fecha de nacimiento ────────────────────────────────────────────────
const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateKey(value: string | null): Date | null {
  return value ? new Date(`${value}T12:00:00`) : null;
}

export function BirthDateStep({ answers, update }: StepProps) {
  const { colors, mode } = useThemeV2();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = fromDateKey(answers.birthDate);
  const today = new Date();
  const fallback = new Date(today.getFullYear() - 25, 0, 1);
  const [draft, setDraft] = useState<Date>(selected ?? fallback);

  const columns = [
    { label: 'Día', value: selected ? String(selected.getDate()) : '—' },
    { label: 'Mes', value: selected ? MONTHS[selected.getMonth()] : '—' },
    { label: 'Año', value: selected ? String(selected.getFullYear()) : '—' },
  ];

  return (
    <View style={styles.gap18}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          selected
            ? `Fecha de nacimiento ${selected.toLocaleDateString(
                'es-ES',
              )}. Cambiar`
            : 'Elegir fecha de nacimiento'
        }
        onPress={() => {
          setDraft(selected ?? fallback);
          setPickerOpen(true);
        }}
        style={styles.dateRow}
      >
        {columns.map((column, index) => (
          <View
            key={column.label}
            style={[
              styles.dateColumn,
              {
                flex: [1, 1.3, 1.5][index],
                borderBottomColor: colors.text.primary,
              },
            ]}
          >
            <Eyebrow>{column.label}</Eyebrow>
            <TextV2 style={styles.dateValue}>{column.value}</TextV2>
          </View>
        ))}
      </PressableScale>
      <TextV2 variant="meta" tone="secondary">
        Al tocar se abre el selector de fecha del sistema.
      </TextV2>

      {Platform.OS === 'android' ? (
        pickerOpen ? (
          <DateTimePicker
            mode="date"
            display="default"
            value={draft}
            maximumDate={today}
            minimumDate={new Date(1920, 0, 1)}
            onChange={(event, date) => {
              setPickerOpen(false);
              if (event.type === 'set' && date) {
                update({ birthDate: toDateKey(date) });
              }
            }}
          />
        ) : null
      ) : (
        <Sheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title="Fecha de nacimiento"
          footer={
            <Button
              label="Listo"
              style={styles.flex1}
              onPress={() => {
                update({ birthDate: toDateKey(draft) });
                setPickerOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            mode="date"
            display="spinner"
            locale="es-ES"
            themeVariant={mode === 'light' ? 'light' : 'dark'}
            value={draft}
            maximumDate={today}
            minimumDate={new Date(1920, 0, 1)}
            onChange={(_event, date) => {
              if (date) {
                setDraft(date);
              }
            }}
          />
        </Sheet>
      )}
    </View>
  );
}

// ── 3 · Peso y altura ──────────────────────────────────────────────────────
export function BodyStep({ answers, update }: StepProps) {
  return (
    <View style={styles.gap30}>
      <RulerInput
        label="Peso"
        unit="kg"
        value={answers.weight}
        min={WEIGHT_RANGE.min}
        max={WEIGHT_RANGE.max}
        onChange={weight => update({ weight })}
      />
      <RulerInput
        label="Altura"
        unit="cm"
        value={answers.height}
        min={HEIGHT_RANGE.min}
        max={HEIGHT_RANGE.max}
        onChange={height => update({ height })}
      />
    </View>
  );
}

// ── 4 · Objetivo ───────────────────────────────────────────────────────────
// Package photos with the prototype treatment baked in (PLACEHOLDER).
const GOAL_PHOTOS = [
  require('@app/assets/v2/photos/hero-entreno.jpg'),
  require('@app/assets/v2/photos/hiit.jpg'),
  require('@app/assets/v2/photos/movilidad.jpg'),
  require('@app/assets/v2/photos/cuerdas.jpg'),
];

export function GoalStep({ answers, update }: StepProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.grid}>
      {GOALS.map((goal, index) => (
        <PhotoChoiceTile
          key={goal.label}
          title={goal.label}
          subtitle={goal.subtitle}
          photo={GOAL_PHOTOS[index]}
          selected={answers.goal === index}
          onPress={() => update({ goal: index })}
          style={styles.half}
        />
      ))}
    </View>
  );
}

// ── 5 · Nivel ──────────────────────────────────────────────────────────────
export function LevelStep({ answers, update }: StepProps) {
  const { colors } = useThemeV2();

  return (
    <View accessibilityRole="radiogroup">
      {LEVELS.map((level, index) => {
        const selected = answers.level === index;

        return (
          <PressableScale
            key={level.label}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${level.label}. ${level.subtitle}`}
            onPress={() => {
              haptics.selection();
              update({ level: index });
            }}
            style={[styles.levelRow, { borderBottomColor: colors.divider }]}
          >
            <View style={styles.bars}>
              {[10, 18, 26].map((height, bar) => (
                <View
                  key={height}
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor:
                        bar <= index ? colors.text.primary : colors.divider,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.levelTexts}>
              <TextV2 variant="section">{level.label}</TextV2>
              <TextV2 variant="meta" tone="secondary">
                {level.subtitle}
              </TextV2>
            </View>
            <View
              style={[
                styles.radio,
                selected
                  ? { backgroundColor: colors.cta.primary }
                  : { borderWidth: 1.5, borderColor: colors.divider },
              ]}
            >
              {selected ? (
                <Check
                  color={colors.cta.primaryText}
                  size={14}
                  strokeWidth={3}
                />
              ) : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

// ── 6 · Días por semana ────────────────────────────────────────────────────
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function DaysStep({ answers, update }: StepProps) {
  const { colors } = useThemeV2();
  const pattern = weekPattern(answers.days);
  const change = (delta: number) => {
    const days = Math.min(
      DAYS_RANGE.max,
      Math.max(DAYS_RANGE.min, answers.days + delta),
    );
    if (days !== answers.days) {
      haptics.selection();
      update({ days });
    }
  };

  return (
    <View style={styles.gap26}>
      <View style={styles.stepper}>
        <IconButton
          icon={Minus}
          accessibilityLabel="Menos días"
          disabled={answers.days <= DAYS_RANGE.min}
          onPress={() => change(-1)}
          style={styles.stepperButton}
        />
        <View
          accessible
          accessibilityLabel={`${answers.days} días por semana`}
          style={styles.stepperValue}
        >
          <TextV2 style={styles.daysNumber}>{answers.days}</TextV2>
          <TextV2 variant="body" tone="secondary">
            días por semana
          </TextV2>
        </View>
        <IconButton
          icon={Plus}
          accessibilityLabel="Más días"
          disabled={answers.days >= DAYS_RANGE.max}
          onPress={() => change(1)}
          style={styles.stepperButton}
        />
      </View>
      <View style={styles.week} accessibilityElementsHidden>
        {WEEKDAYS.map((day, index) => (
          <View
            key={day}
            style={[
              styles.weekDay,
              pattern[index]
                ? { backgroundColor: colors.cta.primary }
                : { borderWidth: 1, borderColor: colors.divider },
            ]}
          >
            <TextV2
              variant="metaStrong"
              color={
                pattern[index] ? colors.cta.primaryText : colors.text.secondary
              }
            >
              {day}
            </TextV2>
          </View>
        ))}
      </View>
      <TextV2 variant="meta" tone="secondary" align="center">
        {daysLine(answers.days)}
      </TextV2>
    </View>
  );
}

// ── 7 · Equipamiento ───────────────────────────────────────────────────────
const EQUIPMENT_ICONS: Record<(typeof EQUIPMENT)[number], LucideIcon> = {
  'Peso corporal': PersonStanding,
  Mancuernas: Dumbbell,
  Barra: Weight,
  Máquinas: Layers,
  Cable: Cable,
  Bandas: Activity,
};

export function EquipmentStep({ answers, update }: StepProps) {
  return (
    <View style={styles.gap18}>
      <View style={[styles.grid, styles.gridTight]}>
        {EQUIPMENT.map(item => {
          const selected = answers.equipment.includes(item);

          return (
            <ChoiceTile
              key={item}
              role="checkbox"
              selected={selected}
              showCheck
              height={104}
              accessibilityLabel={item}
              onPress={() =>
                update({ equipment: toggleEquipment(answers.equipment, item) })
              }
              style={styles.half}
            >
              {color => (
                <IconChoiceContent
                  icon={EQUIPMENT_ICONS[item]}
                  label={item}
                  color={color}
                />
              )}
            </ChoiceTile>
          );
        })}
      </View>
      <TextV2 variant="meta" tone="secondary">
        Elige todo lo que tengas disponible.
      </TextV2>
    </View>
  );
}

// ── 8 · Duración ───────────────────────────────────────────────────────────
export function DurationStep({ answers, update }: StepProps) {
  const { colors } = useThemeV2();
  const current =
    answers.duration !== null ? DURATIONS[answers.duration] : null;

  return (
    <View style={styles.gap18}>
      <View accessibilityRole="radiogroup" style={styles.capsules}>
        {DURATIONS.map((duration, index) => (
          <ChoiceTile
            key={duration.label}
            selected={answers.duration === index}
            height={148}
            radius={22}
            accessibilityLabel={`${duration.label}. ${duration.subtitle}`}
            onPress={() => update({ duration: index })}
            style={styles.capsule}
          >
            {color => (
              <View style={styles.capsuleContent}>
                {index === RECOMMENDED_DURATION ? (
                  <View
                    style={[
                      styles.recommended,
                      { backgroundColor: colors.ember.base },
                    ]}
                  />
                ) : null}
                <TextV2 color={color} style={styles.capsuleNumber}>
                  {duration.minutes}
                </TextV2>
                <TextV2 variant="meta" color={color} style={styles.capsuleUnit}>
                  min
                </TextV2>
              </View>
            )}
          </ChoiceTile>
        ))}
      </View>
      {current ? (
        <View style={styles.gap2}>
          <TextV2 variant="cta">{current.label}</TextV2>
          <TextV2 variant="meta" tone="secondary">
            {current.subtitle}
          </TextV2>
        </View>
      ) : (
        <TextV2 variant="meta" tone="secondary">
          El punto marca la duración recomendada para tu objetivo.
        </TextV2>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  gap2: { gap: 2 },
  gap10: { gap: 10 },
  gap18: { gap: 18 },
  gap26: { gap: 26 },
  gap30: { gap: 30 },
  nameInput: {
    borderBottomWidth: 1.5,
    paddingTop: 6,
    paddingBottom: 12,
    fontSize: 32,
    fontWeight: '500',
    letterSpacing: -0.64,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 14,
  },
  dateColumn: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
  },
  dateValue: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridTight: {
    gap: 10,
  },
  half: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  bars: {
    width: 30,
    height: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bar: {
    width: 6,
    borderRadius: 2,
  },
  levelTexts: {
    flex: 1,
    gap: 2,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  stepperValue: {
    flex: 1,
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 112,
    fontWeight: '600',
    letterSpacing: -6.72,
    lineHeight: 101,
  },
  week: {
    flexDirection: 'row',
    gap: 6,
  },
  weekDay: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsules: {
    flexDirection: 'row',
    gap: 8,
  },
  capsule: {
    flex: 1,
  },
  capsuleContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingBottom: 18,
  },
  recommended: {
    position: 'absolute',
    top: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  capsuleNumber: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.96,
    lineHeight: 34,
  },
  capsuleUnit: {
    opacity: 0.7,
  },
});
