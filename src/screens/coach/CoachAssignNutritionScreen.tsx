import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Info, Send } from 'lucide-react-native';
import {
  BackButton,
  Button,
  GlassHeader,
  GlassSurface,
  PressableScale,
  Segmented,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { useCoachText, type CoachT } from '@app/features/coach/coachCopy';
import {
  DEFAULT_TARGETS,
  KCAL_MAX,
  KCAL_MIN,
  KCAL_STEP,
  MACRO_STEPS,
  clampKcal,
  coachErrorMessage,
  firstName,
  formatKcal,
  macroFit,
  macroPct,
} from '@app/features/coach/coachModel';
import { newClientId, useCoachMutations, useCoachStudent } from '@app/features/coach/useCoach';
import { SAGE, SCENE, StepButton, antonStyle } from '@app/features/coach/v2/CoachParts';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { APP_ROUTES } from '@app/constants/routes';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { MacroTargets } from '@app/services/coach/coachService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'CoachAssignNutrition'>;
type Mode = 'same' | 'train_rest';
type DayKind = 'train' | 'rest';
type MacroKey = 'protein' | 'carbs' | 'fat';

const NOTE_MAX = 500;
const FAT_BLUE = '#7D93B5';

// Asignar nutrición (§30.3): same target every day or training / rest, the
// kcal counter (±50, min 1.200) in a dark scene, the macros with ± (protein
// and fat by 5 g, carbs by 10 g), the stacked bar, the fit line (sage when
// the macros are within ±50 kcal) and an optional note →
// coach_assign_nutrition. The server validates again (kcal 1.000–6.000,
// macros ±10 %, safety minimum, nutrition_not_shared) and its error is shown.
export function CoachAssignNutritionScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, language } = useCoachText();
  const { linkId } = route.params;
  const student = useCoachStudent(linkId);
  const { assignNutrition } = useCoachMutations();
  const clientId = useRef(newClientId());
  const name = student.data?.profile.name ?? '';
  const first = firstName(name);

  const [mode, setMode] = useState<Mode>('same');
  const [train, setTrain] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [rest, setRest] = useState<MacroTargets>({ ...DEFAULT_TARGETS, kcal: 1950, carbs: 180 });
  const [editing, setEditing] = useState<DayKind>('train');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Seeds from the current live assignment ("Editar objetivos"), once.
  const seeded = useRef(false);
  useEffect(() => {
    const nutrition = student.data?.nutrition;
    if (seeded.current || !nutrition) {
      return;
    }
    seeded.current = true;
    const assignment = nutrition.locked ? null : nutrition.assignment;
    if (assignment && assignment.status !== 'replaced' && assignment.status !== 'ended') {
      setMode(assignment.mode);
      setTrain(assignment.train);
      setRest(assignment.rest);
      setNote(assignment.note ?? '');
    }
  }, [student.data]);

  const locked = student.data?.nutrition.locked === true;
  const targets = mode === 'same' || editing === 'train' ? train : rest;
  const setTargets = mode === 'same' || editing === 'train' ? setTrain : setRest;
  const fit = macroFit(targets);

  const change = (key: 'kcal' | MacroKey, sign: 1 | -1, kind: DayKind = mode === 'same' ? 'train' : editing) => {
    setError(null);
    const set = kind === 'train' ? setTrain : setRest;
    set(current => {
      if (key === 'kcal') {
        return { ...current, kcal: clampKcal(current.kcal + sign * KCAL_STEP) };
      }
      return { ...current, [key]: Math.max(0, current[key] + sign * MACRO_STEPS[key]) };
    });
  };

  const send = () => {
    setError(null);
    assignNutrition.mutate(
      {
        linkId,
        targets: mode === 'same' ? { mode, same: train } : { mode, train, rest },
        note: note.trim() ? note.trim().slice(0, NOTE_MAX) : null,
        clientId: clientId.current,
      },
      {
        onSuccess: () => {
          toast.show(t('coach.nut.done', { name: first }));
          safeGoBack(navigation, [APP_ROUTES.CoachStudents]);
        },
        onError: failure => setError(coachErrorMessage(failure, language, first)),
      },
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={t('coach.nut.title')}
        subtitle={name ? t('coach.assign.for', { name }) : undefined}
        left={<BackButton onPress={() => safeGoBack(navigation, [APP_ROUTES.CoachStudents])} />}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 120,
          gap: 22,
        }}
      >
        <Heading text={t('coach.nut.heading')} />
        <Segmented
          options={[
            { key: 'same', label: t('coach.mode.same') },
            { key: 'train_rest', label: t('coach.mode.trainRest') },
          ]}
          value={mode}
          onChange={key => {
            setError(null);
            setMode(key);
            setEditing('train');
          }}
        />

        {mode === 'same' ? (
          <KcalCounter
            label={t('coach.nut.daily')}
            kcal={train.kcal}
            language={language}
            t={t}
            onChange={sign => change('kcal', sign, 'train')}
          />
        ) : (
          <View style={styles.counters}>
            {(['train', 'rest'] as const).map(kind => (
              <KcalCounter
                key={kind}
                compact
                selected={editing === kind}
                onSelect={() => setEditing(kind)}
                label={t(kind === 'train' ? 'coach.nut.train' : 'coach.nut.rest')}
                kcal={(kind === 'train' ? train : rest).kcal}
                language={language}
                t={t}
                onChange={sign => change('kcal', sign, kind)}
              />
            ))}
          </View>
        )}

        {mode === 'train_rest' ? (
          <TextV2 variant="eyebrow" tone="secondary">
            {`${t('coach.nut.editing')} · ${t(editing === 'train' ? 'coach.nut.train' : 'coach.nut.rest')}`}
          </TextV2>
        ) : null}

        <StackedBar targets={targets} />

        <View style={styles.macros}>
          {(['protein', 'carbs', 'fat'] as const).map(key => (
            <MacroRow
              key={key}
              macro={key}
              targets={targets}
              t={t}
              language={language}
              onChange={sign => change(key, sign)}
            />
          ))}
        </View>

        <TextV2 variant="bodyStrong" color={fit.fits ? SAGE : undefined} tone="ember">
          {fit.fits
            ? t('coach.nut.fits', { sum: formatKcal(language, fit.sum) })
            : fit.diff > 0
            ? t('coach.nut.missing', { n: formatKcal(language, fit.diff) })
            : t('coach.nut.over', { n: formatKcal(language, -fit.diff) })}
        </TextV2>

        <View style={styles.fieldHead}>
          <TextV2 variant="bodyStrong" style={styles.flex}>
            {t('coach.nut.note')}
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            {t('coach.optional')}
          </TextV2>
        </View>
        <TextInput
          value={note}
          onChangeText={value => {
            setNote(value);
            setError(null);
          }}
          multiline
          maxLength={NOTE_MAX}
          placeholder={t('coach.nut.note.placeholder')}
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel={t('coach.nut.note')}
          style={[styles.note, { backgroundColor: colors.surface.muted, color: colors.text.primary }]}
        />

        {name ? (
          <View style={styles.info}>
            <Info size={18} color={colors.text.secondary} strokeWidth={1.8} />
            <TextV2 variant="meta" tone="secondary" style={styles.flex}>
              {t('coach.nut.mustAccept', { name: first })}
            </TextV2>
          </View>
        ) : null}

        {error || locked ? (
          <View style={[styles.error, { backgroundColor: 'rgba(255,91,31,.10)' }]}>
            <AlertCircle size={18} color={colors.ember.base} strokeWidth={2} />
            <TextV2 variant="body" tone="ember" style={styles.flex}>
              {error ?? t('coach.error.nutrition_not_shared', { name: first })}
            </TextV2>
          </View>
        ) : null}
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 4, borderTopColor: colors.divider, paddingHorizontal: layout.gutter },
        ]}
      >
        <Button
          label={t('coach.nut.cta')}
          icon={Send}
          disabled={locked || !student.data}
          loading={assignNutrition.isPending}
          onPress={send}
        />
      </GlassSurface>
    </View>
  );
}

