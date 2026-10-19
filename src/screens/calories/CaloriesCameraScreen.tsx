import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LivingHalo, PressableScale, TextV2, useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { draftFromAnalysis, toSaveInput, type MealDraft } from '@app/features/nutrition/mealDraft';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { QuickKcalSheet, type QuickKcalResult } from '@app/features/nutrition/v2/QuickKcalSheet';
import { createPhotoRequestSession } from '@app/features/vision/photoRequest';
import { pickFromGallery } from '@app/features/vision/picker';
import { uploadVisionImage } from '@app/features/vision/imageUpload';
import {
  lowQuotaNotice,
  visionFailureFrom,
  type VisionAction,
  type VisionFailureInput,
} from '@app/features/vision/visionCopy';
import { CameraCapture } from '@app/features/vision/v2/CameraCapture';
import { VisionFailureSheet } from '@app/features/vision/v2/VisionFailureSheet';
import { useVisionUsage } from '@app/features/vision/useVisionUsage';
import { useAuth } from '@app/hooks/useAuth';
import { useMealMutations } from '@app/hooks/useMeals';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { createUuid } from '@app/lib/uuid';
import { analyzeMeal, VisionError } from '@app/services/vision/visionService';
import type { AppScreenProps } from '@app/types/navigation';

const SCENE = '#0E0D0C';
const STEPS = {
  es: ['Reconociendo alimentos', 'Estimando porciones', 'Calculando kcal y macros'],
  en: ['Recognising foods', 'Estimating portions', 'Working out kcal and macros'],
} as const;

type Phase =
  | { kind: 'camera' }
  | { kind: 'analyzing'; uri: string }
  | { kind: 'failed'; uri: string; failure: VisionFailureInput };

