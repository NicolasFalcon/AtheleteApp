import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check } from 'lucide-react-native';
import {
  BackButton,
  CapsuleGrid,
  PressableScale,
  StatusBarV2,
  TextV2,
  type CapsuleCellState,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { CHALLENGE_PHOTOS } from '@app/features/core33/v2/Core33Parts';
import { useCore33 } from '@app/hooks/useCore33';
import { SceneScope } from '@app/providers/ThemeProvider';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Core33Intro'>;

const STEPS = [
  { title: '33 días.\nUna intención.', body: 'Eliges un reto y lo trabajas durante 33 días.', cta: 'Continuar' },
  { title: 'Constancia,\nno perfección.', body: 'Cada día, tres acciones pequeñas ligadas a tu reto.', cta: 'Continuar' },
  { title: 'Tu progreso\nqueda visible.', body: 'Completas tus acciones, cierras el día y ves avanzar tus 33 días.', cta: 'Explorar retos' },
];

const DEMO: CapsuleCellState[] = Array.from({ length: 33 }, (_, i) =>
  i < 12 ? 'closed' : i === 12 ? 'today' : 'open',
);

// Intro (CORE33_01_INTRO_1/2/3): three moments on a dark scene, always the
// same in Light and Dark. Leaving it (Explorar retos or Saltar) marks the
// intro as seen (profiles.core33_intro_seen_at).
export function Core33IntroScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { markIntroSeen } = useCore33();
  const [step, setStep] = useState<number>(__DEV__ ? route.params?.devStep ?? 0 : 0);
  const current = STEPS[step];

  const toExplore = () => {
    markIntroSeen().catch(() => {});
    navigation.replace(APP_ROUTES.Core33Explore);
  };

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        {step === 0 ? (
          <>
            <Image source={CHALLENGE_PHOTOS.fuerza} resizeMode="cover" style={styles.photo} />
            <LinearGradient
              colors={['rgba(20,19,18,.35)', 'rgba(20,19,18,.55)', '#141312']}
              locations={[0, 0.5, 0.92]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        ) : null}
        {step === 1 ? (
          <Svg style={styles.glow} width="100%" height={560} pointerEvents="none">
            <Defs>
              <RadialGradient id="c33glow" cx="50%" cy="45%" rx="60%" ry="50%">
                <Stop offset="0" stopColor="#FF5B1F" stopOpacity={0.16} />
                <Stop offset="1" stopColor="#FF5B1F" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#c33glow)" />
          </Svg>
        ) : null}

        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <BackButton
            variant="glass"
            onPress={() =>
              step > 0 ? setStep(step - 1) : safeGoBack(navigation, [ROOT_ROUTES.MainTabs])
            }
          />
          <View style={styles.segments}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[styles.segment, { backgroundColor: index <= step ? '#FFFFFF' : 'rgba(255,255,255,.24)' }]}
              />
            ))}
          </View>
          <PressableScale accessibilityRole="button" onPress={toExplore} style={styles.skip}>
            <TextV2 variant="bodyStrong" color="#FFFFFF">
              Saltar
            </TextV2>
          </PressableScale>
        </View>

        <View style={styles.visual}>
          {step === 0 ? (
            <TextV2 variant="title28" color="#FFFFFF" style={styles.big}>
              33
            </TextV2>
          ) : step === 1 ? (
            <View style={styles.circles}>
              {[
                { label: 'Mover', done: true },
                { label: 'Nutrir', done: true },
                { label: 'Descansar', done: false },
              ].map(item => (
                <View key={item.label} style={styles.circleWrap}>
                  <View
                    style={[
                      styles.circle,
                      item.done
                        ? { backgroundColor: '#FF5B1F' }
                        : { boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.4)' },
                    ]}
                  >
                    {item.done ? <Check size={30} color="#121212" strokeWidth={2.4} /> : null}
                  </View>
                  <TextV2 variant="eyebrow" color="#A8A6A1">
                    {item.label}
                  </TextV2>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.progress}>
              <View style={styles.progressNumber}>
                <TextV2 variant="title28" color="#FFFFFF" style={styles.bigStep}>
                  12
                </TextV2>
                <TextV2 variant="title22" color="#A8A6A1">
                  / 33
                </TextV2>
              </View>
              <CapsuleGrid states={DEMO} showEnds />
            </View>
          )}
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextV2 variant="title28" color="#FFFFFF" style={styles.title}>
            {current.title}
          </TextV2>
          <TextV2 variant="bodyL" color="#D8D6D1">
            {current.body}
          </TextV2>
          <PressableScale
            accessibilityRole="button"
            onPress={() => (step < 2 ? setStep(step + 1) : toExplore())}
            style={styles.cta}
          >
            <TextV2 variant="cta" color="#121212">
              {current.cta}
            </TextV2>
            <ArrowRight size={18} color="#121212" strokeWidth={2} />
          </PressableScale>
        </View>
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141312' },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  glow: { position: 'absolute', top: 60, left: 0, right: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 2, borderRadius: 1 },
  skip: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  visual: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  big: { fontSize: 260, lineHeight: 250, fontWeight: '700', letterSpacing: -12 },
  circles: { flexDirection: 'row', justifyContent: 'space-between' },
  circleWrap: { alignItems: 'center', gap: 14 },
  circle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { gap: 14 },
  progressNumber: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bigStep: { fontSize: 120, lineHeight: 120, fontWeight: '700', letterSpacing: -5 },
  bottom: { paddingHorizontal: 20, gap: 10 },
  title: { fontSize: 32, lineHeight: 36, fontWeight: '600' },
  cta: { marginTop: 14, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
