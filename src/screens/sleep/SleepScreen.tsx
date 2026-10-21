import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, Skeleton, SkeletonGroup, StatusBarV2, TextV2, useToast } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { HealthInviteSheet } from '@app/features/health/HealthInviteSheet';
import {
  SYNC_ON_OPEN_MS,
  connectHealth,
  openHealthSettings,
  syncHealthSleep,
  useHealthState,
} from '@app/features/health/healthStore';
import {
  DEFAULT_BED,
  DEFAULT_WAKE,
  FORM_STEP,
  QUALITY_WORDS,
  RECOVERY_HEADLINES,
  clock,
  feelingLabel,
  hoursLabel,
  inBedMinutes,
  isRecent,
  isTired,
  manualTimestamps,
  minutesOfDay,
  qualityTitle,
  recoveryText,
  stepTime,
  timeLabel,
  type SleepOverview,
} from '@app/features/sleep/sleepModel';
import {
  ConnectCard,
  Duration,
  EstimateTag,
  Eyebrow,
  FeelingPicker,
  InfoTile,
  LegalNote,
  LinkButton,
  NIGHT,
  NightEllieBand,
  NightSection,
  QualityPicker,
  RecordRow,
  RecoveryScale,
  SectionTitle,
  Signals,
  SleepHero,
  Schedule,
  TimeCard,
  WeekBars,
  WhiteButton,
  nightLabel,
  type SleepDraft,
} from '@app/features/sleep/v2/SleepParts';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { invalidateSleep, useSleepOverview } from '@app/hooks/useSleep';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { sleepService } from '@app/services/sleep/sleepService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Sleep'>;

const LEGAL_HEALTH =
  'Datos de Apple Health. ATHELETE usa tu sueño para ajustar entrenos y sugerencias; no diagnostica trastornos del sueño.';
const LEGAL_MANUAL =
  'Sin un dispositivo conectado, ATHELETE no estima fases del sueño ni recuperación. Solo usa lo que registras para ajustar entrenos y sugerencias.';
const NO_HEALTH_TEXT =
  'Sin Apple Health no vemos tu noche. Conéctalo o cuéntanosla en unos segundos y ELLIE ajustará el entreno de hoy.';

