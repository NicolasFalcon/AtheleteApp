import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Minus,
  Plus,
  X,
} from 'lucide-react-native';
import {
  BackButton,
  Button,
  DarkThumb,
  Eyebrow,
  FilterChip,
  PressableScale,
  RoutinePath,
  SearchField,
  Segmented,
  Sheet,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type {
  BuilderExercise,
  ExerciseMetricMode,
} from '@app/features/workouts/types';
import {
  exerciseThumbnail,
  TYPE_IMAGES,
} from '@app/features/workouts/workoutAssets';
import {
  BUILDER_TYPES,
  equipmentLabel,
  LEVEL_KEYS,
  LEVEL_LABELS,
  PICKER_ZONES,
  schemeChip,
  TYPE_LABELS,
  zoneLabel,
  type ZoneKey,
} from '@app/features/workouts/workoutsModel';
import type { LibraryExercise, Workout } from '@app/shared';

export const BUILDER_STEPS = ['Identidad', 'Ejercicios', 'Revisión'] as const;

// ── Header: back · title · three step bars ─────────────────────────────────
export function BuilderHeader({
  title,
  step,
  onBack,
  top,
}: {
  title: string;
  step: number;
  onBack: () => void;
  top: number;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={[styles.header, { paddingTop: top + 8 }]}>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
        <TextV2 variant="bodyStrong" align="center" style={styles.flex}>
          {title}
        </TextV2>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.steps}>
        {BUILDER_STEPS.map((label, index) => (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepBar,
                {
                  backgroundColor:
                    index < step
                      ? colors.ember.base
                      : index === step
                      ? colors.text.primary
                      : colors.divider,
                },
              ]}
            />
            <TextV2
              variant="caption"
              color={index <= step ? colors.text.primary : colors.text.tertiary}
              style={index === step ? styles.stepActive : styles.stepIdle}
            >
              {label}
            </TextV2>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Step 1 · Identidad ─────────────────────────────────────────────────────
export function IdentityStep({
  title,
  description,
  type,
  difficulty,
  duration,
  calories,
  onTitle,
  onDescription,
  onType,
  onDifficulty,
  onDuration,
}: {
  title: string;
  description: string;
  type: Workout['type'];
  difficulty: Workout['difficulty'];
  duration: number;
  calories: number;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  onType: (value: Workout['type']) => void;
  onDifficulty: (value: Workout['difficulty']) => void;
  onDuration: (delta: number) => void;
}) {
  const { colors, layout } = useThemeV2();

  return (
    <>
      <View style={styles.identity}>
        <TextInput
          value={title}
          onChangeText={onTitle}
          placeholder="Nombra tu rutina"
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.nameInput,
            {
              color: colors.text.primary,
              borderBottomColor: colors.outline.strong,
            },
          ]}
          returnKeyType="next"
        />
        <TextInput
          value={description}
          onChangeText={onDescription}
          placeholder="Objetivo o foco · opcional"
          placeholderTextColor={colors.text.tertiary}
          multiline
          style={[styles.descInput, { color: colors.text.primary }]}
        />
      </View>

      <View style={styles.block}>
        <Eyebrow>Tipo de entrenamiento</Eyebrow>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -layout.gutter }}
          contentContainerStyle={[
            styles.typeRow,
            { paddingHorizontal: layout.gutter },
          ]}
        >
          {BUILDER_TYPES.map(item => (
            <TypeChoice
              key={item}
              label={TYPE_LABELS[item]}
              image={TYPE_IMAGES[item]}
              selected={type === item}
              onPress={() => onType(item)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.block}>
        <Eyebrow>Nivel</Eyebrow>
        <Segmented
          options={LEVEL_KEYS.map(key => ({ key, label: LEVEL_LABELS[key] }))}
          value={difficulty}
          onChange={onDifficulty}
        />
      </View>

      <View style={[styles.duration, { borderTopColor: colors.divider }]}>
        <View style={styles.durationTexts}>
          <Eyebrow>Duración</Eyebrow>
          <View style={styles.baseline}>
            <TextV2 variant="displayS">{String(duration)}</TextV2>
            <TextV2 variant="body" tone="secondary">
              {`min · ≈ ${calories} kcal`}
            </TextV2>
          </View>
        </View>
        <View style={styles.stepper}>
          <RoundButton
            icon="minus"
            label="Menos"
            onPress={() => onDuration(-5)}
          />
          <RoundButton
            icon="plus"
            label="Más"
            solid
            onPress={() => onDuration(5)}
          />
        </View>
      </View>
    </>
  );
}

function TypeChoice({
  label,
  image,
  selected,
  onPress,
}: {
  label: string;
  image: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.typeTile,
        selected && {
          boxShadow: `0 0 0 2px ${colors.bg}, 0 0 0 4px ${colors.text.primary}`,
        },
      ]}
    >
      <View style={styles.typeClip}>
        <Image source={image} resizeMode="cover" style={styles.fill} />
        {!selected ? (
          <View style={[StyleSheet.absoluteFill, styles.typeDim]} />
        ) : null}
        <LinearGradient
          colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.88)']}
          locations={[0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {selected ? (
        <View
          style={[styles.typeCheck, { backgroundColor: colors.ember.base }]}
        >
          <Check size={14} color={colors.ember.onText} strokeWidth={2.4} />
        </View>
      ) : null}
      <TextV2 variant="bodyStrong" color="#FFFFFF" style={styles.typeLabel}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

function RoundButton({
  icon,
  label,
  solid = false,
  onPress,
}: {
  icon: 'minus' | 'plus';
  label: string;
  solid?: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.round,
        { backgroundColor: solid ? colors.cta.primary : colors.surface.muted },
      ]}
    >
      <Icon
        size={18}
        color={solid ? colors.cta.primaryText : colors.text.primary}
        strokeWidth={2}
      />
    </PressableScale>
  );
}

// ── Step 2 · Ejercicios ────────────────────────────────────────────────────
export function PickStep({
  exercises,
  selectedIds,
  query,
  zone,
  replaceName,
  onQuery,
  onZone,
  onToggle,
  onCancelReplace,
}: {
  exercises: LibraryExercise[];
  selectedIds: string[];
  query: string;
  zone: ZoneKey | null;
  replaceName: string | null;
  onQuery: (value: string) => void;
  onZone: (zone: ZoneKey | null) => void;
  onToggle: (exercise: LibraryExercise) => void;
  onCancelReplace: () => void;
}) {
  const { colors, layout } = useThemeV2();

  return (
    <>
      <View style={styles.pickHeader}>
        {replaceName ? (
          <View
            style={[styles.replace, { backgroundColor: colors.surface.muted }]}
          >
            <TextV2 variant="meta" style={styles.flex} numberOfLines={1}>
              {`Reemplazar “${replaceName}”`}
            </TextV2>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Cancelar reemplazo"
              onPress={onCancelReplace}
            >
              <X size={16} color={colors.text.secondary} strokeWidth={2} />
            </PressableScale>
          </View>
        ) : null}
        <SearchField
          radius={14}
          placeholder="Buscar ejercicios"
          value={query}
          onChangeText={onQuery}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -layout.gutter }}
          contentContainerStyle={[
            styles.zoneChips,
            { paddingHorizontal: layout.gutter },
          ]}
        >
          {PICKER_ZONES.map(item => (
            <FilterChip
              key={item.label}
              size={36}
              label={item.label}
              selected={zone === item.key}
              onPress={() => onZone(item.key)}
            />
          ))}
        </ScrollView>
      </View>
      <View>
        {exercises.length === 0 ? (
          <TextV2
            variant="body"
            tone="secondary"
            align="center"
            style={styles.pickEmpty}
          >
            Ningún ejercicio coincide con la búsqueda.
          </TextV2>
        ) : null}
        {exercises.map(exercise => {
          const on = selectedIds.includes(exercise.id);
          return (
            <PressableScale
              key={exercise.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={exercise.name}
              onPress={() => onToggle(exercise)}
              style={[styles.pickRow, { borderBottomColor: colors.divider }]}
            >
              <DarkThumb
                source={exerciseThumbnail(exercise.bodyPart)}
                size={60}
                radius={16}
                ring={
                  on
                    ? `0 0 0 2px ${colors.bg}, 0 0 0 3.5px ${colors.ember.base}`
                    : 'none'
                }
              />
              <View style={styles.flexGap2}>
                <TextV2
                  variant="bodyL"
                  style={styles.pickTitle}
                  numberOfLines={2}
                >
                  {exercise.name}
                </TextV2>
                <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
                  {[
                    zoneLabel(exercise.bodyPart),
                    equipmentLabel(exercise.equipment),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </TextV2>
              </View>
              <View
                style={[
                  styles.check,
                  on
                    ? { backgroundColor: colors.ember.base }
                    : { borderWidth: 1.5, borderColor: colors.outline.control },
                ]}
              >
                {on ? (
                  <Check
                    size={15}
                    color={colors.ember.onText}
                    strokeWidth={2.4}
                  />
                ) : (
                  <Plus
                    size={15}
                    color={colors.text.secondary}
                    strokeWidth={2}
                  />
                )}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </>
  );
}

// Dark tray above the footer (step 2): count + "Ordenar y ajustar".
export function BuilderTray({
  exercises,
  onMove,
  onAdjust,
}: {
  exercises: BuilderExercise[];
  onMove: (index: number, direction: 'up' | 'down') => void;
  onAdjust: (index: number) => void;
}) {
  const { colors, scene } = useThemeV2();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.tray, { backgroundColor: scene.plate }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          open ? 'Ocultar ejercicios elegidos' : 'Ordenar y ajustar'
        }
        onPress={() => setOpen(current => !current)}
        style={styles.trayHead}
      >
        <View style={styles.trayCount}>
          <View
            style={[styles.trayBadge, { backgroundColor: colors.ember.base }]}
          >
            <TextV2
              variant="captionStrong"
              color={colors.ember.onText}
              style={styles.bold}
            >
              {String(exercises.length)}
            </TextV2>
          </View>
          <TextV2 variant="bodyStrong" color="#FFFFFF">
            ejercicios
          </TextV2>
        </View>
        <View style={styles.trayToggle}>
          <TextV2 variant="meta" color="#A8A6A1">
            {open ? 'Ocultar' : 'Ordenar y ajustar'}
          </TextV2>
          <ChevronDown
            size={14}
            color="#A8A6A1"
            strokeWidth={2}
            style={open ? styles.rotated : undefined}
          />
        </View>
      </PressableScale>
      {open
        ? exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.trayRow}>
              <View style={styles.trayMoves}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Subir ${exercise.name}`}
                  disabled={index === 0}
                  onPress={() => onMove(index, 'up')}
                  style={index === 0 ? styles.faded : undefined}
                >
                  <ArrowUp size={16} color="#FFFFFF" strokeWidth={2} />
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Bajar ${exercise.name}`}
                  disabled={index === exercises.length - 1}
                  onPress={() => onMove(index, 'down')}
                  style={
                    index === exercises.length - 1 ? styles.faded : undefined
                  }
                >
                  <ArrowDown size={16} color="#FFFFFF" strokeWidth={2} />
                </PressableScale>
              </View>
              <TextV2
                variant="label"
                color="#E8E6E1"
                style={[styles.flex, styles.regular]}
                numberOfLines={1}
              >
                {exercise.name}
              </TextV2>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Ajustar ${exercise.name}`}
                onPress={() => onAdjust(index)}
                style={styles.trayChip}
              >
                <TextV2 variant="captionStrong" color="#FFFFFF">
                  {schemeChip(exercise)}
                </TextV2>
              </PressableScale>
            </View>
          ))
        : null}
    </View>
  );
}

// ── Step 3 · Revisión ──────────────────────────────────────────────────────
export function ReviewStep({
  title,
  type,
  difficulty,
  duration,
  calories,
  exercises,
  onAdjust,
}: {
  title: string;
  type: Workout['type'];
  difficulty: Workout['difficulty'];
  duration: number;
  calories: number;
  exercises: BuilderExercise[];
  onAdjust: (index: number) => void;
}) {
  const { colors } = useThemeV2();
  const meta = [
    TYPE_LABELS[type] ?? type,
    LEVEL_LABELS[difficulty],
    `${duration} min`,
    `${calories} kcal`,
  ].join(' · ');

  return (
    <>
      <View style={styles.cover}>
        <View style={styles.coverClip}>
          <Image
            source={TYPE_IMAGES[type] ?? TYPE_IMAGES.strength}
            resizeMode="cover"
            style={styles.fill}
          />
          <View style={[StyleSheet.absoluteFill, styles.coverDim]} />
          <LinearGradient
            colors={['rgba(20,19,18,.1)', 'rgba(20,19,18,.9)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.coverTag}>
          <TextV2 variant="micro" color="#FFFFFF" style={styles.coverTagText}>
            TUYA
          </TextV2>
        </View>
        <View style={styles.coverTexts}>
          <TextV2 variant="title24" color="#FFFFFF" numberOfLines={2}>
            {title}
          </TextV2>
          <TextV2 variant="meta" color="#D8D6D1" numberOfLines={1}>
            {meta}
          </TextV2>
        </View>
      </View>

      <View style={styles.trio}>
        {[
          [String(exercises.length), 'Ejercicios'],
          [String(duration), 'Minutos'],
          [String(calories), 'kcal'],
        ].map(([value, label], index) => (
          <View key={label} style={styles.trioItem}>
            {index > 0 ? (
              <View
                style={[
                  styles.trioDivider,
                  { backgroundColor: colors.divider },
                ]}
              />
            ) : null}
            <View>
              <TextV2 variant="title28" style={styles.trioValue}>
                {value}
              </TextV2>
              <TextV2 variant="caption" tone="secondary">
                {label}
              </TextV2>
            </View>
          </View>
        ))}
      </View>

      <RoutinePath
        variant="compact"
        steps={exercises.map((exercise, index) => ({
          key: exercise.id,
          title: exercise.name,
          trailing: (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Ajustar ${exercise.name}: ${schemeChip(
                exercise,
              )}`}
              onPress={() => onAdjust(index)}
              style={[
                styles.reviewChip,
                { backgroundColor: colors.surface.muted },
              ]}
            >
              <TextV2 variant="captionStrong">{schemeChip(exercise)}</TextV2>
            </PressableScale>
          ),
        }))}
      />
    </>
  );
}

