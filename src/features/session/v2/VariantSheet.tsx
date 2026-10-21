import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Cable,
  ChevronRight,
  Dumbbell,
  PersonStanding,
  SlidersHorizontal,
  Undo2,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import { PressableScale, Sheet, TextV2 } from '@app/components/v2';
import {
  VARIANT_REASONS,
  equipmentLabel,
  rpcReason,
  variantEyebrow,
  type SessionVariantReason,
} from '@app/features/session/variantModel';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { muscleLabel } from '@app/services/catalog/catalogService';
import {
  routinesService,
  type EquipmentGroup,
  type ExerciseVariant,
} from '@app/services/routines/routinesService';

// Variants in Sesión activa (handoff v2.15 §25.6, SESSION_10–11). A dark
// sheet in the session scene: the list (reason chips and up to 3 options,
// the recommended one marked), then "Solo hoy / Guardar en la rutina /
// Elegir otra".

const C = {
  white: '#FFFFFF',
  meta: '#A8A6A1',
  tertiary: '#8C8A85',
  emberText: '#FF8A5C',
  tile: 'rgba(255,255,255,.08)',
  hairline: 'rgba(255,255,255,.07)',
  chipRing: 'rgba(255,255,255,.22)',
  ink: '#121212',
};

const GROUP_ICON: Record<EquipmentGroup, LucideIcon> = {
  barbell: Weight,
  machine: SlidersHorizontal,
  cable: Cable,
  bodyweight: PersonStanding,
  dumbbell: Dumbbell,
};

export type VariantSheetStep =
  | { kind: 'list' }
  | { kind: 'save'; variant: ExerciseVariant };

