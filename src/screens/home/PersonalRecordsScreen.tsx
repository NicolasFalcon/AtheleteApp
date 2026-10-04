import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trophy } from 'lucide-react-native';
import {
  BackButton,
  Button,
  Celebration,
  GlassHeader,
  GlassSurface,
  IconButton,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  formatRecord,
  groupRecords,
  type RecordHistoryRow,
} from '@app/features/progress/recordsModel';
import {
  RecordHistory,
  RecordPlate,
  RecordsGrid,
} from '@app/features/progress/v2/RecordViews';
import {
  RegisterRecordSheet,
  type RecordExercise,
} from '@app/features/progress/v2/RegisterRecordSheet';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { PRInsert } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PersonalRecords'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Récords v2: the list of marks (one card per exercise) and, with an
// exercise, the record detail (RECORDS_01) with its history and the
// "Registrar récord" sheet (RECORDS_02). Manual records only; a mark detected
// in a session shows as such in the history.
export function PersonalRecordsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const exerciseId = route.params?.exerciseId;
  const dev = __DEV__ ? route.params?.devState : undefined;
  const recordsQuery = usePersonalRecords();
  const exercisesQuery = useExerciseLibrary();

  const [sheetOpen, setSheetOpen] = useState(
    __DEV__ ? Boolean(route.params?.devSheet) : false,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    value: string;
    unit: string;
    subtitle: string;
  } | null>(
    __DEV__ && route.params?.devCelebration
      ? { value: '205', unit: 'kg × 1', subtitle: 'Peso muerto rumano' }
      : null,
  );

  const now = useMemo(() => new Date(), []);
  const fixture = useMemo(() => {
    if (!__DEV__ || dev !== 'data') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@app/dev/progressFixtures') as typeof import('@app/dev/progressFixtures');
  }, [dev]);

  const records = useMemo(
    () =>
      fixture
        ? fixture.progressFixture(now).records
        : dev === 'empty'
        ? []
        : recordsQuery.records,
    [dev, fixture, now, recordsQuery.records],
  );
  const library = exercisesQuery.data;
  const groups = useMemo(
    () =>
      groupRecords(
        records,
        id =>
          fixture
            ? fixture.FIXTURE_EXERCISE_NAMES[id] ?? 'Ejercicio'
            : library?.find(item => item.id === id)?.name ??
              route.params?.exerciseName ??
              'Ejercicio',
        now,
      ),
    [fixture, library, now, records, route.params?.exerciseName],
  );

  const loading =
    dev === 'loading' ||
    (!dev && (recordsQuery.isLoading || exercisesQuery.isLoading));
  const failed =
    dev === 'error' ||
    (!dev && Boolean(recordsQuery.error || exercisesQuery.error));
  const group = exerciseId
    ? groups.find(item => item.exerciseId === exerciseId) ?? null
    : null;
  const sheetExercise: RecordExercise | null = exerciseId
    ? {
        id: exerciseId,
        name:
          group?.exerciseName ??
          route.params?.exerciseName ??
          library?.find(item => item.id === exerciseId)?.name ??
          'Ejercicio',
      }
    : null;

  const back = () => safeGoBack(navigation, BACK_FALLBACKS);
  const retry = () => {
    recordsQuery.refetch().catch(() => {});
    exercisesQuery.refetch().catch(() => {});
  };

  const save = async (
    insert: PRInsert,
    beatsBest: boolean,
    exercise: RecordExercise,
  ) => {
    setSaveError(null);
    try {
      if (!dev) {
        // personal_records (source 'manual') and `personal_record_created`,
        // idempotent by the record id.
        await recordsQuery.addRecord(insert);
      }
      setSheetOpen(false);
      const shown = formatRecord({
        prType: insert.prType,
        valueWeight: insert.valueWeight ?? null,
        valueReps: insert.valueReps ?? null,
        valueDurationSec: insert.valueDurationSec ?? null,
        valueDistanceM: insert.valueDistanceM ?? null,
      });
      if (beatsBest) {
        setCelebration({
          value: shown.value,
          unit: shown.unit,
          subtitle: exercise.name,
        });
      } else {
        toast.show('Récord guardado');
      }
    } catch (error) {
      console.warn('[records] No se pudo guardar el récord.', error);
      setSaveError('No pudimos guardar el récord. Inténtalo otra vez.');
    }
  };

  const confirmDelete = (row: RecordHistoryRow) => {
    if (row.source === 'session' || dev) {
      return;
    }
    Alert.alert(
      'Eliminar este récord',
      'Se quita de tu historial. Esto no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            recordsQuery
              .deleteRecord(row.record.id)
              .catch(() =>
                toast.show('No pudimos eliminarlo', { tone: 'error' }),
              );
          },
        },
      ],
    );
  };

  const sheet = (
    <RegisterRecordSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      exercise={sheetExercise}
      exercises={library ?? []}
      records={records}
      saving={recordsQuery.isAddingRecord}
      error={saveError}
      onSave={(insert, beats, exercise) => {
        save(insert, beats, exercise).catch(() => {});
      }}
    />
  );
  const celebrationView = (
    <Celebration
      visible={Boolean(celebration)}
      icon={Trophy}
      eyebrow="Nuevo récord"
      value={celebration?.value ?? ''}
      unit={celebration?.unit}
      subtitle={celebration?.subtitle}
      onClose={() => setCelebration(null)}
    />
  );

  // ── Loading / error ─────────────────────────────────────────────────────
  if (loading || failed) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 />
        <GlassHeader title="Récords" left={<BackButton onPress={back} />} />
        <View style={[styles.body, { paddingHorizontal: layout.gutter }]}>
          {failed ? (
            <BlockError
              message="No pudimos cargar tus récords."
              onRetry={retry}
            />
          ) : (
            <SkeletonGroup>
              <View style={styles.skeletonGrid}>
                {[0, 1, 2, 3].map(index => (
                  <Skeleton
                    key={index}
                    height={196}
                    radius={24}
                    style={styles.skeletonCard}
                  />
                ))}
              </View>
            </SkeletonGroup>
          )}
        </View>
      </View>
    );
  }

  // ── Detail (RECORDS_01) ─────────────────────────────────────────────────
  if (exerciseId) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 style="light" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {group ? (
            <RecordPlate group={group} top={insets.top + 58} width={width} />
          ) : (
            <SceneScope>
              <View
                style={[styles.emptyPlate, { paddingTop: insets.top + 58 }]}
              >
                <TextV2 variant="eyebrow" color="#A8A6A1">
                  Mejor marca
                </TextV2>
                <TextV2 variant="section" color="#FFFFFF">
                  {sheetExercise?.name}
                </TextV2>
                <TextV2 variant="body" color="#D8D6D1" style={styles.emptyLine}>
                  Todavía no tienes una marca en este ejercicio.
                </TextV2>
              </View>
            </SceneScope>
          )}
          {group ? (
            <View
              style={[styles.history, { paddingHorizontal: layout.gutter }]}
            >
              <RecordHistory rows={group.history} onLongPress={confirmDelete} />
            </View>
          ) : null}
        </ScrollView>
        <SceneScope>
          <View style={[styles.back, { top: insets.top + 4 }]}>
            <BackButton onPress={back} variant="glass" />
          </View>
        </SceneScope>
        <GlassSurface
          kind="nav"
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 4,
              borderTopColor: colors.divider,
            },
          ]}
        >
          <Button
            label="Registrar nuevo récord"
            onPress={() => {
              setSaveError(null);
              setSheetOpen(true);
            }}
          />
        </GlassSurface>
        {sheet}
        {celebrationView}
      </View>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────
  const cardWidth = Math.floor((width - layout.gutter * 2 - 12) / 2);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Récords"
        left={<BackButton onPress={back} />}
        right={
          <IconButton
            icon={Plus}
            accessibilityLabel="Registrar récord"
            onPress={() => {
              setSaveError(null);
              setSheetOpen(true);
            }}
          />
        }
      />
      {groups.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.surface.muted },
            ]}
          >
            <Trophy size={28} color={colors.text.secondary} strokeWidth={2} />
          </View>
          <TextV2 variant="section" align="center">
            Tu primera marca aparecerá aquí
          </TextV2>
          <TextV2
            variant="body"
            tone="secondary"
            align="center"
            style={styles.emptyText}
          >
            Registra un récord o supéralo en una sesión y lo verás con su
            historial.
          </TextV2>
          <Button
            label="Registrar récord"
            variant="secondary"
            size="md"
            onPress={() => {
              setSaveError(null);
              setSheetOpen(true);
            }}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: layout.gutter,
              paddingBottom: insets.bottom + 40,
            },
          ]}
        >
          <TextV2 variant="meta" tone="secondary">
            {groups.length === 1 ? '1 récord' : `${groups.length} récords`}
          </TextV2>
          <RecordsGrid
            groups={groups}
            cardWidth={cardWidth}
            onOpen={item =>
              navigation.navigate(APP_ROUTES.PersonalRecords, {
                exerciseId: item.exerciseId,
                exerciseName: item.exerciseName,
                devState: dev,
              })
            }
          />
        </ScrollView>
      )}
      {sheet}
      {celebrationView}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingTop: 16 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skeletonCard: { width: '47%', flexGrow: 1 },
  emptyPlate: {
    backgroundColor: '#141312',
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 8,
  },
  emptyLine: { marginTop: 8 },
  history: { paddingTop: 30 },
  back: { position: 'absolute', left: 16 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  listContent: { paddingTop: 16, gap: 14 },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 110,
    paddingHorizontal: 28,
    gap: 18,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { maxWidth: 300 },
});
