import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Repeat2,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  AuraMark,
  Button,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  Block,
  CARD_SHADOW,
  useProposalColors,
} from '@app/features/ellie/v2/RoutineProposalParts';
import type {
  NutritionPrefsMessage,
  NutritionProposalMessage,
} from '@app/features/ellie/chatModel';
import {
  ALLERGY_LABELS,
  DAY_LETTERS,
  DIET_LABELS,
  SAFETY_NOTE,
  SHOPPING_PREVIEW,
  calcLine,
  calcRows,
  dayGoals,
  dayHeadline,
  dayMeals,
  exampleDay,
  formatKcal,
  formatQty,
  macroLine,
  planBadge,
  planQuickAdjustments,
  planSheetEyebrow,
  prefsChips,
  shoppingList,
  slotLabel,
  todayIndex,
  toggleAllergy,
  type ShownMeal,
} from '@app/features/ellie/nutritionProposalModel';
import {
  ALLERGIES,
  DEFAULT_FOOD_PREFS,
  DIETS,
  MEALS_PER_DAY,
  type FoodPrefs,
  type NutritionProposal,
  type PlanEdits,
  type PlanMeal,
} from '@app/services/ellie/nutritionProposals';

// ELLIE · plan nutricional (handoff 28.4, ELLIE_CARDS_FLOW §2): the questions
// card, the plan card and its detail sheet. Same container, radius and
// actions as the routine card (28.3). Nothing is activated until the user
// confirms in the sheet.

// Sage for kcal and "Cómo lo calculé", Ember for protein, ink for carbs and
// ochre for fat (28.4).
function useNutritionTones() {
  const { colors } = useThemeV2();
  const { isDark } = useAppTheme();
  return {
    sage: isDark ? '#8DBB88' : '#4A7746',
    sageTint: isDark ? 'rgba(94,143,90,.2)' : 'rgba(94,143,90,.12)',
    protein: colors.ember.base,
    proteinText: isDark ? colors.ember.textOnDark : '#B23E10',
    carbs: colors.text.primary,
    fat: '#C49A4A',
    danger: isDark ? colors.ember.textOnDark : colors.ember.deep,
  };
}

// 36 pt option pill (13/600); selected in ink.
function Option({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, { backgroundColor: selected ? colors.cta.primary : tone.pill }]}
    >
      <TextV2 variant="metaStrong" color={selected ? colors.cta.primaryText : undefined}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

function MutedChips({ items }: { items: string[] }) {
  const tone = useProposalColors();
  return (
    <View style={styles.pills}>
      {items.map(item => (
        <View key={item} style={[styles.pill, { backgroundColor: tone.pill }]}>
          <TextV2 variant="captionStrong">{item}</TextV2>
        </View>
      ))}
    </View>
  );
}

function ChangedTag() {
  const tone = useProposalColors();
  return (
    <View style={[styles.tag, { backgroundColor: tone.tagBg }]}>
      <TextV2 color={tone.tagText} style={styles.tagText}>
        Cambiado
      </TextV2>
    </View>
  );
}

