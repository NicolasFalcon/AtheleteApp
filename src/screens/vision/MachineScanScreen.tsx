import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, LivingHalo, PressableScale, TextV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  createScanSession,
  exercisesFromIds,
  MACHINE_QUESTION,
  percent,
  resultFromScan,
  type MachineResult,
} from '@app/features/vision/machineScanModel';
import { uploadVisionImage } from '@app/features/vision/imageUpload';
import { pickFromGallery } from '@app/features/vision/picker';
import { CameraCapture } from '@app/features/vision/v2/CameraCapture';
import { VisionFailureSheet } from '@app/features/vision/v2/VisionFailureSheet';
import { useVisionUsage } from '@app/features/vision/useVisionUsage';
import { lowQuotaNotice, type VisionAction, type VisionFailureInput } from '@app/features/vision/visionCopy';
import { useAuth } from '@app/hooks/useAuth';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { createUuid } from '@app/lib/uuid';
import { EllieError } from '@app/services/ellie/ellieService';
import { chooseMachineCandidate, scanMachine, VisionError } from '@app/services/vision/visionService';
import type { AppScreenProps } from '@app/types/navigation';

const SCENE = '#0E0D0C';
const STEPS = {
  es: ['Mirando la máquina', 'Buscando en el catálogo', 'Eligiendo ejercicios'],
  en: ['Looking at the machine', 'Checking the catalogue', 'Picking exercises'],
} as const;

type Phase =
  | { kind: 'camera' }
  | { kind: 'analyzing'; uri: string }
  | { kind: 'failed'; uri: string; failure: VisionFailureInput }
  | { kind: 'result'; uri: string; result: MachineResult }
  | { kind: 'choosing'; uri: string; result: Extract<MachineResult, { kind: 'choose' }> };