// ── Adjust one exercise (sets / reps or time / rest) ───────────────────────
export function ExerciseAdjustSheet({
  exercise,
  onClose,
  onMode,
  onNumber,
  onReplace,
  onRemove,
}: {
  exercise: BuilderExercise | null;
  onClose: () => void;
  onMode: (mode: ExerciseMetricMode) => void;
  onNumber: (
    field: 'sets' | 'reps' | 'duration' | 'restTime',
    delta: number,
  ) => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const mode: ExerciseMetricMode = exercise?.duration ? 'duration' : 'reps';

  return (
    <Sheet
      open={Boolean(exercise)}
      onClose={onClose}
      eyebrow="Ajustar"
      title={exercise?.name ?? ''}
      footer={
        <Button label="Listo" fullWidth style={styles.flex} onPress={onClose} />
      }
    >
      {exercise ? (
        <View style={styles.adjust}>
          <Segmented
            options={[
              { key: 'reps', label: 'Repeticiones' },
              { key: 'duration', label: 'Tiempo' },
            ]}
            value={mode}
            onChange={onMode}
          />
          <AdjustRow
            label="Series"
            value={String(exercise.sets ?? 1)}
            onMinus={() => onNumber('sets', -1)}
            onPlus={() => onNumber('sets', 1)}
          />
          {mode === 'reps' ? (
            <AdjustRow
              label="Repeticiones"
              value={String(exercise.reps ?? 10)}
              onMinus={() => onNumber('reps', -1)}
              onPlus={() => onNumber('reps', 1)}
            />
          ) : (
            <AdjustRow
              label="Tiempo"
              value={`${exercise.duration ?? 45} s`}
              onMinus={() => onNumber('duration', -5)}
              onPlus={() => onNumber('duration', 5)}
            />
          )}
          <AdjustRow
            label="Descanso"
            value={`${exercise.restTime} s`}
            onMinus={() => onNumber('restTime', -15)}
            onPlus={() => onNumber('restTime', 15)}
          />
          <View style={styles.adjustActions}>
            <Button
              label="Reemplazar"
              variant="secondary"
              size="md"
              onPress={onReplace}
            />
            <Button
              label="Quitar"
              variant="text"
              size="md"
              onPress={onRemove}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

function AdjustRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.adjustRow}>
      <TextV2 variant="body" style={styles.flex}>
        {label}
      </TextV2>
      <RoundButton
        icon="minus"
        label={`Menos ${label.toLowerCase()}`}
        onPress={onMinus}
      />
      <TextV2 variant="sub" align="center" style={styles.adjustValue}>
        {value}
      </TextV2>
      <RoundButton
        icon="plus"
        label={`Más ${label.toLowerCase()}`}
        solid
        onPress={onPlus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  regular: { fontWeight: '400' },
  faded: { opacity: 0.3 },
  rotated: { transform: [{ rotate: '180deg' }] },
  fill: { width: '100%', height: '100%' },
  header: { paddingHorizontal: 12, paddingBottom: 12, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerSpacer: { width: 44 },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  stepItem: { flex: 1, gap: 6 },
  stepBar: { height: 4, borderRadius: 2 },
  stepActive: { fontWeight: '700' },
  stepIdle: { fontWeight: '500' },
  identity: { gap: 10 },
  nameInput: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  descInput: {
    fontSize: 16,
    lineHeight: 23,
    minHeight: 48,
    paddingVertical: 4,
    textAlignVertical: 'top',
  },
  block: { gap: 12 },
  typeRow: { gap: 10, paddingVertical: 4 },
  typeTile: {
    width: 112,
    height: 144,
    borderRadius: 20,
    backgroundColor: '#1F1D1B',
  },
  typeClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    overflow: 'hidden',
  },
  typeDim: { backgroundColor: 'rgba(20,19,18,.22)' },
  typeCheck: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { position: 'absolute', left: 12, bottom: 12 },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  durationTexts: { gap: 2 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  stepper: { flexDirection: 'row', gap: 8 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickHeader: { gap: 12 },
  replace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
  },
  zoneChips: { gap: 8 },
  pickEmpty: { paddingVertical: 32 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flexGap2: { flex: 1, minWidth: 0, gap: 2 },
  pickTitle: { fontWeight: '600' },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tray: {
    marginHorizontal: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    boxShadow: '0 -10px 28px rgba(0,0,0,.16)',
  },
  trayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trayCount: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trayBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,.08)',
  },
  trayMoves: { flexDirection: 'row', gap: 8 },
  trayChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,.1)',
    justifyContent: 'center',
  },
  cover: {
    height: 230,
    borderRadius: 28,
    boxShadow: '0 18px 40px rgba(0,0,0,.16)',
    backgroundColor: '#141312',
  },
  coverClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    overflow: 'hidden',
  },
  coverDim: { backgroundColor: 'rgba(20,19,18,.1)' },
  coverTag: {
    position: 'absolute',
    left: 18,
    top: 16,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.16)',
    justifyContent: 'center',
  },
  coverTagText: { fontWeight: '700', letterSpacing: 0.66 },
  coverTexts: { position: 'absolute', left: 18, right: 18, bottom: 16, gap: 4 },
  trio: { flexDirection: 'row' },
  trioItem: { flex: 1, flexDirection: 'row' },
  trioDivider: { width: 1, marginRight: 14 },
  trioValue: { fontWeight: '600' },
  reviewChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    justifyContent: 'center',
  },
  adjust: { gap: 16, paddingTop: 6 },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adjustValue: { minWidth: 64 },
  adjustActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
});
