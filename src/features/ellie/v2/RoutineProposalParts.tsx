import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import Video from 'react-native-video';
import {
  Bookmark,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Activity,
  Flame,
  Info,
  Play,
  Repeat,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react-native';
import {
  AppImage,
  AuraMark,
  Button,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { RoutineCover } from '@app/components/v2/RoutineCover';
import { focusWord } from '@app/features/workouts/routineFocus';
import { addToWeekText } from '@app/features/week/addToWeekCopy';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { MEDIA_PLACEHOLDER, MEDIA_PLACEHOLDER_THUMB } from '@app/features/workouts/workoutAssets';
import { useLatchedMediaUrl } from '@app/lib/media/mediaUrls';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  availableVariants,
  blockMinutes,
  blockTitle,
  compactExercises,
  editedMain,
  exerciseDetail,
  liveTotals,
  proposalBadge,
  proposalChanges,
  proposalMeta,
  quickAdjustments,
  sheetEyebrow,
  stepsLine,
  TAG_LABEL,
  type SheetExercise,
} from '@app/features/ellie/routineProposalModel';
import type {
  DiscomfortCheckMessage,
  RoutineProposalMessage,
} from '@app/features/ellie/chatModel';
import {
  DISCOMFORT_OTHER,
  DISCOMFORT_ZONES,
  discomfortSummary,
  zoneLabel,
} from '@app/features/ellie/discomfortModel';
import {
  NO_EDITS,
  type ProposalChangeTag,
  type ProposalStep,
  type ProposalVariant,
  type RoutineEdits,
  type RoutineProposal,
} from '@app/services/ellie/ellieProposals';

// ELLIE · propuesta de rutina (handoff 28.3, ELLIE_CARDS_FLOW §1): the card in
// the chat and its detail sheet. Nothing is saved until the user confirms.

// Card surfaces of 28.3: white / #1C1B19, the change mark in Ember tint.
export function useProposalColors() {
  const { colors } = useThemeV2();
  const { isDark } = useAppTheme();
  return {
    card: isDark ? '#1C1B19' : '#FFFFFF',
    sheet: isDark ? '#121110' : '#F7F6F3',
    block: isDark ? '#1C1B19' : '#FFFFFF',
    reason: isDark ? colors.text.bodySoft : '#3D3B38',
    pill: colors.surface.muted,
    outline: isDark ? 'rgba(255,255,255,.14)' : '#E4E2DD',
    divider: isDark ? 'rgba(255,255,255,.08)' : '#E4E2DD',
    tagBg: isDark ? 'rgba(255,90,42,.18)' : '#FFE9E0',
    tagText: isDark ? colors.ember.textOnDark : '#B23E10',
    struck: isDark ? colors.text.tertiary : '#A8A6A1',
  };
}

export const CARD_SHADOW = '0 1px 2px rgba(0,0,0,.04), 0 14px 34px rgba(18,18,18,.12)';

function ChangeTag({ tag }: { tag: ProposalChangeTag }) {
  const tone = useProposalColors();
  return (
    <View style={[styles.tag, { backgroundColor: tone.tagBg }]}>
      <TextV2 color={tone.tagText} style={styles.tagText}>
        {TAG_LABEL[tag]}
      </TextV2>
    </View>
  );
}

// Muscles filled, equipment outlined (secondary text in the card, primary in
// the sheet).
export function Pills({ items, outlined, strong }: { items: string[]; outlined?: boolean; strong?: boolean }) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <>
      {items.map(item => (
        <View
          key={`${outlined ? 'e' : 'm'}-${item}`}
          style={[
            styles.pill,
            outlined
              ? { boxShadow: `inset 0 0 0 1px ${tone.outline}` }
              : { backgroundColor: tone.pill },
          ]}
        >
          <TextV2 variant="captionStrong" color={outlined && !strong ? colors.text.secondary : undefined}>
            {item}
          </TextV2>
        </View>
      ))}
    </>
  );
}