// Escanear máquina (design §10): photo → "Analizando…" → the equipment with
// its exercises (each opens its detail), or up to 3 candidates to choose from.
export function MachineScanScreen({ navigation }: AppScreenProps<'MachineScan'>) {
  const insets = useSafeAreaInsets();
  const language = useProfileLanguage();
  const es = language === 'es';
  const { profile, signOut } = useAuth();
  const userId = profile?.id;
  const quota = useVisionUsage('machine');
  const library = useExerciseLibrary();
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });
  const [step, setStep] = useState(0);
  const [pickError, setPickError] = useState(false);
  const session = useRef(createScanSession(createUuid));
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (phase.kind !== 'analyzing' && phase.kind !== 'choosing') {
      setStep(0);
      return undefined;
    }
    const timer = setInterval(() => setStep(value => Math.min(2, value + 1)), 900);
    return () => clearInterval(timer);
  }, [phase.kind]);

  const analyze = useCallback(
    async (uri: string) => {
      if (!userId) {
        return;
      }
      cancelled.current = false;
      setPhase({ kind: 'analyzing', uri });
      try {
        if (!uploaded.current || uploaded.current.uri !== uri) {
          const sent = await uploadVisionImage({ kind: 'machine', userId, uri });
          uploaded.current = { uri, path: sent.path };
        }
        // Same client_request_id for the same photo, also on retry.
        const scan = await scanMachine({
          imagePath: uploaded.current.path,
          clientRequestId: session.current.idFor(uri),
        });
        quota.record(scan.usage);
        if (!cancelled.current) {
          setPhase({ kind: 'result', uri, result: resultFromScan(scan) });
        }
      } catch (error) {
        if (cancelled.current) {
          return;
        }
        if (error instanceof VisionError && error.usage) {
          quota.record(error.usage);
        }
        const failure: VisionFailureInput =
          error instanceof EllieError
            ? { code: error.code, used: error.used, limit: error.limit }
            : { code: error instanceof Error && error.name === 'ImageTooLargeError' ? 'image_too_large' : 'offline' };
        setPhase({ kind: 'failed', uri, failure });
      }
    },
    [quota, userId],
  );

  const choose = async (uri: string, result: Extract<MachineResult, { kind: 'choose' }>, equipmentId: string) => {
    const candidate = result.candidates.find(item => item.equipmentId === equipmentId);
    setPickError(false);
    setPhase({ kind: 'choosing', uri, result });
    try {
      const chosen = await chooseMachineCandidate(result.scanId, equipmentId);
      setPhase({
        kind: 'result',
        uri,
        result: {
          kind: 'found',
          scanId: result.scanId,
          name: candidate?.name ?? '',
          confidence: candidate?.confidence ?? 0,
          exercises: exercisesFromIds(chosen.exerciseIds, library.data ?? []),
        },
      });
    } catch {
      setPickError(true);
      setPhase({ kind: 'result', uri, result });
    }
  };

  const retake = () => {
    uploaded.current = null;
    session.current.reset();
    setPhase({ kind: 'camera' });
  };

  const askEllie = () =>
    navigation.navigate(APP_ROUTES.EllieChat, { prompt: MACHINE_QUESTION[language], source: 'machine_scan' });

  const onAction = (action: VisionAction) => {
    const failed = phase.kind === 'failed' ? phase : null;
    switch (action) {
      case 'other_photo':
        retake();
        break;
      case 'retry':
        if (failed) {
          analyze(failed.uri).catch(() => undefined);
        }
        break;
      case 'manual':
      case 'quick_kcal':
        navigation.replace(APP_ROUTES.ExerciseList, {});
        break;
      case 'ask_ellie':
        askEllie();
        break;
      case 'login':
        signOut().catch(() => undefined);
        break;
      default:
        navigation.goBack();
    }
  };

  const notice = quota.left !== null ? lowQuotaNotice(quota.left, language, true) : null;
  const photo = phase.kind === 'camera' ? null : phase.uri;
  const busy = phase.kind === 'analyzing' || phase.kind === 'choosing';

  return (
    <View style={[styles.screen, { backgroundColor: SCENE }]}>
      {phase.kind === 'camera' ? (
        <CameraCapture
          kind="machine"
          language={language}
          headerLabel={es ? 'Escanear máquina' : 'Scan machine'}
          notice={notice}
          onCaptured={uri => {
            analyze(uri).catch(() => undefined);
          }}
          onGallery={() => {
            pickFromGallery()
              .then(picked => (picked ? analyze(picked.uri) : undefined))
              .catch(() => undefined);
          }}
          onClose={() => navigation.goBack()}
        />
      ) : (
        <View style={styles.screen}>
          {photo ? <Image source={{ uri: photo }} style={[StyleSheet.absoluteFill, styles.dim]} resizeMode="cover" /> : null}
          <View style={styles.shade} />
          {busy ? (
            <View style={styles.analyzing}>
              <LivingHalo size={88} state="thinking" />
              <TextV2 variant="title22" color="#FFFFFF" align="center">
                {phase.kind === 'choosing'
                  ? es ? 'Buscando ejercicios…' : 'Finding exercises…'
                  : es ? 'Analizando la máquina…' : 'Analysing the machine…'}
              </TextV2>
              <TextV2 variant="body" color="#A8A6A1" align="center">
                {STEPS[language][step]}
              </TextV2>
              <PressableScale
                accessibilityRole="button"
                onPress={() => {
                  cancelled.current = true;
                  retake();
                }}
                style={styles.cancel}
              >
                <X size={16} color="#FFFFFF" strokeWidth={2} />
                <TextV2 variant="bodyStrong" color="#FFFFFF">
                  {es ? 'Cancelar' : 'Cancel'}
                </TextV2>
              </PressableScale>
            </View>
          ) : null}
          {phase.kind === 'result' ? (
            <ScrollView
              contentContainerStyle={[styles.result, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}
            >
              {phase.result.kind === 'found' ? (
                <FoundView
                  result={phase.result}
                  es={es}
                  onExercise={exerciseId => navigation.navigate(APP_ROUTES.ExerciseDetail, { exerciseId })}
                />
              ) : (
                <View style={styles.block}>
                  <TextV2 variant="eyebrow" color="#A8A6A1">
                    {es ? 'NO ESTOY SEGURA' : "I'M NOT SURE"}
                  </TextV2>
                  <TextV2 variant="title22" color="#FFFFFF">
                    {es ? '¿Cuál de estas es?' : 'Which one is it?'}
                  </TextV2>
                  {pickError ? (
                    <TextV2 variant="body" color="#FF8A5B">
                      {es ? 'No pudimos cargarla. Inténtalo de nuevo.' : "We couldn't load it. Please try again."}
                    </TextV2>
                  ) : null}
                  {phase.result.candidates.map(candidate => (
                    <PressableScale
                      key={candidate.equipmentId}
                      accessibilityRole="button"
                      onPress={() => {
                        if (phase.result.kind === 'choose') {
                          choose(phase.uri, phase.result, candidate.equipmentId).catch(() => undefined);
                        }
                      }}
                      style={styles.row}
                    >
                      <TextV2 variant="bodyStrong" color="#FFFFFF" style={styles.flex}>
                        {candidate.name}
                      </TextV2>
                      <TextV2 variant="meta" color="#A8A6A1">
                        {percent(candidate.confidence)}%
                      </TextV2>
                    </PressableScale>
                  ))}
                </View>
              )}
              <View style={styles.actions}>
                <Button label={es ? 'Preguntar a ELLIE' : 'Ask ELLIE'} fullWidth onPress={askEllie} />
                <Button label={es ? 'Otra foto' : 'Another photo'} variant="onScene" fullWidth onPress={retake} />
              </View>
            </ScrollView>
          ) : null}
          {phase.kind === 'result' ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={es ? 'Cerrar' : 'Close'}
              onPress={() => navigation.goBack()}
              style={[styles.close, { top: insets.top + 8 }]}
            >
              <X size={20} color="#FFFFFF" strokeWidth={2} />
            </PressableScale>
          ) : null}
        </View>
      )}

      <VisionFailureSheet
        failure={phase.kind === 'failed' ? phase.failure : null}
        context="machine"
        language={language}
        onAction={onAction}
        onClose={() => {
          if (phase.kind === 'failed') {
            retake();
          }
        }}
      />
    </View>
  );
}

