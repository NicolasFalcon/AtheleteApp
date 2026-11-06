import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  Check,
  Droplet,
  Dumbbell,
  Layers,
  Pencil,
  Pill,
  Plus,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react-native';
import {
  AppImage,
  Button,
  EllieActionButton,
  IconButton,
  MacroColumn,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import {
  ESTIMATE_NOTE,
  SLOT_LABELS,
  MOMENT_LABELS,
  adherenceLine,
  dayTypeChip,
  doseStatus,
  entryMeta,
  macroLine,
  macroTanks,
  mealsCountLine,
  ringCopy,
  supplementsSummary,
  tagLabel,
} from '@app/features/nutrition/nutritionDayModel';
import type {
  MealEntry,
  NutritionDay,
  NutritionMoment,
  SupplementMoment,
  SupplementType,
  SupplementsDay,
} from '@app/services/supabase/nutritionDay';

// Nutrición · Hoy (nut-1, prototype "Nutrición · Hoy"): the 270° ring with
// what is left, the macro columns, the meals by moment, hydration and
// supplements. Figures come from get_nutrition_day.

// Nutrición sage (Tu día §28.14); Ember tint of the day chip and the tags.
const SAGE = '#5E8F5A';
const EMBER_TINT = 'rgba(255,91,31,.12)';
const MAX_GLASSES_SHOWN = 16;

// ── Ring ────────────────────────────────────────────────────────────────────

const RING = 172;
const RING_STROKE = 14;

// 270° arc open at the bottom, filling clockwise from the lower left.
function Arc({ progress, color, track }: { progress: number; color: string; track: string }) {
  const radius = (RING - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const common = {
    cx: RING / 2,
    cy: RING / 2,
    r: radius,
    strokeWidth: RING_STROKE,
    strokeLinecap: 'round' as const,
    fill: 'none',
    rotation: 135,
    origin: `${RING / 2}, ${RING / 2}`,
  };
  return (
    <Svg width={RING} height={RING}>
      <Circle {...common} stroke={track} strokeDasharray={[arc, circumference]} />
      {progress > 0 ? (
        <Circle {...common} stroke={color} strokeDasharray={[arc * progress, circumference]} />
      ) : null}
    </Svg>
  );
}

export function TodayRing({ day, onCreatePlan }: { day: NutritionDay; onCreatePlan: () => void }) {
  const { colors } = useThemeV2();
  const copy = ringCopy(day);
  const noPlan = day.targets.source === 'profile_estimate';
  return (
    <View style={styles.ringBlock}>
      <View style={styles.ringRow}>
        <View style={styles.arc} accessible accessibilityLabel={copy.headline}>
          <Arc progress={copy.progress} color={copy.over ? colors.ember.base : SAGE} track={colors.surface.muted} />
          <View style={styles.arcCenter}>
            <TextV2 variant="eyebrow" tone="secondary">
              {copy.eyebrow}
            </TextV2>
            <TextV2 style={[styles.ringFigure, { color: copy.over ? colors.ember.deep : colors.text.primary }]}>
              {copy.figure}
            </TextV2>
            <TextV2 variant="body" tone="secondary">
              kcal
            </TextV2>
          </View>
        </View>
        <View style={styles.ringSide}>
          <View style={[styles.dayChip, { backgroundColor: EMBER_TINT }]}>
            <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
            <TextV2 variant="metaStrong" tone="ember">
              {dayTypeChip(day)}
            </TextV2>
          </View>
          <View>
            <TextV2 variant="title22" style={styles.tabular}>
              {copy.consumed}
            </TextV2>
            <TextV2 variant="body" tone="secondary">
              consumidas
            </TextV2>
          </View>
        </View>
      </View>
      {noPlan ? (
        <View style={styles.noPlan}>
          <TextV2 variant="body" tone="secondary">
            {ESTIMATE_NOTE}
          </TextV2>
          <EllieActionButton label="Crear plan con ELLIE" variant="compact" onPress={onCreatePlan} />
        </View>
      ) : null}
    </View>
  );
}

// ── Macros ──────────────────────────────────────────────────────────────────

// The macro columns (§23.3): the protein wider in Ember with "· prioridad";
// "+N g" under the one that went past its goal.
// Carbs and fat used to fill with the ink #1C1A18, the same grey as the box
// in Dark (no visible fill). Each gets its own existing token: Recovery
// Blue for carbs, soft Ember (ember.textOnDark) for fat; protein stays Ember.
export function MacroTanks({ day }: { day: NutritionDay }) {
  const { colors } = useThemeV2();
  const fills: Record<string, string | undefined> = {
    carbs: colors.recovery.base,
    fat: colors.ember.textOnDark,
  };
  return (
    <View style={styles.tanks}>
      {macroTanks(day).map(tank => (
        <View key={tank.key} style={tank.key === 'protein' ? styles.tankWide : styles.tank}>
          <MacroColumn
            label={tank.label}
            value={tank.value}
            goal={tank.goal}
            pct={Math.round(tank.fill * 100)}
            priority={tank.key === 'protein'}
            fillColor={fills[tank.key]}
          />
          {tank.excess ? (
            <TextV2 variant="metaStrong" tone={tank.key === 'protein' ? 'ember' : 'secondary'}>
              {tank.excess}
            </TextV2>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Meals ───────────────────────────────────────────────────────────────────

// "P 25 · C 42 · G 30" with the protein in Ember.
function MacroText({ p, c, g }: { p: number; c: number; g: number }) {
  return (
    <TextV2 variant="meta" tone="secondary" style={styles.tabular}>
      <TextV2 variant="metaStrong" tone="ember">{`P ${Math.round(p)}`}</TextV2>
      {` · C ${Math.round(c)} · G ${Math.round(g)}`}
    </TextV2>
  );
}

function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: MealEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useThemeV2();
  const swipe = useRef<SwipeableMethods>(null);
  const act = (run: () => void) => () => {
    swipe.current?.close();
    run();
  };
  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Editar"
            onPress={act(onEdit)}
            style={[styles.swipeBtn, { backgroundColor: colors.surface.muted }]}
          >
            <Pencil size={18} color={colors.text.primary} strokeWidth={2} />
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            onPress={act(onDelete)}
            style={[styles.swipeBtn, { backgroundColor: colors.ember.deep }]}
          >
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2} />
          </PressableScale>
        </View>
      )}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityHint="Desliza para editar o eliminar"
        onPress={onEdit}
        style={[styles.entry, { backgroundColor: colors.bg }]}
      >
        {entry.photoUrl ? (
          <AppImage source={{ uri: entry.photoUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.surface.muted }]} />
        )}
        <View style={styles.flex}>
          <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.entryName}>
            {entry.name}
          </TextV2>
          {entryMeta(entry) ? (
            <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
              {entryMeta(entry)}
            </TextV2>
          ) : null}
          <MacroText p={entry.p} c={entry.c} g={entry.g} />
        </View>
        <TextV2 variant="title22" style={styles.tabular}>
          {formatThousands(entry.kcal)}
        </TextV2>
      </PressableScale>
    </ReanimatedSwipeable>
  );
}

export function MealsHeader({ day }: { day: NutritionDay }) {
  return (
    <View style={styles.mealsHead}>
      <TextV2 variant="title24">Comidas</TextV2>
      <TextV2 variant="meta" tone="secondary">
        {mealsCountLine(day)}
      </TextV2>
    </View>
  );
}

export function MomentSection({
  moment,
  planActive,
  loggingPlanned,
  onAdd,
  onEdit,
  onDelete,
  onLogPlanned,
}: {
  moment: NutritionMoment;
  planActive: boolean;
  loggingPlanned: boolean;
  onAdd: () => void;
  onEdit: (entry: MealEntry) => void;
  onDelete: (entry: MealEntry) => void;
  onLogPlanned: () => void;
}) {
  const { colors } = useThemeV2();
  const tag = tagLabel(moment.tag);
  const planned = planActive ? moment.planned : null;
  const ghost = planned && !planned.logged ? planned : null;
  return (
    <View style={styles.moment}>
      <View style={styles.momentHead}>
        <View style={styles.momentTitle}>
          <TextV2 variant="eyebrow" tone="secondary">
            {SLOT_LABELS[moment.slot].toUpperCase()}
          </TextV2>
          {tag ? (
            <View style={[styles.tag, { backgroundColor: EMBER_TINT }]}>
              <TextV2 variant="metaStrong" tone="ember">
                {tag}
              </TextV2>
            </View>
          ) : null}
        </View>
        {moment.kcal > 0 ? (
          <TextV2 variant="metaStrong" tone="secondary" style={styles.tabular}>
            {`${formatThousands(moment.kcal)} kcal`}
          </TextV2>
        ) : null}
        <IconButton
          icon={Plus}
          size={36}
          variant="muted"
          accessibilityLabel={`Registrar en ${SLOT_LABELS[moment.slot]}`}
          onPress={onAdd}
        />
      </View>
      {moment.entries.map(entry => (
        <EntryRow key={entry.id} entry={entry} onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry)} />
      ))}
      {ghost ? (
        <View style={[styles.ghost, { borderColor: colors.outline.control }]}>
          <View style={styles.flex}>
            <TextV2 variant="caption" tone="tertiary">
              Del plan
            </TextV2>
            <TextV2 variant="bodyStrong" tone="secondary" numberOfLines={1}>
              {ghost.name}
            </TextV2>
            <TextV2 variant="meta" tone="tertiary">
              {`${formatThousands(ghost.kcal)} kcal · ${macroLine(ghost)}`}
            </TextV2>
          </View>
          <Button label="Lo comí" size="sm" variant="secondary" loading={loggingPlanned} onPress={onLogPlanned} />
        </View>
      ) : null}
      {moment.entries.length === 0 && !ghost ? (
        <PressableScale accessibilityRole="button" onPress={onAdd} style={styles.addRow}>
          <Plus size={18} color={colors.text.secondary} strokeWidth={2} />
          <TextV2 variant="body" tone="secondary">
            Añadir
          </TextV2>
        </PressableScale>
      ) : null}
    </View>
  );
}