// Sueño (handoff v2.15 §25.2 · SLEEP_01–04), all from get_sleep_overview:
// with Apple Health (recovery estimate, last night with stages, 7 nights,
// schedule and body signals), without it (connect or log by hand), the manual
// form (log_sleep_manual, also "Editar") and the night logged by hand. Night
// material in both themes. Apple Health syncs on opening (at most every
// 10 min).
export function SleepScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const language = useProfileLanguage();
  const query = useSleepOverview();
  const health = useHealthState();
  const data = query.data ?? null;
  const [form, setForm] = useState<SleepDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      syncHealthSleep(queryClient, { minIntervalMs: SYNC_ON_OPEN_MS }).catch(() => undefined);
    }, [queryClient]),
  );

  useEffect(() => {
    if (data?.lastNight && !selected) {
      setSelected(data.lastNight.nightDate);
    }
  }, [data?.lastNight, selected]);

  const back = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  const askEllie = () =>
    navigation.navigate(APP_ROUTES.EllieChat, { prompt: '¿Cómo dormí anoche?', source: 'sleep' });

  // "Conectar Apple Health": the invitation first; after a denial (Health
  // gives no night) straight to Salud's settings.
  const onConnect = () => {
    if (health.status === 'noData') {
      openHealthSettings().catch(() => undefined);
      return;
    }
    setInviteOpen(true);
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const status = await connectHealth(queryClient);
      setInviteOpen(false);
      if (status === 'noData') {
        toast.show('Salud no compartió noches. Revisa los permisos en Ajustes.', { tone: 'error' });
      } else if (status === 'connected') {
        toast.show('Apple Health conectado');
      }
    } finally {
      setConnecting(false);
    }
  };

  const openForm = (overview: SleepOverview | null) => {
    const night = overview?.lastNight?.source === 'manual' ? overview.lastNight : null;
    setForm(
      night
        ? {
            bed: minutesOfDay(night.bedtimeAt),
            wake: minutesOfDay(night.wakeAt),
            quality: night.quality,
            feeling: night.wakeFeeling,
          }
        : { bed: DEFAULT_BED, wake: DEFAULT_WAKE, quality: null, feeling: null },
    );
  };

  const save = async () => {
    if (!form || !form.quality || !form.feeling || !data) {
      return;
    }
    setSaving(true);
    try {
      await sleepService.logSleepManual({
        nightDate: data.date,
        ...manualTimestamps(data.date, form.bed, form.wake),
        quality: form.quality,
        wakeFeeling: form.feeling,
      });
      await invalidateSleep(queryClient);
      setForm(null);
    } catch (error) {
      toast.show(routineErrorCopy(error, language).message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const topInset = insets.top;
  let body: React.ReactNode;

  if (!data) {
    body = (
      <View style={[styles.loading, { paddingTop: topInset + 80 }]}>
        {query.isError ? (
          <PressableScale accessibilityRole="button" onPress={() => query.refetch()}>
            <TextV2 variant="body" color={NIGHT.secondary} align="center">
              No pudimos cargar tu sueño ·{' '}
              <TextV2 variant="bodyStrong" color={NIGHT.text}>
                Reintentar
              </TextV2>
            </TextV2>
          </PressableScale>
        ) : (
          <SkeletonGroup>
            <Skeleton height={14} width="40%" />
            <Skeleton height={120} />
            <Skeleton height={200} />
          </SkeletonGroup>
        )}
      </View>
    );
  } else if (form) {
    body = (
      <>
        <SleepHero height={500} topInset={topInset} badge={{ text: noHealthBadge(health.status) }} onBack={back}>
          <Eyebrow>Sueño y recuperación</Eyebrow>
          <TextV2 color={NIGHT.white} style={styles.howTitle}>
            {'¿CÓMO\nDORMISTE?'}
          </TextV2>
          <TextV2 variant="body" color={NIGHT.muted} style={styles.heroText}>
            {NO_HEALTH_TEXT}
          </TextV2>
        </SleepHero>
        <View style={styles.content}>
          <View style={styles.gap32}>
            <View style={styles.gap14}>
              <SectionTitle
                right={
                  <TextV2 variant="meta" color={NIGHT.secondary}>
                    {`${hoursLabel(inBedMinutes(form.bed, form.wake))} en cama`}
                  </TextV2>
                }
              >
                Anoche
              </SectionTitle>
              <View style={styles.row8}>
                <TimeCard
                  label="Te dormiste"
                  value={timeLabel(form.bed)}
                  onMinus={() => setForm({ ...form, bed: stepTime(form.bed, -FORM_STEP) })}
                  onPlus={() => setForm({ ...form, bed: stepTime(form.bed, FORM_STEP) })}
                />
                <TimeCard
                  label="Despertaste"
                  value={timeLabel(form.wake)}
                  onMinus={() => setForm({ ...form, wake: stepTime(form.wake, -FORM_STEP) })}
                  onPlus={() => setForm({ ...form, wake: stepTime(form.wake, FORM_STEP) })}
                />
              </View>
            </View>
            <QualityPicker value={form.quality} onChange={quality => setForm({ ...form, quality })} />
            <FeelingPicker value={form.feeling} onChange={feeling => setForm({ ...form, feeling })} />
            <View style={styles.gap6}>
              <WhiteButton
                label="Guardar noche"
                disabled={!form.quality || !form.feeling}
                loading={saving}
                onPress={save}
              />
              <LinkButton label="Cancelar" color={NIGHT.secondary} onPress={() => setForm(null)} />
            </View>
          </View>
          <LegalNote>{LEGAL_MANUAL}</LegalNote>
        </View>
      </>
    );
  } else if (data.source === 'apple_health' && data.lastNight?.source === 'apple_health') {
    body = <HealthView data={data} selected={selected} onSelect={setSelected} topInset={topInset} onBack={back} onEllie={askEllie} />;
  } else if (data.lastNight?.source === 'manual' && isRecent(data.lastNight.nightDate, data.date)) {
    const night = data.lastNight;
    body = (
      <>
        <SleepHero height={500} topInset={topInset} badge={{ text: 'Registro manual' }} onBack={back}>
          <Eyebrow>Anoche · registrado por ti</Eyebrow>
          <Duration minutes={night.durationMin} size={124} />
          <TextV2 color={NIGHT.white} style={styles.headline}>
            {qualityTitle(night.quality).toUpperCase()}
          </TextV2>
          <TextV2 variant="body" color={NIGHT.muted} style={styles.fs15}>
            {`${clock(night.bedtimeAt)} → ${clock(night.wakeAt)} · ${feelingLabel(night.wakeFeeling)} al despertar`}
          </TextV2>
        </SleepHero>
        <View style={styles.content}>
          <View>
            <SectionTitle
              right={
                <PressableScale accessibilityRole="button" onPress={() => openForm(data)} style={styles.edit}>
                  <TextV2 variant="bodyStrong" color={NIGHT.recoveryLight} style={styles.fs15}>
                    Editar
                  </TextV2>
                </PressableScale>
              }
            >
              Tu registro
            </SectionTitle>
            <RecordRow label="Horario" value={`${clock(night.bedtimeAt)} → ${clock(night.wakeAt)}`} />
            <RecordRow
              label="Calidad"
              value={night.quality ? `${QUALITY_WORDS[night.quality - 1]} · ${night.quality}/5` : '—'}
            />
            <RecordRow label="Al despertar" value={feelingLabel(night.wakeFeeling)} last />
          </View>
          <NightEllieBand text={ellieLine(night.wakeFeeling)} onPress={askEllie} />
          {health.status === 'notConnected' ? <ConnectCard onConnect={onConnect} /> : null}
          <LegalNote>{LEGAL_MANUAL}</LegalNote>
        </View>
      </>
    );
  } else {
    const denied = health.status === 'noData';
    body = (
      <>
        <SleepHero height={500} topInset={topInset} badge={{ text: noHealthBadge(health.status) }} onBack={back}>
          <Eyebrow>Sueño y recuperación</Eyebrow>
          <TextV2 color={NIGHT.white} style={styles.howTitle}>
            {'¿CÓMO\nDORMISTE?'}
          </TextV2>
          <TextV2 variant="body" color={NIGHT.muted} style={styles.heroText}>
            {denied
              ? 'Salud no está compartiendo tu sueño con ATHELETE. Actívalo en Ajustes › Salud › Acceso a datos y dispositivos, o cuéntanos tu noche.'
              : NO_HEALTH_TEXT}
          </TextV2>
          <View style={styles.gap6}>
            {health.status !== 'unavailable' ? (
              <WhiteButton
                label={denied ? 'Abrir Ajustes' : 'Conectar Apple Health'}
                heart={!denied}
                onPress={onConnect}
              />
            ) : null}
            <LinkButton label="Registrar sueño manualmente" onPress={() => openForm(data)} />
          </View>
        </SleepHero>
        <View style={styles.content}>
          {health.status !== 'unavailable' ? (
            <View style={styles.gap16}>
              <SectionTitle>Dos formas de seguir tu descanso</SectionTitle>
              <View style={styles.row8}>
                <InfoTile
                  heart
                  title="Apple Health"
                  headline="Automático cada mañana."
                  text="Duración, fases, FC en reposo y VFC desde tu Apple Watch."
                />
                <InfoTile
                  title="Registro manual"
                  headline="Veinte segundos al despertar."
                  text="Horario, calidad percibida y cómo te sientes."
                />
              </View>
            </View>
          ) : null}
          <LegalNote>{LEGAL_MANUAL}</LegalNote>
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBarV2 style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {body}
      </ScrollView>
      <HealthInviteSheet
        open={inviteOpen}
        busy={connecting}
        onConnect={() => {
          connect().catch(() => undefined);
        }}
        onClose={() => setInviteOpen(false)}
      />
    </View>
  );
}

function noHealthBadge(status: string): string {
  return status === 'noData' ? 'Sin acceso a Salud' : 'Sin Apple Health';
}

function ellieLine(feeling: SleepOverview['wakeFeeling']): string {
  return isTired(feeling)
    ? `Te despertaste ${feelingLabel(feeling).toLowerCase()}. ELLIE puede bajar hoy el volumen. ¿Lo vemos?`
    : `Te despertaste ${feelingLabel(feeling).toLowerCase()}. ELLIE mantiene tu entreno de hoy. ¿Lo vemos?`;
}

// SLEEP_01 · with Apple Health.
function HealthView({
  data,
  selected,
  onSelect,
  topInset,
  onBack,
  onEllie,
}: {
  data: SleepOverview;
  selected: string | null;
  onSelect: (date: string) => void;
  topInset: number;
  onBack: () => void;
  onEllie: () => void;
}) {
  const last = data.lastNight!;
  const recovery = data.recovery;
  const shown =
    selected && selected !== last.nightDate
      ? data.nights7.find(night => night.nightDate === selected) ?? null
      : null;
  const night = shown ? { ...shown, stages: null } : last;
  const ellieText =
    data.wakeFeeling && isTired(data.wakeFeeling)
      ? 'Te despertaste cansado. ELLIE puede bajar hoy el volumen de tu entreno. ¿Lo vemos?'
      : 'ELLIE ya tiene tu descanso de anoche. ¿Vemos cómo ajustar tu entreno?';

  return (
    <>
      <SleepHero height={520} topInset={topInset} badge={{ text: 'Apple Health', heart: true }} glow onBack={onBack}>
        <Eyebrow>Recuperación · Hoy</Eyebrow>
        {recovery ? (
          <>
            <View style={styles.scoreRow}>
              <TextV2 color={NIGHT.white} style={styles.score}>
                {String(recovery.score)}
              </TextV2>
              <TextV2 color={NIGHT.secondary} style={styles.outOf}>
                / 100
              </TextV2>
              {recovery.estimate ? <EstimateTag /> : null}
            </View>
            <TextV2 color={NIGHT.white} style={styles.headline}>
              {RECOVERY_HEADLINES[recovery.headlineCode].toUpperCase()}
            </TextV2>
            <TextV2 variant="body" color={NIGHT.muted} style={styles.heroText}>
              {recoveryText(data)}
            </TextV2>
            <RecoveryScale score={recovery.score} level={recovery.level} />
          </>
        ) : (
          <>
            <Duration minutes={last.durationMin} size={124} />
            <TextV2 color={NIGHT.white} style={styles.headline}>
              SIN ESTIMACIÓN HOY.
            </TextV2>
            <TextV2 variant="body" color={NIGHT.muted} style={styles.heroText}>
              Para estimar tu recuperación necesitamos la noche de ayer en Apple Health. Aquí tienes tu última noche.
            </TextV2>
          </>
        )}
      </SleepHero>
      <View style={styles.content}>
        <NightSection label={nightLabel(night.nightDate, last.nightDate)} night={night} />
        <WeekBars overview={data} selected={selected ?? last.nightDate} onSelect={onSelect} />
        <Schedule overview={data} selected={selected ?? last.nightDate} />
        <Signals overview={data} />
        <NightEllieBand text={ellieText} onPress={onEllie} />
        <View style={styles.legalPull}>
          <LegalNote>{LEGAL_HEALTH}</LegalNote>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NIGHT.bg },
  loading: { paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 40 },
  gap6: { gap: 6 },
  gap14: { gap: 14 },
  gap16: { gap: 16 },
  gap32: { gap: 32 },
  row8: { flexDirection: 'row', gap: 8 },
  fs15: { fontSize: 15 },
  howTitle: { fontSize: 60, lineHeight: 56, fontWeight: '800', letterSpacing: -3 },
  heroText: { fontSize: 15, lineHeight: 22, maxWidth: 320 },
  headline: { fontSize: 30, lineHeight: 29, fontWeight: '800', letterSpacing: -1.05 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: -4 },
  score: { fontSize: 148, lineHeight: 120, fontWeight: '800', letterSpacing: -9.6 },
  outOf: { fontSize: 20, fontWeight: '600', paddingBottom: 8 },
  edit: { height: 44, justifyContent: 'center' },
  legalPull: { marginTop: -20 },
});