// Warm-up / cool-down in one row: icon in a muted 40 pt box.
export function StepsRow({
  icon: Icon,
  label,
  steps,
  divider,
}: {
  icon: typeof Flame;
  label: string;
  steps: ProposalStep[];
  divider?: boolean;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <View style={[styles.row, divider ? { borderBottomWidth: 1, borderBottomColor: tone.divider } : null]}>
      <View style={[styles.thumb, styles.iconBox, { backgroundColor: tone.pill }]}>
        <Icon size={18} color={colors.text.secondary} strokeWidth={1.8} />
      </View>
      <View style={styles.flex}>
        <TextV2 variant="label">{blockTitle(label, steps)}</TextV2>
        <TextV2 variant="caption" color={colors.text.secondary} numberOfLines={2}>
          {stepsLine(steps)}
        </TextV2>
      </View>
    </View>
  );
}

// A row with its thumbnail. Card: 40 pt, 14/600 + 12. Sheet: 44 pt,
// 16/600 + 13, padded inside its block so the dividers run edge to edge.
export function ExerciseLine({
  name,
  detail,
  image,
  tag,
  divider,
  size = 'card',
  trailing,
}: {
  name: string;
  detail: string | null;
  image: string | null;
  tag?: ProposalChangeTag | null;
  divider?: boolean;
  size?: 'card' | 'sheet';
  trailing?: ReactNode;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const sheet = size === 'sheet';
  return (
    <View
      style={[
        sheet ? styles.sheetRow : styles.row,
        divider ? { borderBottomWidth: 1, borderBottomColor: tone.divider } : null,
      ]}
    >
      <AppImage
        source={{ mediaKey: image, fallback: MEDIA_PLACEHOLDER_THUMB }}
        style={sheet ? styles.sheetThumb : styles.thumb}
      />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <TextV2 variant="label" numberOfLines={1} style={[styles.shrink, sheet ? styles.sheetName : null]}>
            {name}
          </TextV2>
          {tag ? <ChangeTag tag={tag} /> : null}
        </View>
        {detail ? (
          <TextV2 variant={sheet ? 'meta' : 'caption'} color={colors.text.secondary}>
            {detail}
          </TextV2>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
export function RoutineProposalCard({
  card,
  onOpen,
  onSave,
  onAdjust,
  onAddToWeek,
  onQuickAdjust,
  onOpenWorkouts,
  onReload,
}: {
  card: RoutineProposalMessage;
  onOpen: () => void;
  onSave: () => void;
  onAdjust: () => void;
  onAddToWeek: () => void;
  onQuickAdjust: (text: string) => void;
  onOpenWorkouts: () => void;
  onReload: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const language = useProfileLanguage();
  const { profile } = useAuth();
  const { proposal, status } = card;

  if (status === 'loading' || (!proposal && status !== 'unavailable')) {
    return (
      <View style={[styles.card, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}>
        <SkeletonGroup>
          <View style={styles.loading}>
            <Skeleton height={150} width="100%" />
            <View style={styles.body}>
              <Skeleton height={18} width="70%" />
              <Skeleton height={14} width="50%" />
            </View>
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
          No pudimos cargar la propuesta · <TextV2 variant="metaStrong">Reintentar</TextV2>
        </TextV2>
      </PressableScale>
    );
  }

  const open = status === 'open' || status === 'saving';
  const replaced = status === 'replaced';
  const discarded = status === 'discarded';
  const compact = compactExercises(proposal);

  return (
    <View style={styles.cardWrap}>
      <Animated.View
        entering={FadeInUp.duration(350).delay(100)}
        style={[
          styles.card,
          { backgroundColor: tone.card, boxShadow: CARD_SHADOW },
          replaced || discarded ? styles.replaced : null,
        ]}
      >
        {/* Cover 7:3 (§28.16): the focus word on the background; the
            title and the meta go below it. */}
        <RoutineCover
          format="card"
          word={proposal.focus ? focusWord(proposal.focus, language) : null}
          focus={proposal.focus}
          gender={profile?.gender}
        >
          <View style={styles.badge}>
            <TextV2 color="#FFFFFF" style={styles.badgeText}>
              {proposalBadge(proposal)}
            </TextV2>
          </View>
        </RoutineCover>

        <View style={styles.body}>
          <View style={styles.heroText}>
            <TextV2 variant="title22" numberOfLines={2}>
              {proposal.title}
            </TextV2>
            <TextV2 variant="meta" color={colors.text.secondary}>
              {proposalMeta(proposal)}
            </TextV2>
          </View>

          {proposal.muscles.length + proposal.equipment.length > 0 ? (
            <View style={styles.pills}>
              <Pills items={proposal.muscles} />
              <Pills items={proposal.equipment} outlined />
            </View>
          ) : null}

          {proposal.reasoning ? (
            <View style={styles.reason}>
              <AuraMark size={20} />
              <TextV2 color={tone.reason} style={styles.reasonText}>
                {proposal.reasoning}
              </TextV2>
            </View>
          ) : null}

          {proposal.readinessNote ? (
            <View style={styles.readiness}>
              <Info size={14} color={colors.text.secondary} strokeWidth={2} style={styles.readinessIcon} />
              <TextV2 color={colors.text.secondary} style={styles.readinessText}>
                {proposal.readinessNote}
              </TextV2>
            </View>
          ) : null}

          <View style={[styles.list, { borderTopColor: tone.divider }]}>
            {compact.warmup ? (
              <StepsRow icon={Flame} label="Calentamiento" steps={proposal.warmup} divider />
            ) : null}
            {compact.exercises.map(exercise => (
              <ExerciseLine
                key={exercise.exerciseId}
                name={exercise.name}
                detail={exerciseDetail(exercise)}
                image={exercise.image}
                tag={exercise.tag}
                divider
              />
            ))}
            {compact.more > 0 ? (
              <TextV2
                variant="metaStrong"
                color={colors.text.secondary}
                style={[styles.more, { borderBottomColor: tone.divider }]}
              >
                {`+${compact.more} más`}
              </TextV2>
            ) : null}
            {proposal.removed.map(item => (
              <TextV2
                key={`removed-${item.exerciseId || item.name}`}
                variant="meta"
                color={tone.struck}
                style={[styles.removed, { borderBottomColor: tone.divider }]}
              >
                {'Quitado: '}
                <TextV2 variant="meta" color={tone.struck} style={styles.struck}>
                  {item.name}
                </TextV2>
              </TextV2>
            ))}
          </View>

          {open ? (
            <>
            <View style={styles.actions}>
              <Button
                label="Ver y aprobar"
                size="md"
                disabled={status === 'saving'}
                onPress={onOpen}
                style={styles.approve}
              />
              <Button
                label="Guardar"
                variant="secondary"
                size="md"
                icon={Bookmark}
                loading={status === 'saving'}
                loadingLabel="Guardando"
                disabled={status === 'saving'}
                onPress={onSave}
                style={styles.flex}
              />
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Ajustar la rutina"
                onPress={onAdjust}
                style={[styles.round, { boxShadow: `inset 0 0 0 1px ${tone.outline}` }]}
              >
                <SlidersHorizontal size={18} color={colors.text.primary} strokeWidth={1.8} />
              </PressableScale>
            </View>
            <Button
              label={addToWeekText(language, 'addToWeek.action')}
              variant="outline"
              size="md"
              icon={CalendarPlus}
              disabled={status === 'saving'}
              onPress={onAddToWeek}
            />
            </>
          ) : status === 'saved' ? (
            <View style={styles.done}>
              <Animated.View
                entering={ZoomIn.duration(500)}
                style={[styles.check, { backgroundColor: colors.ember.base }]}
              >
                <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
              </Animated.View>
              <TextV2 variant="bodyL" style={[styles.flex, styles.doneText]}>
                Guardada
              </TextV2>
              <PressableScale accessibilityRole="button" onPress={onOpenWorkouts} style={styles.link}>
                <TextV2 variant="bodyStrong">Ver en Entrenos</TextV2>
                <ChevronRight size={18} color={colors.text.primary} strokeWidth={2} />
              </PressableScale>
            </View>
          ) : status === 'started' ? (
            <View style={styles.done}>
              <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
                <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
              </View>
              <TextV2 variant="bodyL" style={styles.doneText}>
                Sesión empezada
              </TextV2>
            </View>
          ) : replaced || discarded ? (
            <TextV2 variant="metaStrong" color={colors.text.secondary}>
              {discarded ? 'Descartada' : 'Reemplazada'}
            </TextV2>
          ) : null}
        </View>
      </Animated.View>

      {open ? (
        <View style={styles.chips}>
          {quickAdjustments(proposal).map(label => (
            <PressableScale
              key={label}
              accessibilityRole="button"
              disabled={status === 'saving'}
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

// ── Discomfort check ────────────────────────────────────────────────────────
// Under ELLIE's question: the chips ("Tengo otra molestia" opens the zones);
// once answered, the answer in one line and no chips.
export function DiscomfortCheckCard({
  card,
  disabled,
  onAnswer,
}: {
  card: DiscomfortCheckMessage;
  disabled: boolean;
  onAnswer: (chip: string, otherZone?: string) => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const [choosingZone, setChoosingZone] = useState(false);

  if (card.answer) {
    return (
      <View style={[styles.card, styles.placeholder, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}>
        <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
          <Check size={16} color="#FFFFFF" strokeWidth={2.6} />
        </View>
        <TextV2 variant="label" style={styles.flex}>
          {discomfortSummary(card.answer)}
        </TextV2>
      </View>
    );
  }

  const chip = (label: string, onPress: () => void) => (
    <PressableScale
      key={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: tone.pill }]}
    >
      <TextV2 variant="metaStrong">{label}</TextV2>
    </PressableScale>
  );

  return (
    <View style={styles.cardWrap}>
      <View style={[styles.card, styles.placeholder, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}>
        <View style={[styles.thumb, styles.iconBox, { backgroundColor: tone.pill }]}>
          <Activity size={18} color={colors.text.secondary} strokeWidth={1.8} />
        </View>
        <View style={styles.flex}>
          <TextV2 variant="label">
            {card.zones.length > 0 ? card.zones.map(zoneLabel).join(' · ') : 'Molestia'}
          </TextV2>
          <TextV2 variant="caption" color={colors.text.secondary}>
            {choosingZone ? '¿Dónde es la molestia?' : '¿Sigue la molestia?'}
          </TextV2>
        </View>
      </View>
      <View style={styles.chips}>
        {choosingZone
          ? [
              ...DISCOMFORT_ZONES.map(zone =>
                chip(zoneLabel(zone), () => onAnswer(DISCOMFORT_OTHER, zone)),
              ),
              chip('Cancelar', () => setChoosingZone(false)),
            ]
          : card.chips.map(label =>
              chip(label, () => (label === DISCOMFORT_OTHER ? setChoosingZone(true) : onAnswer(label))),
            )}
      </View>
    </View>
  );
}

// ── Detail sheet ────────────────────────────────────────────────────────────
function ExerciseVideo({ image, video, name }: { image: string | null; video: string | null; name: string }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = useLatchedMediaUrl(playing ? video : null);
  return (
    <View style={styles.video}>
      {playing && url && !failed ? (
        <Video
          source={{ uri: url }}
          resizeMode="cover"
          repeat
          muted
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          <AppImage
            source={{ mediaKey: image, fallback: MEDIA_PLACEHOLDER }}
            style={StyleSheet.absoluteFill}
            accessibilityLabel={`Video de técnica de ${name}`}
          />
          {video && !failed ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Reproducir video"
              onPress={() => setPlaying(true)}
              style={styles.play}
            >
              <Play size={22} color="#121212" strokeWidth={2} style={styles.playIcon} />
            </PressableScale>
          ) : null}
        </>
      )}
    </View>
  );
}

function MainRow({
  exercise,
  expanded,
  variants,
  canRemove,
  divider,
  onToggle,
  onSwap,
  onRemove,
}: {
  exercise: SheetExercise;
  expanded: boolean;
  variants: ProposalVariant[];
  canRemove: boolean;
  divider: boolean;
  onToggle: () => void;
  onSwap: (variant: ProposalVariant) => void;
  onRemove: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const [choosing, setChoosing] = useState(false);
  useEffect(() => {
    if (!expanded) {
      setChoosing(false);
    }
  }, [expanded]);

  return (
    <View style={divider ? { borderBottomWidth: 1, borderBottomColor: tone.divider } : null}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
      >
        <ExerciseLine
          name={exercise.name}
          detail={exerciseDetail(exercise)}
          image={exercise.image}
          tag={exercise.tag}
          size="sheet"
          trailing={
            <ChevronDown
              size={18}
              color={colors.text.tertiary}
              strokeWidth={2}
              style={expanded ? styles.flip : undefined}
            />
          }
        />
      </PressableScale>
      {expanded ? (
        <View style={[styles.expanded, styles.inset]}>
          <ExerciseVideo image={exercise.image} video={exercise.video} name={exercise.name} />
          {exercise.tips.length > 0 ? (
            <View style={styles.tips}>
              {exercise.tips.map(tip => (
                <View key={tip} style={styles.tip}>
                  <View style={[styles.tipDot, { backgroundColor: colors.ember.base }]} />
                  <TextV2 variant="bodyL" style={styles.flex}>
                    {tip}
                  </TextV2>
                </View>
              ))}
            </View>
          ) : null}
          {exercise.primaryMuscle ? (
            <View style={[styles.primaryRow, { borderTopColor: tone.divider }]}>
              <TextV2 variant="body" color={colors.text.secondary}>
                Músculo principal
              </TextV2>
              <TextV2 variant="bodyStrong">{exercise.primaryMuscle}</TextV2>
            </View>
          ) : null}
          <View style={styles.rowActions}>
            {variants.length > 0 ? (
              <Button
                label="Cambiar por variante"
                variant="secondary"
                size="md"
                icon={Repeat}
                onPress={() => setChoosing(value => !value)}
                style={[styles.rowButton, styles.flex]}
              />
            ) : null}
            <Button
              label="Quitar"
              variant="outline"
              size="md"
              icon={Trash2}
              disabled={!canRemove}
              onPress={onRemove}
              style={[styles.rowButton, variants.length > 0 ? null : styles.flex]}
            />
          </View>
          {choosing ? (
            <View style={styles.variants}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {exercise.muscleGroup ? `Variantes · ${exercise.muscleGroup}` : 'Variantes'}
              </TextV2>
              {variants.map(variant => (
                <PressableScale
                  key={variant.exerciseId}
                  accessibilityRole="button"
                  onPress={() => onSwap(variant)}
                  style={styles.variant}
                >
                  <AppImage source={{ mediaKey: variant.image, fallback: MEDIA_PLACEHOLDER_THUMB }} style={styles.thumb} />
                  <TextV2 variant="label" style={styles.flex}>
                    {variant.name}
                  </TextV2>
                  <ChevronRight size={16} color={colors.text.tertiary} strokeWidth={2} />
                </PressableScale>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// "CALENTAMIENTO ……… 5 min": eyebrow on the left, its measure on the right,
// then the white card (radius 20).
export function Block({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: string | null;
  children: ReactNode;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <View style={styles.blockWrap}>
      <View style={styles.blockHead}>
        <TextV2 variant="eyebrow" color={colors.text.secondary}>
          {title}
        </TextV2>
        {trailing ? (
          <TextV2 variant="meta" color={colors.text.secondary}>
            {trailing}
          </TextV2>
        ) : null}
      </View>
      <View style={[styles.block, { backgroundColor: tone.block }]}>{children}</View>
    </View>
  );
}

// Warm-up / cool-down in the sheet: one fixed row per step.
function SheetSteps({ steps }: { steps: ProposalStep[] }) {
  return (
    <>
      {steps.map((step, index) => (
        <ExerciseLine
          key={`${step.exerciseId}-${index}`}
          name={step.name}
          detail={step.detail}
          image={null}
          size="sheet"
          divider={index < steps.length - 1}
        />
      ))}
    </>
  );
}

const minutesLabel = (steps: ProposalStep[]) => {
  const minutes = blockMinutes(steps);
  return minutes ? `${minutes} min` : null;
};

function LabeledPills({ label, items, outlined }: { label: string; items: string[]; outlined?: boolean }) {
  const { colors } = useThemeV2();
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.labeled}>
      <TextV2 variant="meta" color={colors.text.secondary} style={styles.label96}>
        {label}
      </TextV2>
      <View style={[styles.pills, styles.flex]}>
        <Pills items={items} outlined={outlined} strong />
      </View>
    </View>
  );
}

// A row of the Cambios block: dot + label column, then the names.
function ChangeLine({
  dot,
  label,
  names,
  struck,
}: {
  dot: string;
  label: string;
  names: string[];
  struck?: boolean;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  return (
    <View style={styles.change}>
      <View style={styles.changeLabel}>
        <View style={[styles.changeDot, { backgroundColor: dot }]} />
        <TextV2 variant="metaStrong" color={colors.text.secondary}>
          {label}
        </TextV2>
      </View>
      <TextV2
        variant="body"
        color={struck ? tone.struck : undefined}
        style={[styles.flex, struck ? styles.struck : null]}
      >
        {names.join(' · ')}
      </TextV2>
    </View>
  );
}

export function RoutineProposalSheet({
  open,
  proposal,
  busy,
  onClose,
  onStart,
  onSave,
  onDiscard,
}: {
  open: boolean;
  proposal: RoutineProposal | null;
  busy: 'start' | 'save' | 'discard' | null;
  onClose: () => void;
  onStart: (edits: RoutineEdits) => void;
  onSave: (edits: RoutineEdits) => void;
  onDiscard: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const language = useProfileLanguage();
  const [edits, setEdits] = useState<RoutineEdits>(NO_EDITS);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Every opening starts from the proposal as ELLIE made it.
  useEffect(() => {
    if (open) {
      setEdits(NO_EDITS);
      setExpanded(null);
    }
  }, [open, proposal?.id]);

  const main = useMemo(() => (proposal ? editedMain(proposal, edits) : []), [edits, proposal]);
  if (!proposal) {
    return null;
  }
  const totals = liveTotals(proposal, edits);
  const changes = proposalChanges(proposal, edits);

  const swap = (originalId: string, variant: ProposalVariant) => {
    setEdits(current => ({ ...current, replace: { ...current.replace, [originalId]: variant } }));
    setExpanded(null);
  };
  const remove = (originalId: string) => {
    setEdits(current => {
      const replace = { ...current.replace };
      delete replace[originalId];
      return { replace, remove: [...current.remove, originalId] };
    });
    setExpanded(null);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={sheetEyebrow(proposal, language)}
      title={proposal.title}
      scrollable
      footer={
        <View style={styles.footer}>
          <View style={styles.footerPair}>
            <Button
              label="Empezar ahora"
              icon={Play}
              loading={busy === 'start'}
              loadingLabel="Empezando"
              disabled={busy !== null}
              onPress={() => onStart(edits)}
              style={styles.footerButton}
            />
            <Button
              label="Guardar en mis rutinas"
              variant="secondary"
              size="lg"
              loading={busy === 'save'}
              loadingLabel="Guardando"
              disabled={busy !== null}
              onPress={() => onSave(edits)}
              style={styles.footerButton}
            />
          </View>
          <PressableScale
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={onDiscard}
            style={styles.discard}
          >
            <TextV2 variant="bodyStrong" color={colors.text.secondary}>
              {busy === 'discard' ? 'Descartando…' : 'Descartar'}
            </TextV2>
          </PressableScale>
        </View>
      }
    >
      <View style={styles.sheetBody}>
        <View style={styles.totals}>
          {[
            { value: totals.minutes, label: 'min' },
            { value: totals.exercises, label: 'ejercicios' },
            { value: totals.sets, label: 'series' },
          ].map(item => (
            <View key={item.label} style={[styles.total, { backgroundColor: tone.block }]}>
              <TextV2 variant="title24">{String(item.value)}</TextV2>
              <TextV2 variant="caption" color={colors.text.secondary}>
                {item.label}
              </TextV2>
            </View>
          ))}
        </View>

        <View style={styles.labeledGroup}>
          <LabeledPills label="Músculos" items={proposal.muscles} />
          <LabeledPills label="Equipamiento" items={proposal.equipment} outlined />
        </View>

        {changes ? (
          <View style={[styles.changesCard, { backgroundColor: tone.block }]}>
            <TextV2 variant="eyebrow" color={colors.text.secondary}>
              {changes.title}
            </TextV2>
            {changes.added.length > 0 ? (
              <ChangeLine dot={colors.ember.base} label="Añadidos" names={changes.added} />
            ) : null}
            {changes.adjusted.length > 0 ? (
              <ChangeLine dot={colors.text.tertiary} label="Ajustados" names={changes.adjusted} />
            ) : null}
            {changes.removed.length > 0 ? (
              <ChangeLine dot={tone.struck} label="Quitados" names={changes.removed} struck />
            ) : null}
          </View>
        ) : null}

        {proposal.warmup.length > 0 ? (
          <Block title="CALENTAMIENTO" trailing={minutesLabel(proposal.warmup)}>
            <SheetSteps steps={proposal.warmup} />
          </Block>
        ) : null}

        <Block title="PRINCIPAL" trailing={`${totals.exercises} ejercicios · ${totals.sets} series`}>
          {main.map((exercise, index) => (
            <MainRow
              key={exercise.originalId}
              exercise={exercise}
              expanded={expanded === exercise.originalId}
              variants={availableVariants(exercise, main)}
              canRemove={main.length > 1}
              divider={index < main.length - 1}
              onToggle={() =>
                setExpanded(current => (current === exercise.originalId ? null : exercise.originalId))
              }
              onSwap={variant => swap(exercise.originalId, variant)}
              onRemove={() => remove(exercise.originalId)}
            />
          ))}
        </Block>

        {proposal.cooldown.length > 0 ? (
          <Block title="VUELTA A LA CALMA" trailing={minutesLabel(proposal.cooldown)}>
            <SheetSteps steps={proposal.cooldown} />
          </Block>
        ) : null}

        <TextV2 variant="meta" align="center" color={colors.text.secondary}>
          Nada se guarda hasta que la apruebes.
        </TextV2>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  fill: { width: '100%', height: '100%' },
  cardWrap: { gap: 10 },
  card: { borderRadius: 24, overflow: 'hidden' },
  replaced: { opacity: 0.55 },
  loading: { gap: 0 },
  badge: {
    position: 'absolute',
    top: 12,
    right: 14,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.18)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.28)',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700', letterSpacing: 0.8 },
  heroText: { gap: 3 },
  body: { padding: 16, gap: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  reason: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reasonText: { flex: 1, fontSize: 14, lineHeight: 20 },
  readiness: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  readinessIcon: { marginTop: 3 },
  readinessText: { flex: 1, fontSize: 14, lineHeight: 20 },
  list: { borderTopWidth: 1, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thumb: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden' },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  tag: { height: 18, paddingHorizontal: 6, borderRadius: 5, justifyContent: 'center' },
  tagText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
  more: { paddingVertical: 10, borderBottomWidth: 1 },
  removed: { paddingVertical: 10, borderBottomWidth: 1 },
  approve: { flex: 1.4 },
  flip: { transform: [{ rotate: '180deg' }] },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  sheetThumb: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  sheetName: { fontSize: 16, lineHeight: 21 },
  inset: { paddingHorizontal: 14 },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  changesCard: { borderRadius: 20, padding: 16, gap: 10 },
  changeLabel: { width: 96, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  footerButton: { flex: 1, height: 52 },
  discard: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  struck: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontWeight: '600' },
  playIcon: { marginLeft: 3 },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  rowButton: { height: 44 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  placeholder: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  sheetBody: { gap: 20, paddingBottom: 12 },
  totals: { flexDirection: 'row', gap: 8 },
  total: { flex: 1, gap: 2, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 },
  labeledGroup: { gap: 10 },
  labeled: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  label96: { width: 96, paddingTop: 4 },
  blockWrap: { gap: 8 },
  block: { borderRadius: 20, overflow: 'hidden' },
  change: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  changeDot: { width: 6, height: 6, borderRadius: 3 },
  expanded: { gap: 14, paddingBottom: 16 },
  video: { aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#141312' },
  play: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.92)',
  },
  tips: { gap: 10, paddingBottom: 2 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  rowActions: { flexDirection: 'row', gap: 8 },
  variants: { gap: 4 },
  variant: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  footer: { flex: 1, gap: 6, alignItems: 'stretch' },
  footerPair: { flexDirection: 'row', gap: 8 },
});
