import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill, Plus } from 'lucide-react-native';
import {
  BackButton,
  Button,
  FilterChip,
  GlassHeader,
  PressableScale,
  Sheet,
  Skeleton,
  StatusBarV2,
  SwitchV2,
  TextField,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  MOMENT_LABELS,
  SUPPLEMENT_NOTE,
  TYPE_LABELS,
  parseClock,
} from '@app/features/nutrition/nutritionDayModel';
import { useSupplementMutations, useSupplementsList } from '@app/features/nutrition/useNutritionToday';
import { safeGoBack } from '@app/navigation/safeGoBack';
import {
  SUPPLEMENT_MOMENTS,
  SUPPLEMENT_TYPES,
  type Supplement,
  type SupplementInput,
  type SupplementMoment,
} from '@app/services/supabase/nutritionDay';
import type { AppScreenProps } from '@app/types/navigation';

const DEFAULT_TIMES: Record<SupplementMoment, string> = { manana: '08:00', tarde: '15:00', noche: '21:00' };

const EMPTY: SupplementInput = {
  id: null,
  name: '',
  type: 'vitamina',
  dose: '',
  moments: ['manana'],
  reminderTimes: { manana: DEFAULT_TIMES.manana },
  remind: true,
  countsAsMeal: false,
  kcal: null,
  p: null,
  c: null,
  g: null,
};

const numberOf = (text: string): number | null => {
  const value = Number(text.replace(',', '.').replace(/[^\d.]/g, ''));
  return text.trim() && Number.isFinite(value) ? value : null;
};