// Registrar con foto (design §23.2): the camera (or the gallery) → "Analizando
// tu plato…" → the result. A failure comes up as a sheet over the dimmed photo
// and always offers Kcal rápidas.
export function CaloriesCameraScreen({ navigation, route }: AppScreenProps<'CaloriesCamera'>) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const language = useProfileLanguage();
  const es = language === 'es';
  const { profile, signOut } = useAuth();
  const userId = profile?.id;
  const quota = useVisionUsage('meal');
  const meals = useMealMutations();
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });
  const [step, setStep] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickReason, setQuickReason] = useState<string | null>(null);
  // What is already in storage for this photo: a retry does not upload again.
  const uploaded = useRef<{ uri: string; path: string; localUri: string } | null>(null);
  // client_request_id: one per photo, the same on every retry of it.
  const requests = useRef(createPhotoRequestSession(createUuid));
  const cancelled = useRef(false);

  useEffect(() => {
    if (phase.kind !== 'analyzing') {
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
          const sent = await uploadVisionImage({ kind: 'meal', userId, uri });
          uploaded.current = { uri, path: sent.path, localUri: sent.uri };
        }
        const { draft, usage } = await analyzeMeal({
          imagePath: uploaded.current.path,
          clientRequestId: requests.current.idFor(uri),
        });
        quota.record(usage);
        if (cancelled.current) {
          return;
        }
        navigation.replace(APP_ROUTES.MealReview, {
          draft: draftFromAnalysis(draft, new Date()),
          photoUri: uploaded.current.localUri,
          source: 'photo',
        });
      } catch (error) {
        if (cancelled.current) {
          return;
        }
        if (error instanceof VisionError && error.usage) {
          quota.record(error.usage);
        }
        setPhase({ kind: 'failed', uri, failure: visionFailureFrom(error) });
      }
    },
    [navigation, quota, userId],
  );

  const gallery = async () => {
    const picked = await pickFromGallery();
    if (picked) {
      analyze(picked.uri).catch(() => undefined);
    }
  };

  const openQuick = (reason: string | null) => {
    setQuickError(null);
    setQuickReason(reason);
    setQuickOpen(true);
  };

  const onAction = (action: VisionAction) => {
    const failed = phase.kind === 'failed' ? phase : null;
    switch (action) {
      case 'other_photo':
        uploaded.current = null;
        requests.current.reset();
        setPhase({ kind: 'camera' });
        break;
      case 'retry':
        if (failed) {
          analyze(failed.uri).catch(() => undefined);
        }
        break;
      case 'quick_kcal': {
        const code = failed?.failure.code;
        openQuick(
          code === 'offline'
            ? es ? 'Sin conexión: registra solo las kcal.' : 'No connection: log just the kcal.'
            : code === 'daily_image_limit' || code === 'vision_attempts_limit'
              ? es ? 'Límite de análisis de hoy alcanzado.' : "Today's analysis limit reached."
              : null,
        );
        break;
      }
      case 'login':
        signOut().catch(() => undefined);
        break;
      default:
        navigation.goBack();
    }
  };

  const saveQuick = async (result: QuickKcalResult) => {
    setQuickError(null);
    try {
      await meals.save.mutateAsync(
        toSaveInput(
          {
            title: result.title,
            mealType: result.mealType,
            mealTypeFromClock: false,
            items: [],
            manualKcal: result.kcal,
            confidence: null,
            warnings: [],
            imagePath: null,
          } satisfies MealDraft,
          { source: 'manual', language },
        ),
      );
      setQuickOpen(false);
      toast.show(es ? 'Comida registrada' : 'Meal logged');
      navigation.popTo(APP_ROUTES.NutritionPlan);
    } catch {
      setQuickError(es ? 'No pudimos guardarla. Inténtalo de nuevo.' : "We couldn't save it. Please try again.");
    }
  };

  const notice =
    quota.left !== null
      ? lowQuotaNotice(quota.left, language, true)
      : route.params?.source === 'home' && route.params.todayKcal !== undefined
        ? es
          ? `Hoy llevas ${formatThousands(route.params.todayKcal)} kcal`
          : `Today you're at ${formatThousands(route.params.todayKcal)} kcal`
        : null;

  return (
    <View style={[styles.screen, { backgroundColor: SCENE }]}>
      {phase.kind === 'camera' ? (
        <CameraCapture
          kind="meal"
          language={language}
          headerLabel={es ? 'Registrar con ELLIE' : 'Log with ELLIE'}
          notice={notice}
          onCaptured={uri => {
            analyze(uri).catch(() => undefined);
          }}
          onGallery={() => {
            gallery().catch(() => undefined);
          }}
          onClose={() => navigation.goBack()}
          onNoPhoto={() => openQuick(null)}
        />
      ) : (
        <View style={styles.screen}>
          <Image source={{ uri: phase.uri }} style={[StyleSheet.absoluteFill, styles.dim]} resizeMode="cover" />
          <View style={styles.shade} />
          {phase.kind === 'analyzing' ? (
            <View style={styles.analyzing}>
              <LivingHalo size={88} state="thinking" />
              <TextV2 variant="title22" color="#FFFFFF" align="center">
                {es ? 'Analizando tu plato…' : 'Analysing your plate…'}
              </TextV2>
              <TextV2 variant="body" color="#A8A6A1" align="center">
                {STEPS[language][step]}
              </TextV2>
              <View style={styles.segments}>
                {[0, 1, 2].map(index => (
                  <View
                    key={index}
                    style={[styles.segment, { backgroundColor: index <= step ? '#FF5B1F' : 'rgba(255,255,255,.2)' }]}
                  />
                ))}
              </View>
              <PressableScale
                accessibilityRole="button"
                onPress={() => {
                  cancelled.current = true;
                  setPhase({ kind: 'camera' });
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
        </View>
      )}

      <VisionFailureSheet
        failure={phase.kind === 'failed' ? phase.failure : null}
        context="meal"
        language={language}
        onAction={onAction}
        onClose={() => {
          if (phase.kind === 'failed') {
            setPhase({ kind: 'camera' });
          }
        }}
      />

      <QuickKcalSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSubmit={result => {
          saveQuick(result).catch(() => undefined);
        }}
        saving={meals.save.isPending}
        error={quickError}
        reason={quickReason}
        language={language}
      />
      <View style={{ height: insets.bottom }} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Saturation .35 / brightness .5 of the design, as a dark veil.
  dim: { opacity: 0.55 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,13,12,.55)' },
  analyzing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { width: 22, height: 4, borderRadius: 2 },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.14)', marginTop: 18 },
});
