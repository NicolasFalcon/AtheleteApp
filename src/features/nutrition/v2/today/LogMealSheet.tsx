import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Camera, Check, Mic, Plus, Repeat, ScanBarcode, Star, Zap } from 'lucide-react-native';
import {
  EllieActionButton,
  FilterChip,
  PressableScale,
  Sheet,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { SLOT_LABELS } from '@app/features/nutrition/nutritionDayModel';
import { useRecentFoods } from '@app/features/nutrition/useNutritionToday';
import { lowQuotaNotice } from '@app/features/vision/visionCopy';
import {
  NUTRITION_SLOTS,
  type NutritionSlot,
  type SavedFood,
} from '@app/services/supabase/nutritionDay';

const DESCRIBE_MAX = 400;
// Nutrición sage: a food added from the list.
const SAGE = '#5E8F5A';

const foodKey = (food: SavedFood) => food.id ?? food.entryId ?? food.name;

// Registrar comida (nut-1, prototype "Registrar comida"): the moment (by the
// clock, or the one of the "+"), Describir (the keyboard's own dictation for
// the voice), Foto with what is left of the quota, Código de barras (N2),
// Kcal rápidas, and the recent and favourite foods with a one-tap "+" that
// turns into a check once added.
export function LogMealSheet({
  open,
  initialSlot,
  photoLeft,
  parsing,
  addingFood,
  addedFoods,
  onClose,
  onDescribe,
  onPhoto,
  onQuickKcal,
  onAddFood,
}: {
  open: boolean;
  initialSlot: NutritionSlot;
  // Photo analyses left today (null: not known yet).
  photoLeft: number | null;
  parsing: boolean;
  // The key of the food being added (its "+" shows a spinner).
  addingFood: string | null;
  // Keys of the foods added while the sheet is open.
  addedFoods: ReadonlySet<string>;
  onClose: () => void;
  onDescribe: (text: string, slot: NutritionSlot) => void;
  onPhoto: (slot: NutritionSlot) => void;
  onQuickKcal: (slot: NutritionSlot) => void;
  onAddFood: (food: SavedFood, key: string, slot: NutritionSlot) => void;
}) {
  const { colors } = useThemeV2();
  const [slot, setSlot] = useState<NutritionSlot>(initialSlot);
  const [text, setText] = useState('');
  const input = useRef<TextInput>(null);
  const foods = useRecentFoods(open);

  useEffect(() => {
    if (open) {
      setSlot(initialSlot);
      setText('');
    }
  }, [initialSlot, open]);

  const noPhotos = photoLeft !== null && photoLeft <= 0;
  const describe = () => {
    const value = text.trim();
    if (value && !parsing) {
      onDescribe(value, slot);
    }
  };

  const foodRows = (list: SavedFood[], Icon: typeof Repeat) =>
    list.map(food => {
      const key = foodKey(food);
      const added = addedFoods.has(key);
      return (
        <View key={key} style={[styles.food, { borderTopColor: colors.divider }]}>
          <View style={[styles.foodIcon, { backgroundColor: colors.surface.muted }]}>
            <Icon size={20} color={colors.text.secondary} strokeWidth={1.8} />
          </View>
          <View style={styles.flex}>
            <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.foodName}>
              {food.name}
            </TextV2>
            <TextV2 variant="meta" tone="secondary" numberOfLines={1} style={styles.tabular}>
              {`${formatThousands(food.kcal)} kcal · P ${Math.round(food.p)} · C ${Math.round(food.c)} · G ${Math.round(food.g)}`}
            </TextV2>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={added ? `${food.name} añadido` : `Añadir ${food.name} a ${SLOT_LABELS[slot]}`}
            disabled={addingFood !== null}
            onPress={() => onAddFood(food, key, slot)}
            style={[styles.plus, { backgroundColor: added ? SAGE : colors.surface.muted }]}
          >
            {addingFood === key ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : added ? (
              <Check size={20} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <Plus size={20} color={colors.text.primary} strokeWidth={2} />
            )}
          </PressableScale>
        </View>
      );
    });

  const recent = foods.data?.recent ?? [];
  const favorites = foods.data?.favorites ?? [];

  return (
    <Sheet open={open} onClose={() => !parsing && onClose()} title="Registrar comida" scrollable>
      <View style={styles.body}>
        <View style={styles.slots}>
          {NUTRITION_SLOTS.map(key => (
            <FilterChip
              key={key}
              label={SLOT_LABELS[key]}
              size={40}
              selected={slot === key}
              onPress={() => setSlot(key)}
              style={styles.slot}
            />
          ))}
        </View>

        <View style={styles.section}>
          <TextV2 variant="eyebrow" tone="secondary">
            DESCRIBIR
          </TextV2>
          <View
            style={[
              styles.describe,
              { backgroundColor: colors.surface.raised, borderColor: colors.border.card },
            ]}
          >
            <TextInput
              ref={input}
              accessibilityLabel="Describe lo que comiste"
              value={text}
              onChangeText={setText}
              editable={!parsing}
              placeholder="2 huevos y una arepa con queso"
              placeholderTextColor={colors.text.disabled}
              maxLength={DESCRIBE_MAX}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={describe}
              style={[styles.describeInput, { color: colors.text.primary }]}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Dictar"
              accessibilityHint="Abre el teclado; usa su micrófono para dictar"
              onPress={() => input.current?.focus()}
              style={[styles.mic, { backgroundColor: colors.surface.muted }]}
            >
              <Mic size={20} color={colors.text.primary} strokeWidth={2} />
            </PressableScale>
          </View>
          <TextV2 variant="meta" tone="secondary">
            Escríbelo o díctalo; ELLIE separa alimentos y porciones.
          </TextV2>
          {text.trim() || parsing ? (
            <EllieActionButton
              label="Calcular con ELLIE"
              size="md"
              fullWidth
              loading={parsing}
              loadingLabel="Calculando…"
              disabled={parsing}
              onPress={describe}
            />
          ) : null}
        </View>

        <View style={styles.tiles}>
          <PressableScale
            accessibilityRole="button"
            disabled={noPhotos}
            onPress={() => onPhoto(slot)}
            style={[styles.tile, { backgroundColor: colors.surface.raised }, noPhotos && styles.off]}
          >
            <Camera size={26} color={colors.text.primary} strokeWidth={1.8} />
            <View>
              <TextV2 variant="bodyL" style={styles.tileTitle}>
                Foto
              </TextV2>
              <TextV2 variant="metaStrong" tone={photoLeft !== null && photoLeft <= 3 ? 'ember' : 'secondary'}>
                {photoLeft === null ? 'analiza tu plato' : noPhotos ? 'Sin análisis hoy' : lowQuotaNotice(photoLeft, 'es', true)}
              </TextV2>
            </View>
          </PressableScale>
          <View
            accessible
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Código de barras, próximamente"
            style={[styles.tile, { backgroundColor: colors.surface.raised }]}
          >
            <ScanBarcode size={26} color={colors.text.tertiary} strokeWidth={1.8} />
            <View>
              <TextV2 variant="bodyL" tone="tertiary" style={styles.tileTitle}>
                Código
              </TextV2>
              <TextV2 variant="meta" tone="tertiary">
                Próximamente
              </TextV2>
            </View>
          </View>
          <PressableScale
            accessibilityRole="button"
            onPress={() => onQuickKcal(slot)}
            style={[styles.tile, { backgroundColor: colors.surface.raised }]}
          >
            <Zap size={26} color={colors.text.primary} strokeWidth={1.8} />
            <View>
              <TextV2 variant="bodyL" style={styles.tileTitle}>
                Kcal rápidas
              </TextV2>
              <TextV2 variant="meta" tone="secondary">
                solo la cifra
              </TextV2>
            </View>
          </PressableScale>
        </View>

        {foods.isLoading ? (
          <ActivityIndicator color={colors.text.secondary} style={styles.loading} />
        ) : foods.isError ? (
          <TextV2 variant="meta" tone="secondary">
            No pudimos cargar tus comidas.
          </TextV2>
        ) : (
          <>
            <View style={styles.section}>
              <TextV2 variant="eyebrow" tone="secondary">
                RECIENTES
              </TextV2>
              {recent.length === 0 ? (
                <TextV2 variant="meta" tone="secondary">
                  Lo que registres aparecerá aquí para repetirlo con un toque.
                </TextV2>
              ) : (
                <View>{foodRows(recent, Repeat)}</View>
              )}
            </View>
            <View style={styles.section}>
              <TextV2 variant="eyebrow" tone="secondary">
                FAVORITOS
              </TextV2>
              {favorites.length === 0 ? (
                <TextV2 variant="meta" tone="secondary">
                  Marca con la estrella lo que comes a menudo.
                </TextV2>
              ) : (
                <View>{foodRows(favorites, Star)}</View>
              )}
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  body: { gap: 24, paddingBottom: 12 },
  slots: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1 },
  section: { gap: 10 },
  describe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 20,
    paddingRight: 6,
  },
  describeInput: { flex: 1, fontSize: 17, padding: 0, alignSelf: 'stretch', minHeight: 24 },
  mic: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 22, padding: 14, gap: 14, minHeight: 112, justifyContent: 'space-between' },
  tileTitle: { fontWeight: '600' },
  off: { opacity: 0.45 },
  loading: { marginVertical: 12 },
  food: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  foodIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  foodName: { fontSize: 17 },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
