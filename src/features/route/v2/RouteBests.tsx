import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, FilterChip, PressableScale, Sheet, TextField, TextV2, useThemeV2, useToast } from '@app/components/v2';
import {
  DISTANCE_KEYS,
  DISTANCE_LABEL,
  localDateOf,
  type DistanceKey,
} from '@app/features/route/routeMappers';
import {
  formatBest,
  parseTimeInput,
  validateManualBest,
  type RoutePersonalBest,
} from '@app/features/route/routeRecords';
import type { RouteSport } from '@app/features/route/routeTypes';
import { useInvalidateRoute } from '@app/features/route/useRouteData';
import { RouteServiceError } from '@app/services/route/routeService';
import { useRouteService } from '@app/services/route/useRouteService';

// Perfil · "Récords de ruta": the best time per distance (automatic ones come
// from the track, manual ones are typed here) and "Registrar una marca". A
// manual mark is only replaced by a faster automatic one (server rule).
export function RouteBests({ bests }: { bests: RoutePersonalBest[] }) {
  const { colors } = useThemeV2();
  const toast = useToast();
  const service = useRouteService();
  const invalidate = useInvalidateRoute();
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<RouteSport>('running');
  const [distance, setDistance] = useState<DistanceKey>('5k');
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const sec = parseTimeInput(time);
    if (sec === null) {
      setError('Escríbelo como mm:ss o h:mm:ss, por ejemplo 24:41.');
      return;
    }
    if (validateManualBest(sport, distance, sec) !== 'ok') {
      setError('Ese tiempo es más rápido de lo posible. Revísalo.');
      return;
    }
    setError(undefined);
    setSaving(true);
    service
      .setPersonalBest({ sport, distanceKey: distance, timeSec: sec, achievedAt: localDateOf(Date.now()) })
      .then(() => {
        invalidate();
        setOpen(false);
        setTime('');
        toast.show('Marca registrada');
      })
      .catch(failure => {
        const code = failure instanceof RouteServiceError ? failure.code : 'unknown';
        setError(
          code === 'too_fast'
            ? 'Ese tiempo es más rápido de lo posible. Revísalo.'
            : 'No pudimos registrar la marca. Inténtalo de nuevo.',
        );
      })
      .finally(() => setSaving(false));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <TextV2 variant="section">Récords de ruta</TextV2>
        <PressableScale accessibilityRole="button" onPress={() => setOpen(true)}>
          <TextV2 variant="metaStrong" color={colors.ember.strong}>
            Registrar una marca
          </TextV2>
        </PressableScale>
      </View>
      {bests.length === 0 ? (
        <TextV2 variant="meta" tone="secondary">
          Tus mejores tiempos en 1K, 5K, 10K, 21K y 42K aparecen aquí al salir a correr. También puedes registrar una marca que ya tengas.
        </TextV2>
      ) : (
        bests.map(best => {
          const f = formatBest(best);
          return (
            <View key={`${best.sport}-${best.distanceKey}`} style={[styles.row, { borderTopColor: colors.divider }]}>
              <View style={styles.flex}>
                <TextV2 variant="bodyStrong">
                  {f.label} · {best.sport === 'running' ? 'Running' : 'Ciclismo'}
                </TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {f.pace}
                  {best.source === 'manual' ? ' · registrada a mano' : ''}
                </TextV2>
              </View>
              <TextV2 variant="title22">{f.time}</TextV2>
            </View>
          );
        })
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar una marca"
        footer={<Button label="Guardar" style={styles.flex} disabled={saving || !time.trim()} onPress={submit} />}
      >
        <View style={styles.form}>
          <View style={styles.chips}>
            <FilterChip label="Running" selected={sport === 'running'} onPress={() => setSport('running')} />
            <FilterChip label="Ciclismo" selected={sport === 'cycling'} onPress={() => setSport('cycling')} />
          </View>
          <View style={styles.chips}>
            {DISTANCE_KEYS.map(key => (
              <FilterChip
                key={key}
                label={DISTANCE_LABEL[key]}
                selected={distance === key}
                onPress={() => setDistance(key)}
              />
            ))}
          </View>
          <TextField
            label="Tiempo (mm:ss o h:mm:ss)"
            value={time}
            onChangeText={value => {
              setTime(value);
              setError(undefined);
            }}
            keyboardType="numbers-and-punctuation"
            placeholder="24:41"
            error={error}
            maxLength={8}
          />
          <TextV2 variant="caption" tone="secondary">
            Una marca a mano solo la reemplaza un récord automático más rápido.
          </TextV2>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  form: { gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