// ── Hydration ───────────────────────────────────────────────────────────────

export function HydrationCard({ water, onAdd }: { water: NutritionDay['water']; onAdd: () => void }) {
  const { colors, mode } = useThemeV2();
  const shown = Math.min(Math.max(water.target, water.glasses), MAX_GLASSES_SHOWN);
  const liters = (water.ml / 1000).toFixed(1).replace('.', ',');
  return (
    <View
      style={[
        styles.water,
        { backgroundColor: mode === 'dark' ? colors.recovery.surface : colors.recovery.tintBg },
      ]}
    >
      <View style={styles.waterHead}>
        <View style={styles.flex}>
          <TextV2 variant="eyebrow" tone="recovery">
            HIDRATACIÓN
          </TextV2>
          <View style={styles.waterFigure}>
            <TextV2 style={[styles.waterNumber, { color: colors.text.primary }]}>{water.glasses}</TextV2>
            <TextV2 variant="bodyL" tone="secondary" style={styles.tabular}>
              {`de ${water.target} vasos · ${liters} L`}
            </TextV2>
          </View>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Sumar un vaso"
          onPress={onAdd}
          style={[styles.glassBtn, { backgroundColor: colors.cta.primary }]}
        >
          <Plus size={18} color={colors.cta.primaryText} strokeWidth={2.4} />
          <TextV2 variant="bodyStrong" color={colors.cta.primaryText}>
            1 vaso
          </TextV2>
        </PressableScale>
      </View>
      <View style={styles.glasses}>
        {Array.from({ length: shown }, (_, index) => (
          <View
            key={index}
            style={[
              styles.glass,
              { backgroundColor: index < water.glasses ? colors.recovery.base : colors.recovery.glow },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Supplements ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<SupplementType, typeof Pill> = {
  vitamina: Sun,
  mineral: Layers,
  creatina: Zap,
  omega: Droplet,
  proteina: Dumbbell,
  otro: Pill,
};

// Seven pills, the complete days first.
function AdherenceBars({ complete, days }: { complete: number; days: number }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.bars}>
      {Array.from({ length: days }, (_, index) => (
        <View
          key={index}
          style={[styles.bar, { backgroundColor: index < complete ? colors.ember.base : colors.surface.track }]}
        />
      ))}
    </View>
  );
}

export function SupplementsCard({
  supplements,
  onToggle,
  onManage,
}: {
  supplements: SupplementsDay | null;
  onToggle: (supplementId: string, moment: SupplementMoment, taken: boolean) => void;
  onManage: () => void;
}) {
  const { colors } = useThemeV2();
  const empty = !supplements || supplements.total === 0;
  const adherence = supplements ? adherenceLine(supplements) : null;
  return (
    <View style={styles.supBlock}>
      <View style={styles.supHead}>
        <TextV2 variant="title24">Suplementos</TextV2>
        <PressableScale accessibilityRole="button" onPress={onManage} hitSlop={8}>
          <TextV2 variant="bodyStrong">Gestionar</TextV2>
        </PressableScale>
      </View>
      <View style={[styles.supCard, { backgroundColor: colors.surface.raised }]}>
        {empty ? (
          <View style={styles.supEmpty}>
            <Pill size={20} color={colors.text.secondary} strokeWidth={2} />
            <TextV2 variant="body" tone="secondary" style={styles.flex}>
              Añade lo que tomas y te lo recuerdo a su hora.
            </TextV2>
          </View>
        ) : (
          <>
            <View style={styles.supSummary}>
              <TextV2 variant="title22" style={styles.tabular}>
                {supplementsSummary(supplements!)}
              </TextV2>
              {supplements!.adherence && adherence ? (
                <View style={styles.adherence}>
                  <AdherenceBars
                    complete={supplements!.adherence.daysComplete}
                    days={supplements!.adherence.days}
                  />
                  <TextV2 variant="meta" tone="secondary" style={styles.tabular}>
                    {adherence}
                  </TextV2>
                </View>
              ) : null}
            </View>
            {supplements!.moments.map(moment => (
              <View key={moment.moment}>
                <View style={[styles.supMomentHead, { borderBottomColor: colors.divider }]}>
                  <TextV2 variant="eyebrow" tone="secondary">
                    {MOMENT_LABELS[moment.moment].toUpperCase()}
                  </TextV2>
                </View>
                {moment.items.map((item, index) => {
                  const taken = item.status === 'taken';
                  const Icon = item.type ? TYPE_ICONS[item.type] : Pill;
                  const status = doseStatus(item, moment.reminderTime);
                  return (
                    <View
                      key={`${moment.moment}:${item.supplementId}`}
                      style={[
                        styles.supRow,
                        index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                      ]}
                    >
                      <View style={[styles.supIcon, { backgroundColor: colors.surface.muted }]}>
                        <Icon size={20} color={colors.text.secondary} strokeWidth={1.8} />
                      </View>
                      <View style={styles.flex}>
                        <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.supName}>
                          {item.name}
                        </TextV2>
                        <TextV2 variant="body" tone="secondary" numberOfLines={1} style={styles.tabular}>
                          {item.dose ? `${item.dose} · ` : ''}
                          <TextV2 variant={taken ? 'bodyStrong' : 'body'} tone={taken ? 'ember' : 'secondary'}>
                            {status}
                          </TextV2>
                        </TextV2>
                      </View>
                      <PressableScale
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: taken }}
                        accessibilityLabel={`${item.name}, ${taken ? 'tomado' : 'pendiente'}`}
                        onPress={() => onToggle(item.supplementId, moment.moment, !taken)}
                        style={[
                          styles.check,
                          taken
                            ? { backgroundColor: colors.ember.base, borderColor: colors.ember.base }
                            : { borderColor: colors.outline.control },
                        ]}
                      >
                        {taken ? <Check size={22} color="#FFFFFF" strokeWidth={2.4} /> : null}
                      </PressableScale>
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  // Ring
  ringBlock: { gap: 14 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  arc: { width: RING, height: RING },
  arcCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringFigure: { fontSize: 40, lineHeight: 44, fontWeight: '600', letterSpacing: -1.4, fontVariant: ['tabular-nums'] },
  ringSide: { flex: 1, gap: 14 },
  dayChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, borderRadius: 15, paddingHorizontal: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  noPlan: { gap: 10, alignItems: 'flex-start' },
  // Macros
  tanks: { flexDirection: 'row', gap: 12 },
  tank: { flex: 1, gap: 4 },
  tankWide: { flex: 1.3, gap: 4 },
  // Meals
  mealsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  moment: { gap: 10 },
  momentHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  momentTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { height: 26, borderRadius: 13, paddingHorizontal: 10, justifyContent: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  entryName: { fontSize: 17 },
  thumb: { width: 56, height: 56, borderRadius: 16 },
  swipeActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8 },
  swipeBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  // Hydration
  water: { borderRadius: 24, padding: 18, gap: 16 },
  waterHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  waterNumber: { fontSize: 32, lineHeight: 36, fontWeight: '600', fontVariant: ['tabular-nums'] },
  glassBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, borderRadius: 22, paddingHorizontal: 18 },
  glasses: { flexDirection: 'row', gap: 6 },
  glass: { flex: 1, height: 22, borderRadius: 7 },
  // Supplements
  supBlock: { gap: 14 },
  supHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  supCard: { borderRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  supSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  adherence: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bars: { flexDirection: 'row', gap: 3 },
  bar: { width: 7, height: 18, borderRadius: 3.5 },
  supEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 },
  supMomentHead: { paddingTop: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  supRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  supIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  supName: { fontSize: 17 },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