function Heading({ text }: { text: string }) {
  const { fonts } = useThemeV2();
  return (
    <TextV2 accessibilityRole="header" style={[antonStyle(fonts.display, 40), styles.upper]}>
      {text}
    </TextV2>
  );
}

function KcalCounter({
  label,
  kcal,
  language,
  t,
  onChange,
  compact = false,
  selected = false,
  onSelect,
}: {
  label: string;
  kcal: number;
  language: EllieLanguage;
  t: CoachT;
  onChange: (sign: 1 | -1) => void;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { fonts, colors } = useThemeV2();
  const Wrapper = onSelect ? PressableScale : View;
  return (
    <Wrapper
      {...(onSelect
        ? { onPress: onSelect, accessibilityRole: 'button' as const, accessibilityState: { selected } }
        : {})}
      style={[
        styles.counter,
        compact && styles.counterCompact,
        { backgroundColor: SCENE, borderColor: selected ? colors.ember.base : 'transparent' },
      ]}
    >
      <TextV2 variant="eyebrow" color="#A8A6A1" align="center">
        {label}
      </TextV2>
      <View style={styles.counterRow}>
        <StepButton
          kind="minus"
          onScene
          size={compact ? 36 : 52}
          disabled={kcal <= KCAL_MIN}
          accessibilityLabel={`${t('coach.nut.less')} ${KCAL_STEP} kcal`}
          onPress={() => onChange(-1)}
        />
        <TextV2
          color="#FFFFFF"
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[antonStyle(fonts.display, compact ? 36 : 64), styles.flex]}
        >
          {formatKcal(language, kcal)}
        </TextV2>
        <StepButton
          kind="plus"
          onScene
          size={compact ? 36 : 52}
          disabled={kcal >= KCAL_MAX}
          accessibilityLabel={`${t('coach.nut.more')} ${KCAL_STEP} kcal`}
          onPress={() => onChange(1)}
        />
      </View>
      <TextV2 variant="body" color="#A8A6A1" align="center">
        kcal
      </TextV2>
    </Wrapper>
  );
}