// ── Questions card (nutrition_prefs_request) ────────────────────────────────
export function NutritionPrefsCard({
  card,
  current,
  disabled,
  onSubmit,
  onChange,
}: {
  card: NutritionPrefsMessage;
  // get_food_preferences: the saved values (Cambiar, and answered cards of
  // the history).
  current: FoodPrefs | null;
  disabled: boolean;
  onSubmit: (prefs: FoodPrefs) => Promise<boolean>;
  onChange: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const [prefs, setPrefs] = useState<FoodPrefs>(() => current ?? DEFAULT_FOOD_PREFS);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const touched = useRef(false);

  // The saved values arrive after the card: they fill it unless the user
  // already chose something.
  useEffect(() => {
    if (current && !touched.current) {
      setPrefs(current);
    }
  }, [current]);

  const update = (next: Partial<FoodPrefs>) => {
    touched.current = true;
    setPrefs(value => ({ ...value, ...next }));
  };

  if (card.answered || card.prefs) {
    const shown = card.prefs ?? current;
    return (
      <View style={[styles.card, styles.body, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}>
        <View style={styles.headRow}>
          <TextV2 variant="eyebrow" color={colors.text.secondary}>
            TUS PREFERENCIAS
          </TextV2>
          <PressableScale accessibilityRole="button" onPress={onChange} style={styles.link}>
            <TextV2 variant="bodyStrong">Cambiar</TextV2>
          </PressableScale>
        </View>
        {shown ? <MutedChips items={prefsChips(shown)} /> : null}
      </View>
    );
  }

  const submit = async () => {
    setSending(true);
    setFailed(false);
    const ok = await onSubmit(prefs);
    setSending(false);
    setFailed(!ok);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(100)}
      style={[styles.card, styles.body, styles.form, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}
    >
      <View style={styles.question}>
        <TextV2 variant="label">Alergias o intolerancias</TextV2>
        <View style={styles.options}>
          <Option
            label="Ninguna"
            selected={prefs.allergies.length === 0}
            onPress={() => update({ allergies: toggleAllergy(prefs.allergies, null) })}
          />
          {ALLERGIES.map(allergy => (
            <Option
              key={allergy}
              label={ALLERGY_LABELS[allergy]}
              selected={prefs.allergies.includes(allergy)}
              onPress={() => update({ allergies: toggleAllergy(prefs.allergies, allergy) })}
            />
          ))}
        </View>
      </View>

      <View style={styles.question}>
        <TextV2 variant="label">Tipo de alimentación</TextV2>
        <View style={styles.options}>
          {DIETS.map(diet => (
            <Option
              key={diet}
              label={DIET_LABELS[diet]}
              selected={prefs.diet === diet}
              onPress={() => update({ diet })}
            />
          ))}
        </View>
      </View>

      <View style={styles.question}>
        <TextV2 variant="label">
          Alimentos que no te gustan
          <TextV2 variant="meta" color={colors.text.secondary}>
            {' · opcional'}
          </TextV2>
        </TextV2>
        <TextInput
          value={prefs.dislikes}
          onChangeText={dislikes => update({ dislikes })}
          placeholder="Ej. champiñones, coliflor"
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="done"
          maxLength={200}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface.field,
              borderColor: tone.outline,
              color: colors.text.primary,
            },
          ]}
        />
      </View>

      <View style={styles.question}>
        <TextV2 variant="label">Comidas al día</TextV2>
        <View style={styles.options}>
          {MEALS_PER_DAY.map(meals => (
            <Option
              key={meals}
              label={String(meals)}
              selected={prefs.mealsPerDay === meals}
              onPress={() => update({ mealsPerDay: meals })}
            />
          ))}
        </View>
      </View>

      {failed ? (
        <TextV2 variant="meta" color={colors.ember.deep}>
          No se pudieron guardar. Inténtalo de nuevo.
        </TextV2>
      ) : null}
      <Button
        label="Listo"
        loading={sending}
        loadingLabel="Guardando"
        disabled={sending || disabled}
        onPress={() => {
          submit().catch(() => undefined);
        }}
        style={styles.done50}
      />
    </Animated.View>
  );
}