// Suplementos · Gestionar (nut-1 §6): the list and the form (name, type,
// dose, moments with the reminder time of each, "Recordarme" and, for a
// protein, "Cuenta como comida" with its kcal and macros). ATHELETE only
// reminds and records: never a dose.
export function SupplementsScreen({ navigation }: AppScreenProps<'Supplements'>) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const list = useSupplementsList();
  const { save, remove } = useSupplementMutations();
  const [form, setForm] = useState<SupplementInput | null>(null);
  const [times, setTimes] = useState<Partial<Record<SupplementMoment, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const open = (supplement: Supplement | null) => {
    const value = supplement ? { ...supplement } : { ...EMPTY };
    setForm(value);
    setTimes({ ...value.reminderTimes });
    setError(null);
  };

  const toggleMoment = (moment: SupplementMoment) => {
    if (!form) {
      return;
    }
    const on = form.moments.includes(moment);
    const moments = on ? form.moments.filter(m => m !== moment) : SUPPLEMENT_MOMENTS.filter(m => m === moment || form.moments.includes(m));
    setForm({ ...form, moments });
    if (!on && !times[moment]) {
      setTimes(current => ({ ...current, [moment]: DEFAULT_TIMES[moment] }));
    }
  };

  const submit = () => {
    if (!form) {
      return;
    }
    if (!form.name.trim()) {
      setError('Ponle un nombre.');
      return;
    }
    if (form.moments.length === 0) {
      setError('Elige al menos un momento.');
      return;
    }
    const reminderTimes: Partial<Record<SupplementMoment, string>> = {};
    for (const moment of form.moments) {
      const clock = parseClock(times[moment] ?? '');
      if (form.remind && !clock) {
        setError(`Revisa la hora de ${MOMENT_LABELS[moment].toLowerCase()} (HH:MM).`);
        return;
      }
      if (clock) {
        reminderTimes[moment] = clock;
      }
    }
    setError(null);
    save.mutate(
      { ...form, reminderTimes },
      {
        onSuccess: () => {
          setForm(null);
          toast.show('Suplemento guardado');
        },
        onError: () => setError('No pudimos guardarlo. Revisa tu conexión e inténtalo de nuevo.'),
      },
    );
  };

  const askDelete = () => {
    if (!form?.id) {
      return;
    }
    const id = form.id;
    Alert.alert('¿Eliminar suplemento?', 'Dejarás de ver sus recordatorios y su registro diario.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id, {
            onSuccess: () => setForm(null),
            onError: () => setError('No pudimos eliminarlo. Inténtalo de nuevo.'),
          }),
      },
    ]);
  };

  const protein = form?.type === 'proteina';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Suplementos"
        left={<BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 8, paddingBottom: insets.bottom + 120, gap: 12 }}
      >
        {list.isError ? (
          <BlockError message="No pudimos cargar tus suplementos." onRetry={() => list.refetch().catch(() => undefined)} />
        ) : list.isLoading ? (
          <View style={styles.gap}>
            <Skeleton height={72} radius={20} />
            <Skeleton height={72} radius={20} />
          </View>
        ) : (list.data ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Pill size={28} color={colors.text.secondary} strokeWidth={1.8} />
            <TextV2 variant="bodyStrong" align="center">
              Aún no tienes suplementos
            </TextV2>
            <TextV2 variant="body" tone="secondary" align="center">
              Añádelos y te los recuerdo a su hora. Los marcas con un toque, también desde la notificación.
            </TextV2>
          </View>
        ) : (
          (list.data ?? []).map(supplement => (
            <PressableScale
              key={supplement.id}
              accessibilityRole="button"
              onPress={() => open(supplement)}
              style={[styles.row, { backgroundColor: colors.surface.raised, borderColor: colors.border.card }]}
            >
              <View style={styles.flex}>
                <TextV2 variant="bodyStrong">{supplement.name}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {[TYPE_LABELS[supplement.type], supplement.dose].filter(Boolean).join(' · ')}
                </TextV2>
                <TextV2 variant="meta" tone="tertiary">
                  {supplement.moments
                    .map(m => (supplement.remind && supplement.reminderTimes[m] ? `${MOMENT_LABELS[m]} ${supplement.reminderTimes[m]}` : MOMENT_LABELS[m]))
                    .join(' · ')}
                </TextV2>
              </View>
            </PressableScale>
          ))
        )}
        <TextV2 variant="meta" tone="tertiary" style={styles.note}>
          {SUPPLEMENT_NOTE}
        </TextV2>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: layout.gutter }]}>
        <Button label="Añadir suplemento" icon={Plus} fullWidth onPress={() => open(null)} />
      </View>

      <Sheet
        open={form !== null}
        onClose={() => !save.isPending && setForm(null)}
        title={form?.id ? 'Editar suplemento' : 'Nuevo suplemento'}
        scrollable
        footer={
          <View style={styles.footer}>
            {form?.id ? (
              <Button label="Eliminar" variant="secondary" loading={remove.isPending} onPress={askDelete} style={styles.flex} />
            ) : null}
            <Button label="Guardar" loading={save.isPending} onPress={submit} style={styles.flex2} />
          </View>
        }
      >
        {form ? (
          <View style={styles.form}>
            <TextField
              label="Nombre"
              value={form.name}
              onChangeText={name => setForm({ ...form, name })}
              placeholder="Ej. Creatina"
              maxLength={60}
            />
            <View style={styles.gap}>
              <TextV2 variant="label" tone="secondary">
                Tipo
              </TextV2>
              <View style={styles.chips}>
                {SUPPLEMENT_TYPES.map(type => (
                  <FilterChip
                    key={type}
                    label={TYPE_LABELS[type]}
                    size={36}
                    selected={form.type === type}
                    onPress={() => setForm({ ...form, type, countsAsMeal: type === 'proteina' ? form.countsAsMeal : false })}
                  />
                ))}
              </View>
            </View>
            <TextField
              label="Dosis"
              value={form.dose}
              onChangeText={dose => setForm({ ...form, dose })}
              placeholder="Ej. 5 g · 1 cápsula"
              maxLength={40}
            />
            <View style={styles.gap}>
              <TextV2 variant="label" tone="secondary">
                Momentos
              </TextV2>
              <View style={styles.chips}>
                {SUPPLEMENT_MOMENTS.map(moment => (
                  <FilterChip
                    key={moment}
                    label={MOMENT_LABELS[moment]}
                    size={36}
                    selected={form.moments.includes(moment)}
                    onPress={() => toggleMoment(moment)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.switchRow}>
              <TextV2 variant="bodyStrong" style={styles.flex}>
                Recordarme
              </TextV2>
              <SwitchV2
                value={form.remind}
                onValueChange={remind => setForm({ ...form, remind })}
                accessibilityLabel="Recordarme"
              />
            </View>
            {form.remind
              ? form.moments.map(moment => (
                  <View key={moment} style={styles.timeRow}>
                    <TextV2 variant="body" style={styles.flex}>
                      {`Hora · ${MOMENT_LABELS[moment].toLowerCase()}`}
                    </TextV2>
                    <TextInput
                      accessibilityLabel={`Hora de ${MOMENT_LABELS[moment]}`}
                      value={times[moment] ?? ''}
                      onChangeText={text => setTimes(current => ({ ...current, [moment]: text }))}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.text.disabled}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      style={[styles.time, { backgroundColor: colors.surface.field, color: colors.text.primary }]}
                    />
                  </View>
                ))
              : null}
            {protein ? (
              <>
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <TextV2 variant="bodyStrong">Cuenta como comida</TextV2>
                    <TextV2 variant="meta" tone="secondary">
                      Al marcarla se suma a Snacks.
                    </TextV2>
                  </View>
                  <SwitchV2
                    value={form.countsAsMeal}
                    onValueChange={countsAsMeal => setForm({ ...form, countsAsMeal })}
                    accessibilityLabel="Cuenta como comida"
                  />
                </View>
                {form.countsAsMeal ? (
                  <View style={styles.macros}>
                    {(
                      [
                        ['kcal', 'kcal'],
                        ['p', 'Prot. g'],
                        ['c', 'Carb. g'],
                        ['g', 'Grasa g'],
                      ] as const
                    ).map(([key, label]) => (
                      <View key={key} style={styles.macro}>
                        <TextV2 variant="caption" tone="secondary">
                          {label}
                        </TextV2>
                        <TextInput
                          accessibilityLabel={label}
                          value={form[key] === null ? '' : String(form[key])}
                          onChangeText={text => setForm({ ...form, [key]: numberOf(text) })}
                          keyboardType="decimal-pad"
                          maxLength={5}
                          style={[styles.time, { backgroundColor: colors.surface.field, color: colors.text.primary }]}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
            {error ? (
              <TextV2 variant="meta" tone="ember">
                {error}
              </TextV2>
            ) : null}
            <TextV2 variant="meta" tone="tertiary">
              {SUPPLEMENT_NOTE}
            </TextV2>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  gap: { gap: 10 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  note: { marginTop: 8 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  form: { gap: 18, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { width: 88, height: 44, borderRadius: 14, paddingHorizontal: 12, fontSize: 16, textAlign: 'center' },
  macros: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1, gap: 4 },
});