function StackedBar({ targets }: { targets: MacroTargets }) {
  const { colors } = useThemeV2();
  const parts = [
    { key: 'p', kcal: targets.protein * 4, color: colors.ember.base },
    { key: 'c', kcal: targets.carbs * 4, color: colors.text.primary },
    { key: 'g', kcal: targets.fat * 9, color: FAT_BLUE },
  ];
  const total = parts.reduce((sum, part) => sum + part.kcal, 0) || 1;
  return (
    <View style={styles.stack}>
      {parts.map(part => (
        <View key={part.key} style={[styles.stackPart, { flex: Math.max(part.kcal / total, 0.001), backgroundColor: part.color }]} />
      ))}
    </View>
  );
}

function MacroRow({
  macro,
  targets,
  t,
  language,
  onChange,
}: {
  macro: MacroKey;
  targets: MacroTargets;
  t: CoachT;
  language: EllieLanguage;
  onChange: (sign: 1 | -1) => void;
}) {
  const { colors } = useThemeV2();
  const color = macro === 'protein' ? colors.ember.base : macro === 'carbs' ? colors.text.primary : FAT_BLUE;
  const label = t(macro === 'protein' ? 'coach.macro.protein' : macro === 'carbs' ? 'coach.macro.carbs' : 'coach.macro.fat');
  const kcal = macro === 'fat' ? targets.fat * 9 : targets[macro] * 4;
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <View style={styles.flex}>
        <TextV2 variant="sub">{label}</TextV2>
        <TextV2 variant="body" tone="secondary">
          {`${macroPct(targets, macro)} % · ${formatKcal(language, kcal)} kcal`}
        </TextV2>
      </View>
      <StepButton
        kind="minus"
        disabled={targets[macro] <= 0}
        accessibilityLabel={`${t('coach.nut.less')} ${label}`}
        onPress={() => onChange(-1)}
      />
      <TextV2 variant="sub" align="center" style={styles.macroValue}>
        {`${Math.round(targets[macro])} g`}
      </TextV2>
      <StepButton kind="plus" accessibilityLabel={`${t('coach.nut.more')} ${label}`} onPress={() => onChange(1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  upper: { textTransform: 'uppercase' },
  counters: { gap: 12 },
  counter: { borderRadius: 26, paddingVertical: 18, paddingHorizontal: 16, gap: 4, borderWidth: 2 },
  counterCompact: { paddingVertical: 14 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 3 },
  stackPart: { height: 8, borderRadius: 4 },
  macros: { gap: 18 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroDot: { width: 12, height: 12, borderRadius: 6 },
  macroValue: { minWidth: 70 },
  fieldHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  note: { minHeight: 110, borderRadius: 20, padding: 16, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  error: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