// ── Plan card (nutrition_plan_proposal) ─────────────────────────────────────
function MacroColumns({ proposal }: { proposal: NutritionProposal }) {
  const { colors } = useThemeV2();
  const nutrition = useNutritionTones();
  const items = [
    { label: 'Proteína', grams: proposal.macros.p, pct: proposal.macros.pct.p, bar: nutrition.protein, text: nutrition.proteinText },
    { label: 'Carbohidratos', grams: proposal.macros.c, pct: proposal.macros.pct.c, bar: nutrition.carbs, text: undefined },
    { label: 'Grasas', grams: proposal.macros.g, pct: proposal.macros.pct.g, bar: nutrition.fat, text: undefined },
  ];
  return (
    <View style={styles.macros}>
      {items.map(item => (
        <View key={item.label} style={styles.macro}>
          <View style={[styles.macroBar, { backgroundColor: item.bar }]} />
          <TextV2 variant="caption" color={colors.text.secondary}>
            {item.label}
          </TextV2>
          <View style={styles.macroValue}>
            <TextV2 color={item.text} style={styles.grams}>
              {`${Math.round(item.grams)} g`}
            </TextV2>
            <TextV2 variant="caption" color={colors.text.secondary}>
              {`${Math.round(item.pct)} %`}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

function ExampleRow({ meal, divider }: { meal: PlanMeal; divider: boolean }) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <View style={[styles.exampleRow, divider ? { borderBottomWidth: 1, borderBottomColor: tone.divider } : null]}>
      <View style={styles.slotCol}>
        <TextV2 variant="captionStrong">{slotLabel(meal.slot)}</TextV2>
        {meal.time ? (
          <TextV2 variant="caption" color={colors.text.secondary}>
            {meal.time}
          </TextV2>
        ) : null}
      </View>
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <TextV2 variant="label" numberOfLines={1} style={styles.shrink}>
            {meal.name}
          </TextV2>
          {meal.tag ? <ChangedTag /> : null}
        </View>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {macroLine(meal)}
        </TextV2>
      </View>
      <TextV2 variant="label">{formatKcal(meal.kcal)}</TextV2>
    </View>
  );
}

export function NutritionProposalCard({
  card,
  onOpen,
  onAnother,
  onAdjust,
  onQuickAdjust,
  onOpenNutrition,
  onReload,
}: {
  card: NutritionProposalMessage;
  onOpen: () => void;
  onAnother: () => void;
  onAdjust: () => void;
  onQuickAdjust: (text: string) => void;
  onOpenNutrition: () => void;
  onReload: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const nutrition = useNutritionTones();
  const { proposal, status } = card;
  const example = useMemo(() => (proposal ? exampleDay(proposal) : null), [proposal]);

  if (status === 'loading') {
    return (
      <View style={[styles.card, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}>
        <SkeletonGroup>
          <View style={styles.body}>
            <Skeleton height={14} width="40%" />
            <Skeleton height={52} width="60%" />
            <Skeleton height={60} />
          </View>
        </SkeletonGroup>
      </View>
    );
  }

  if (!proposal) {
    return (
      <PressableScale
        accessibilityRole="button"
        onPress={onReload}
        style={[styles.card, styles.body, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}
      >
        <TextV2 variant="meta" color={colors.text.secondary}>
          No pudimos cargar el plan · <TextV2 variant="metaStrong">Reintentar</TextV2>
        </TextV2>
      </PressableScale>
    );
  }

  const open = status === 'open';
  const inactive = status === 'replaced' || status === 'discarded';

  return (
    <View style={styles.cardWrap}>
      <Animated.View
        entering={FadeInUp.duration(350).delay(100)}
        style={[
          styles.card,
          styles.body,
          { backgroundColor: tone.card, boxShadow: CARD_SHADOW },
          inactive ? styles.replaced : null,
        ]}
      >
        <View style={styles.headRow}>
          <TextV2 variant="eyebrow" color={colors.text.secondary}>
            PLAN NUTRICIONAL
          </TextV2>
          <View style={[styles.badge, { backgroundColor: tone.pill }]}>
            <TextV2 style={styles.badgeText}>{planBadge(proposal)}</TextV2>
          </View>
        </View>

        <View style={styles.kcalRow}>
          <TextV2 color={nutrition.sage} style={styles.kcal}>
            {formatKcal(proposal.kcal)}
          </TextV2>
          <TextV2 color={colors.text.secondary} style={styles.kcalUnit}>
            kcal/día
          </TextV2>
        </View>

        <MacroColumns proposal={proposal} />

        <View style={[styles.calc, { backgroundColor: nutrition.sageTint }]}>
          <TextV2 variant="captionStrong" color={nutrition.sage}>
            Cómo lo calculé
          </TextV2>
          <TextV2 style={styles.calcText}>{calcLine(proposal)}</TextV2>
          <TextV2 color={colors.text.secondary} style={styles.note}>
            {SAFETY_NOTE}
          </TextV2>
        </View>

        {proposal.prefs ? <MutedChips items={prefsChips(proposal.prefs)} /> : null}

        {proposal.reasoning ? (
          <View style={styles.reason}>
            <AuraMark size={20} />
            <TextV2 color={tone.reason} style={styles.reasonText}>
              {proposal.reasoning}
            </TextV2>
          </View>
        ) : null}

        {example && example.meals.length > 0 ? (
          <View style={styles.example}>
            <TextV2 variant="eyebrow" color={colors.text.secondary}>
              UN DÍA DE EJEMPLO
            </TextV2>
            <View style={[styles.exampleList, { borderTopColor: tone.divider }]}>
              {example.meals.map((meal, index) => (
                <ExampleRow
                  key={`${meal.slot}-${index}`}
                  meal={meal}
                  divider={index < example.meals.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        {proposal.trainingAdjust.enabled ? (
          <View style={styles.adjust}>
            <TextV2 variant="meta" color={colors.text.secondary}>
              Ajustar por entreno
            </TextV2>
            {proposal.trainingAdjust.trainKcal !== null ? (
              <View style={[styles.pill, { backgroundColor: nutrition.sageTint }]}>
                <TextV2 variant="captionStrong" color={nutrition.sage}>
                  {`Entreno ${formatKcal(proposal.trainingAdjust.trainKcal)}`}
                </TextV2>
              </View>
            ) : null}
            {proposal.trainingAdjust.restKcal !== null ? (
              <View style={[styles.pill, { backgroundColor: tone.pill }]}>
                <TextV2 variant="captionStrong">
                  {`Descanso ${formatKcal(proposal.trainingAdjust.restKcal)}`}
                </TextV2>
              </View>
            ) : null}
          </View>
        ) : null}

        {open ? (
          <View style={styles.actions}>
            <Button label="Ver y activar" onPress={onOpen} style={styles.flex} />
            <Button label="Otra versión" variant="secondary" onPress={onAnother} style={styles.flex} />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Ajustar el plan"
              onPress={onAdjust}
              style={[styles.round, { boxShadow: `inset 0 0 0 1px ${tone.outline}` }]}
            >
              <SlidersHorizontal size={18} color={colors.text.primary} strokeWidth={1.8} />
            </PressableScale>
          </View>
        ) : status === 'active' ? (
          <View style={styles.done}>
            <Animated.View
              entering={ZoomIn.duration(500)}
              style={[styles.check, { backgroundColor: colors.ember.base }]}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
            </Animated.View>
            <TextV2 variant="bodyL" style={[styles.flex, styles.doneText]}>
              Plan activo
            </TextV2>
            <PressableScale accessibilityRole="button" onPress={onOpenNutrition} style={styles.link}>
              <TextV2 variant="bodyStrong">Ver en Nutrición</TextV2>
              <ChevronRight size={18} color={colors.text.primary} strokeWidth={2} />
            </PressableScale>
          </View>
        ) : inactive ? (
          <TextV2 variant="metaStrong" color={colors.text.secondary}>
            {status === 'discarded' ? 'Descartado' : 'Reemplazado'}
          </TextV2>
        ) : null}
      </Animated.View>

      {open ? (
        <View style={styles.chips}>
          {planQuickAdjustments(proposal).map(label => (
            <PressableScale
              key={label}
              accessibilityRole="button"
              onPress={() => onQuickAdjust(label)}
              style={[styles.chip, { backgroundColor: tone.pill }]}
            >
              <TextV2 variant="metaStrong">{label}</TextV2>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Detail sheet ────────────────────────────────────────────────────────────
function MealCard({
  meal,
  expanded,
  onToggle,
  onChoose,
  chosen,
}: {
  meal: ShownMeal;
  expanded: boolean;
  onToggle: () => void;
  onChoose: (index: number) => void;
  chosen: number | undefined;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <View style={[styles.mealCard, { backgroundColor: tone.block }]}>
      <View style={styles.headRow}>
        <TextV2 variant="metaStrong" color={colors.text.secondary}>
          {`${slotLabel(meal.slot)}${meal.time ? ` · ${meal.time}` : ''}`}
        </TextV2>
        <TextV2 variant="label">{`${formatKcal(meal.kcal)} kcal`}</TextV2>
      </View>
      <View style={styles.nameRow}>
        <TextV2 style={[styles.mealName, styles.shrink]}>{meal.name}</TextV2>
        {meal.changed ? <ChangedTag /> : null}
      </View>
      <TextV2 variant="meta" color={colors.text.secondary}>
        {macroLine(meal)}
      </TextV2>
      {meal.ingredients.length > 0 ? (
        <View style={[styles.ingredients, { borderTopColor: tone.divider }]}>
          {meal.ingredients.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.kv}>
              <TextV2 variant="body" style={styles.shrink}>
                {item.name}
              </TextV2>
              <TextV2 variant="body" color={colors.text.secondary}>
                {formatQty(item)}
              </TextV2>
            </View>
          ))}
        </View>
      ) : null}
      {meal.equivalents.length > 0 ? (
        <>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={onToggle}
            style={[styles.change, { backgroundColor: tone.pill }]}
          >
            <Repeat2 size={16} color={colors.text.primary} strokeWidth={2} />
            <TextV2 variant="metaStrong">Cambiar</TextV2>
          </PressableScale>
          {expanded ? (
            <View style={styles.equivalents}>
              <TextV2 variant="caption" color={colors.text.secondary}>
                Equivalentes · mismas kcal (±5 %) y proteína similar
              </TextV2>
              {meal.equivalents.map((equivalent, index) => (
                <PressableScale
                  key={`${equivalent.name}-${index}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chosen === index }}
                  onPress={() => onChoose(index)}
                  style={[
                    styles.equivalent,
                    { boxShadow: `inset 0 0 0 1px ${chosen === index ? colors.text.primary : tone.outline}` },
                  ]}
                >
                  <TextV2 variant="label" numberOfLines={1} style={styles.flex}>
                    {equivalent.name}
                  </TextV2>
                  <TextV2 variant="caption" color={colors.text.secondary}>
                    {`${formatKcal(equivalent.kcal)} kcal · P ${Math.round(equivalent.p)} g`}
                  </TextV2>
                  {chosen === index ? <Check size={16} color={colors.text.primary} strokeWidth={2.4} /> : null}
                </PressableScale>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function NutritionProposalSheet({
  open,
  proposal,
  busy,
  error,
  onClose,
  onActivate,
  onDiscard,
}: {
  open: boolean;
  proposal: NutritionProposal | null;
  busy: 'activate' | 'discard' | null;
  // The activation failed: the line above the footer and "Reintentar".
  error: string | null;
  onClose: () => void;
  onActivate: (edits: PlanEdits) => void;
  onDiscard: () => void;
}) {
  const { colors, motion } = useThemeV2();
  const tone = useProposalColors();
  const nutrition = useNutritionTones();
  const [edits, setEdits] = useState<PlanEdits>({});
  const [dayIndex, setDayIndex] = useState(todayIndex());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [allShopping, setAllShopping] = useState(false);

  // Every opening starts clean: the changes of a closed sheet are dropped.
  const proposalId = proposal?.id;
  useEffect(() => {
    if (open) {
      setEdits({});
      setDayIndex(todayIndex());
      setExpanded(null);
      setAllShopping(false);
    }
  }, [open, proposalId]);

  // "Reintentar" shakes when the activation fails.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!error) {
      return;
    }
    const step = motion.shake.duration / 5;
    const [a, b, c, d] = motion.shake.offsets;
    shake.value = withSequence(
      withTiming(a, { duration: step }),
      withTiming(b, { duration: step }),
      withTiming(c, { duration: step }),
      withTiming(d, { duration: step }),
      withTiming(0, { duration: step }),
    );
  }, [error, motion.shake, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  if (!proposal) {
    return null;
  }

  const day = proposal.week.find(item => item.index === dayIndex) ?? proposal.week[0] ?? null;
  const meals = day ? dayMeals(day, edits) : [];
  const headline = day ? dayHeadline(proposal, day) : null;
  const shopping = shoppingList(proposal, edits);
  const shownShopping = allShopping ? shopping : shopping.slice(0, SHOPPING_PREVIEW);

  const choose = (key: string, index: number) => {
    setEdits(current => {
      const next = { ...current };
      // The chosen one again: back to the original meal.
      if (next[key] === index) {
        delete next[key];
      } else {
        next[key] = index;
      }
      return next;
    });
  };

  const target = dayGoals(proposal, day);
  const goals = [
    { value: formatKcal(target.kcal), label: 'kcal', bar: nutrition.sage, text: nutrition.sage },
    { value: `${Math.round(target.p)} g`, label: 'Proteína', bar: nutrition.protein, text: nutrition.proteinText },
    { value: `${Math.round(target.c)} g`, label: 'Carbos', bar: nutrition.carbs, text: undefined },
    { value: `${Math.round(target.g)} g`, label: 'Grasas', bar: nutrition.fat, text: undefined },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={planSheetEyebrow(proposal)}
      title="Plan nutricional"
      scrollable
      footer={
        <View style={styles.footer}>
          {error ? (
            <View style={styles.errorRow}>
              <AlertCircle size={16} color={nutrition.danger} strokeWidth={2} />
              <TextV2 variant="meta" color={nutrition.danger} style={styles.flex}>
                {error}
              </TextV2>
            </View>
          ) : null}
          <View style={styles.footerPair}>
            <Animated.View style={[styles.footerMain, shakeStyle]}>
              <Button
                label={error ? 'Reintentar' : 'Activar plan'}
                loading={busy === 'activate'}
                loadingLabel="Activando…"
                disabled={busy !== null}
                onPress={() => onActivate(edits)}
                style={styles.footerButton}
              />
            </Animated.View>
            <Button
              label={busy === 'discard' ? 'Descartando…' : 'Descartar'}
              variant="secondary"
              disabled={busy !== null}
              onPress={onDiscard}
              style={[styles.footerButton, styles.footerSecondary]}
            />
          </View>
        </View>
      }
    >
      <View style={styles.sheetBody}>
        <View style={styles.blockWrap}>
          <TextV2 variant="eyebrow" color={colors.text.secondary} style={styles.blockTitle}>
            OBJETIVOS DEL DÍA
          </TextV2>
          <View style={styles.goals}>
            {goals.map(goal => (
              <View key={goal.label} style={[styles.goal, { backgroundColor: tone.block }]}>
                <View style={[styles.goalBar, { backgroundColor: goal.bar }]} />
                <TextV2 color={goal.text} style={styles.goalValue} numberOfLines={1} adjustsFontSizeToFit>
                  {goal.value}
                </TextV2>
                <TextV2 variant="caption" color={colors.text.secondary}>
                  {goal.label}
                </TextV2>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.blockWrap}>
          <Block title="CÓMO LO CALCULÉ">
            {calcRows(proposal).map((row, index, rows) => (
              <View
                key={row.label}
                style={[
                  styles.calcRow,
                  index < rows.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tone.divider } : null,
                ]}
              >
                <TextV2 variant="body" color={colors.text.secondary} style={styles.flex}>
                  {row.label}
                </TextV2>
                <TextV2 variant={row.strong ? 'bodyStrong' : 'body'} align="right" style={styles.calcValue}>
                  {row.value}
                </TextV2>
              </View>
            ))}
          </Block>
          <TextV2 variant="caption" color={colors.text.secondary} style={styles.blockTitle}>
            {SAFETY_NOTE}
          </TextV2>
        </View>

        {proposal.week.length > 0 ? (
          <View style={styles.blockWrap}>
            <View style={styles.weekHead}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                TU SEMANA
              </TextV2>
              <View style={styles.legend}>
                <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
                <TextV2 variant="caption" color={colors.text.secondary}>
                  Entreno
                </TextV2>
                <View style={[styles.dot, styles.ring, { borderColor: colors.text.tertiary }]} />
                <TextV2 variant="caption" color={colors.text.secondary}>
                  Descanso
                </TextV2>
              </View>
            </View>
            <View style={styles.strip}>
              {DAY_LETTERS.map((letter, index) => {
                const item = proposal.week.find(entry => entry.index === index);
                const selected = day?.index === index;
                return (
                  <PressableScale
                    key={letter}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !item }}
                    disabled={!item}
                    onPress={() => {
                      setDayIndex(index);
                      setExpanded(null);
                    }}
                    style={[
                      styles.dayPill,
                      { backgroundColor: selected ? colors.cta.primary : tone.block },
                    ]}
                  >
                    <TextV2 variant="label" color={selected ? colors.cta.primaryText : undefined}>
                      {letter}
                    </TextV2>
                    {item ? (
                      <View
                        style={[
                          styles.dot,
                          item.type === 'train'
                            ? { backgroundColor: colors.ember.base }
                            : [styles.ring, { borderColor: colors.text.tertiary }],
                        ]}
                      />
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
            {headline ? (
              <View style={styles.headline}>
                <TextV2 style={styles.headlineTitle}>{headline.title}</TextV2>
                {headline.note ? (
                  <TextV2 variant="meta" color={colors.text.secondary}>
                    {headline.note}
                  </TextV2>
                ) : null}
              </View>
            ) : null}
            {meals.map(meal => (
              <MealCard
                key={meal.key}
                meal={meal}
                expanded={expanded === meal.key}
                chosen={meal.changed ? edits[meal.key] : undefined}
                onToggle={() => setExpanded(current => (current === meal.key ? null : meal.key))}
                onChoose={index => choose(meal.key, index)}
              />
            ))}
          </View>
        ) : null}

        {shopping.length > 0 ? (
          <Block title="LISTA DE COMPRAS · SEMANA" trailing={`${shopping.length} productos`}>
            {shownShopping.map((item, index) => (
              <View
                key={`${item.name}-${item.unit}`}
                style={[styles.calcRow, { borderBottomWidth: index < shownShopping.length - 1 || shopping.length > SHOPPING_PREVIEW ? 1 : 0, borderBottomColor: tone.divider }]}
              >
                <TextV2 variant="body" style={styles.flex}>
                  {item.name}
                </TextV2>
                <TextV2 variant="body" color={colors.text.secondary}>
                  {formatQty(item)}
                </TextV2>
              </View>
            ))}
            {shopping.length > SHOPPING_PREVIEW ? (
              <PressableScale
                accessibilityRole="button"
                onPress={() => setAllShopping(value => !value)}
                style={styles.more}
              >
                <TextV2 variant="bodyStrong">{allShopping ? 'Ver menos' : 'Ver lista completa'}</TextV2>
              </PressableScale>
            ) : null}
          </Block>
        ) : null}

        <TextV2 variant="meta" align="center" color={colors.text.secondary}>
          Nada se activa hasta que lo apruebes.
        </TextV2>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  cardWrap: { gap: 10 },
  card: { borderRadius: 24, overflow: 'hidden' },
  replaced: { opacity: 0.55 },
  body: { padding: 16, gap: 14 },
  form: { gap: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  question: { gap: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  input: { height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  done50: { height: 50 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  badge: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700', letterSpacing: 0.8 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  kcal: { fontSize: 52, lineHeight: 58, fontWeight: '600', letterSpacing: -1 },
  kcalUnit: { fontSize: 15 },
  macros: { flexDirection: 'row', gap: 12 },
  macro: { flex: 1, gap: 4 },
  macroBar: { height: 4, borderRadius: 2, marginBottom: 6 },
  macroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  grams: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  calc: { borderRadius: 16, padding: 14, gap: 4 },
  calcText: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  reason: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reasonText: { flex: 1, fontSize: 14, lineHeight: 20 },
  example: { gap: 8 },
  exampleList: { borderTopWidth: 1 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  slotCol: { width: 70 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { height: 18, paddingHorizontal: 6, borderRadius: 5, justifyContent: 'center' },
  tagText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
  adjust: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  sheetBody: { gap: 20, paddingBottom: 12 },
  blockWrap: { gap: 8 },
  blockTitle: { paddingHorizontal: 4 },
  goals: { flexDirection: 'row', gap: 8 },
  goal: { flex: 1, borderRadius: 16, padding: 12, gap: 4 },
  goalBar: { width: 20, height: 3, borderRadius: 2, marginBottom: 4 },
  goalValue: { fontSize: 19, lineHeight: 24, fontWeight: '600' },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  calcValue: { flexShrink: 1, maxWidth: '55%' },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strip: { flexDirection: 'row', gap: 6 },
  dayPill: { flex: 1, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  ring: { borderWidth: 1.5, backgroundColor: 'transparent' },
  headline: { gap: 2, paddingHorizontal: 4, paddingTop: 4 },
  headlineTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  mealCard: { borderRadius: 20, padding: 16, gap: 6 },
  mealName: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  ingredients: { borderTopWidth: 1, marginTop: 8, paddingTop: 10, gap: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  change: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 8,
  },
  equivalents: { gap: 8, marginTop: 6 },
  equivalent: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  more: { alignItems: 'center', paddingVertical: 14 },
  footer: { flex: 1, gap: 8, alignItems: 'stretch' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  footerPair: { flexDirection: 'row', gap: 8 },
  footerMain: { flex: 2 },
  footerButton: { height: 52 },
  footerSecondary: { flex: 1 },
});