export function VariantSheet({
  open,
  step,
  exerciseName,
  originalExerciseId,
  originalName,
  appliedExerciseId,
  routineTitle,
  reason,
  language,
  saving,
  onReason,
  onChoose,
  onToday,
  onSaveInRoutine,
  onChooseAnother,
  onRevert,
  onClose,
}: {
  open: boolean;
  step: VariantSheetStep;
  // The exercise on screen now (the variant, if one is applied).
  exerciseName: string;
  originalExerciseId: string;
  originalName: string;
  appliedExerciseId: string | null;
  routineTitle: string;
  reason: SessionVariantReason | null;
  language: 'es' | 'en';
  saving: boolean;
  onReason: (reason: SessionVariantReason | null) => void;
  onChoose: (variant: ExerciseVariant) => void;
  onToday: () => void;
  onSaveInRoutine: () => void;
  onChooseAnother: () => void;
  onRevert: () => void;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['variants', originalExerciseId, rpcReason(reason), appliedExerciseId, language],
    enabled: open && Boolean(originalExerciseId),
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      routinesService.listExerciseVariants({
        exerciseId: originalExerciseId,
        reason: rpcReason(reason),
        excludeExerciseId: appliedExerciseId,
        locale: language,
      }),
  });
  const data = query.data ?? null;

  if (step.kind === 'save') {
    return (
      <Sheet open={open} onClose={onClose} eyebrow="Variante elegida" title={step.variant.name}>
        <View style={styles.saveBody}>
          <TextV2 variant="body" color={C.meta}>
            {`En lugar de ${originalName}. ¿La usamos solo hoy o la guardamos en ${routineTitle}?`}
          </TextV2>
          <View style={styles.saveButtons}>
            <PressableScale
              accessibilityRole="button"
              disabled={saving}
              onPress={onToday}
              style={[styles.bigPill, { backgroundColor: C.white }]}
            >
              <TextV2 variant="cta" color={C.ink}>
                Solo hoy
              </TextV2>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ busy: saving }}
              disabled={saving}
              onPress={onSaveInRoutine}
              style={[styles.bigPill, styles.tilePill, saving ? styles.busy : null]}
            >
              <TextV2 variant="cta" color={C.white}>
                {saving ? 'Guardando…' : 'Guardar en la rutina'}
              </TextV2>
            </PressableScale>
            <PressableScale accessibilityRole="button" disabled={saving} onPress={onChooseAnother} style={styles.textButton}>
              <TextV2 variant="bodyStrong" color={C.meta}>
                Elegir otra
              </TextV2>
            </PressableScale>
          </View>
        </View>
      </Sheet>
    );
  }

  const eyebrow = data
    ? variantEyebrow(muscleLabel(data.original.primaryMuscle, language), data.original.pattern)
    : undefined;

  return (
    <Sheet open={open} onClose={onClose} eyebrow={eyebrow} title={`Cambiar ${exerciseName}`} scrollable>
      <View style={styles.listBody}>
        <TextV2 variant="body" color={C.meta}>
          Mismo músculo y mismo movimiento. Tus series y reps no cambian.
        </TextV2>

        <View style={styles.gap10}>
          <TextV2 variant="meta" color={C.meta}>
            ¿Qué pasa?
          </TextV2>
          <View style={styles.chips}>
            {VARIANT_REASONS.map(option => {
              const on = reason === option.key;
              return (
                <PressableScale
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => onReason(on ? null : option.key)}
                  style={[
                    styles.chip,
                    on ? { backgroundColor: C.white } : { boxShadow: `inset 0 0 0 1px ${C.chipRing}` },
                  ]}
                >
                  <TextV2 variant="bodyStrong" color={on ? C.ink : C.white} style={styles.chipText}>
                    {option.label}
                  </TextV2>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {appliedExerciseId ? (
          <PressableScale accessibilityRole="button" onPress={onRevert} style={styles.row}>
            <View style={styles.tile}>
              <Undo2 size={20} color={C.white} strokeWidth={1.8} />
            </View>
            <View style={styles.rowTexts}>
              <TextV2 variant="body" color={C.white} style={styles.rowName}>
                {`Volver a ${originalName}`}
              </TextV2>
              <TextV2 variant="caption" color={C.tertiary}>
                El ejercicio de tu rutina
              </TextV2>
            </View>
            <ChevronRight size={16} color={C.tertiary} strokeWidth={2} />
          </PressableScale>
        ) : null}

        {query.isLoading ? (
          <TextV2 variant="meta" color={C.tertiary}>
            Buscando variantes…
          </TextV2>
        ) : query.isError ? (
          <PressableScale accessibilityRole="button" onPress={() => query.refetch()}>
            <TextV2 variant="meta" color={C.tertiary}>
              {`${routineErrorCopy(query.error, language).message} · `}
              <TextV2 variant="metaStrong" color={C.white}>
                Reintentar
              </TextV2>
            </TextV2>
          </PressableScale>
        ) : data && data.items.length === 0 ? (
          <TextV2 variant="meta" color={C.tertiary}>
            No hay otra variante con lo que tienes. Prueba con otro motivo.
          </TextV2>
        ) : (
          <View>
            {data?.items.map(item => {
              const Icon = GROUP_ICON[item.equipmentGroup];
              return (
                <PressableScale
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}${item.recommended ? ', recomendada' : ''}`}
                  onPress={() => onChoose(item)}
                  style={[styles.row, { borderTopColor: C.hairline }]}
                >
                  <View style={styles.tile}>
                    <Icon size={20} color={C.white} strokeWidth={1.8} />
                  </View>
                  <View style={styles.rowTexts}>
                    <View style={styles.nameLine}>
                      <TextV2 variant="body" color={C.white} numberOfLines={1} style={[styles.rowName, styles.shrink]}>
                        {item.name}
                      </TextV2>
                      {item.recommended ? (
                        <View style={styles.recommended}>
                          <TextV2 variant="captionStrong" color={C.emberText} style={styles.recommendedText}>
                            Recomendada
                          </TextV2>
                        </View>
                      ) : null}
                    </View>
                    <TextV2 variant="caption" color={C.tertiary} numberOfLines={1}>
                      {[equipmentLabel(item.equipmentGroup), item.note].filter(Boolean).join(' · ')}
                    </TextV2>
                  </View>
                  <ChevronRight size={16} color={C.tertiary} strokeWidth={2} />
                </PressableScale>
              );
            })}
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  gap10: { gap: 10 },
  shrink: { flexShrink: 1 },
  listBody: { gap: 18, paddingBottom: 8 },
  saveBody: { gap: 20 },
  saveButtons: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  chipText: { fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,.07)',
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: { flex: 1, minWidth: 0, gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 16 },
  recommended: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,91,31,.18)',
    justifyContent: 'center',
  },
  recommendedText: { fontSize: 11 },
  bigPill: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tilePill: { backgroundColor: 'rgba(255,255,255,.08)' },
  busy: { opacity: 0.6 },
  textButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