function FoundView({
  result,
  es,
  onExercise,
}: {
  result: Extract<MachineResult, { kind: 'found' }>;
  es: boolean;
  onExercise: (exerciseId: string) => void;
}) {
  return (
    <View style={styles.block}>
      <TextV2 variant="eyebrow" color="#A8A6A1">
        {es ? 'MÁQUINA RECONOCIDA' : 'MACHINE RECOGNISED'}
      </TextV2>
      <TextV2 variant="title22" color="#FFFFFF">
        {result.name}
      </TextV2>
      {result.confidence > 0 ? (
        <TextV2 variant="meta" color="#A8A6A1">
          {es ? `${percent(result.confidence)}% de seguridad` : `${percent(result.confidence)}% sure`}
        </TextV2>
      ) : null}
      <TextV2 variant="bodyStrong" color="#FFFFFF" style={styles.listTitle}>
        {es ? 'Ejercicios con esta máquina' : 'Exercises on this machine'}
      </TextV2>
      {result.exercises.length === 0 ? (
        <TextV2 variant="body" color="#A8A6A1">
          {es ? 'Aún no hay ejercicios del catálogo para esta máquina.' : 'No catalogue exercises for this machine yet.'}
        </TextV2>
      ) : (
        result.exercises.map(exercise => (
          <PressableScale
            key={exercise.id}
            accessibilityRole="button"
            onPress={() => onExercise(exercise.id)}
            style={styles.row}
          >
            <TextV2 variant="bodyStrong" color="#FFFFFF" style={styles.flex}>
              {exercise.name}
            </TextV2>
            <ChevronRight size={18} color="#A8A6A1" strokeWidth={2} />
          </PressableScale>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  dim: { opacity: 0.4 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,13,12,.6)' },
  analyzing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.14)', marginTop: 18 },
  result: { paddingHorizontal: 20, gap: 24 },
  block: { gap: 10 },
  listTitle: { marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.1)' },
  actions: { gap: 10 },
  close: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
});
