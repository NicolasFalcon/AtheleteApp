import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Reanimated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Check, ChevronRight, Droplet, Trophy } from 'lucide-react-native';
import { AuraMark, PressableScale, TextV2 } from '@app/components/v2';
import {
  CONFIRMATION_MS,
  EFFORT_OPTIONS,
  followUpQuestion,
  MESSAGE_AUTO_CLOSE_MS,
  NOTE_MAX,
  TREND_OPTIONS,
  ZONE_OPTIONS,
  type BodyZone,
  type DiscomfortTrend,
  type Effort,
} from '@app/features/session/restMessages';

// Focus scene colours (same as SessionViews).
const C = {
  card: '#1F1D1B',
  white: '#FFFFFF',
  meta: '#A8A6A1',
  tertiary: '#8C8A85',
  ember: '#FF5B1F',
  emberText: '#FF8A5C',
  recovery: '#6E8FB3',
  chip: 'rgba(255,255,255,.1)',
};

export type RestMessage =
  | { kind: 'record'; exerciseName: string; weightKg: number | null }
  | { kind: 'discomfortFollowUp'; zone: BodyZone }
  | { kind: 'checkIn'; exerciseName: string }
  | { kind: 'water' }
  | { kind: 'halfway' }
  | { kind: 'lastExercise' };

type Confirmation = { text: string; tone: 'ember' | 'recovery' };

// ELLIE's message in the rest (§28.13): a compact card in place of "Siguiente
// ejercicio"; it never covers the countdown. It closes with a tap, a swipe
// down or by itself after 6 s; an answer shows its confirmation for ~1 s.
export function RestMessageCard({
  message,
  onEffort,
  onDiscomfort,
  onTrend,
  onWater,
  onClose,
}: {
  message: RestMessage;
  onEffort: (effort: Effort) => void;
  onDiscomfort: (zone: BodyZone, note: string | null) => void;
  onTrend: (trend: DiscomfortTrend) => void;
  // Returns the confirmation line ("Sumado · 8 de 14").
  onWater: () => string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'main' | 'zones'>('main');
  const [zone, setZone] = useState<BodyZone | null>(null);
  const [note, setNote] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 6 s on its own; while telling a discomfort it waits for the answer; a
  // confirmation closes it after ~1 s.
  useEffect(() => {
    if (step === 'zones' && !confirmation) {
      return undefined;
    }
    const timer = setTimeout(() => closeRef.current(), confirmation ? CONFIRMATION_MS : MESSAGE_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [confirmation, step]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 40) {
          closeRef.current();
        }
      },
    }),
  ).current;

  const noted = () => setConfirmation({ text: 'Anotado. ELLIE lo tendrá en cuenta.', tone: 'ember' });

  let body: React.ReactNode;
  if (confirmation) {
    body = (
      <Reanimated.View entering={FadeIn.duration(200)} style={styles.row}>
        <View style={[styles.checkDot, { backgroundColor: confirmation.tone === 'ember' ? C.ember : C.recovery }]}>
          <Check size={16} color={confirmation.tone === 'ember' ? '#111111' : '#FFFFFF'} strokeWidth={2.8} />
        </View>
        <TextV2 variant="voice" color={C.white} style={styles.flex}>
          {confirmation.text}
        </TextV2>
      </Reanimated.View>
    );
  } else if (step === 'zones') {
    body = (
      <>
        <Head title="¿Dónde lo notas?" />
        <View style={styles.chips}>
          {ZONE_OPTIONS.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              selected={zone === option.value}
              onPress={() => setZone(option.value)}
            />
          ))}
        </View>
        {zone ? (
          <View style={styles.noteRow}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Añade una nota (opcional)"
              placeholderTextColor={C.tertiary}
              maxLength={NOTE_MAX}
              returnKeyType="done"
              style={styles.note}
            />
            <PressableScale
              accessibilityRole="button"
              onPress={() => {
                onDiscomfort(zone, note.trim() || null);
                noted();
              }}
              style={styles.send}
            >
              <TextV2 variant="bodyStrong" color="#111111">
                Guardar
              </TextV2>
            </PressableScale>
          </View>
        ) : null}
      </>
    );
  } else {
    switch (message.kind) {
      case 'checkIn':
        body = (
          <>
            <Head title={`¿Cómo vas con ${lowerFirst(message.exerciseName)}?`} />
            <View style={styles.chips}>
              {EFFORT_OPTIONS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    onEffort(option.value);
                    noted();
                  }}
                />
              ))}
            </View>
            <PressableScale accessibilityRole="button" onPress={() => setStep('zones')} style={styles.link}>
              <TextV2 variant="body" color={C.meta}>
                Algo me molesta
              </TextV2>
              <ChevronRight size={15} color={C.meta} strokeWidth={2} />
            </PressableScale>
          </>
        );
        break;
      case 'discomfortFollowUp':
        body = (
          <>
            <Head title={followUpQuestion(message.zone)} />
            <View style={styles.chips}>
              {TREND_OPTIONS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  grow
                  onPress={() => {
                    onTrend(option.value);
                    noted();
                  }}
                />
              ))}
            </View>
          </>
        );
        break;
      case 'water':
        body = (
          <View style={styles.row}>
            <View style={styles.drop}>
              <Droplet size={20} color={C.recovery} strokeWidth={2} />
            </View>
            <TextV2 variant="voice" color={C.white} style={styles.flex}>
              Buen momento para beber agua
            </TextV2>
            <PressableScale
              accessibilityRole="button"
              onPress={() => setConfirmation({ text: onWater(), tone: 'recovery' })}
              style={styles.water}
            >
              <TextV2 variant="bodyStrong" color="#111111">
                +1 vaso
              </TextV2>
            </PressableScale>
          </View>
        );
        break;
      case 'record':
        body = (
          <View style={styles.row}>
            <RecordIcon />
            <View style={styles.flexGap}>
              <TextV2 variant="captionStrong" color={C.emberText} style={styles.eyebrow}>
                NUEVO RÉCORD
              </TextV2>
              <TextV2 variant="voice" color={C.white} style={styles.strong}>
                {message.weightKg !== null
                  ? `${message.exerciseName} ${formatWeight(message.weightKg)} kg`
                  : message.exerciseName}
              </TextV2>
            </View>
          </View>
        );
        break;
      default:
        body = (
          <View style={styles.row}>
            <View style={styles.emberDot} />
            <TextV2 variant="voice" color={C.white} style={[styles.flex, styles.strong]}>
              {message.kind === 'halfway' ? 'Mitad hecha. Sigue así.' : 'Último ejercicio. Ciérralo fuerte.'}
            </TextV2>
          </View>
        );
    }
  }

  return (
    <Reanimated.View
      entering={SlideInDown.duration(340)}
      exiting={SlideOutDown.duration(220)}
      accessibilityLiveRegion="polite"
      {...pan.panHandlers}
    >
      <Pressable accessibilityLabel="Cerrar mensaje" onPress={onClose} style={styles.card}>
        <View style={styles.grabber} />
        {body}
      </Pressable>
    </Reanimated.View>
  );
}

function Head({ title }: { title: string }) {
  return (
    <View style={styles.head}>
      <AuraMark size={30} tone="dark" />
      <TextV2 variant="section" color={C.white} style={[styles.flex, styles.strong]}>
        {title}
      </TextV2>
    </View>
  );
}

function Chip({
  label,
  selected = false,
  grow = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  grow?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, grow && styles.flex, selected && styles.chipOn]}
    >
      <TextV2 variant="bodyL" color={selected ? '#111111' : C.white} style={styles.strong}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

// Trophy with an Ember wave around it.
function RecordIcon() {
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withRepeat(withTiming(1, { duration: 1600 }), -1);
  }, [wave]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - wave.value),
    transform: [{ scale: 1 + wave.value * 0.6 }],
  }));
  return (
    <View style={styles.trophy}>
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.trophyWave, ring]} />
      <Trophy size={22} color="#FFFFFF" strokeWidth={2} />
    </View>
  );
}

function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function formatWeight(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: C.card,
    boxShadow: '0 0 0 .5px rgba(255,255,255,.06)',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,.18)',
    marginBottom: 4,
  },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 2 },
  strong: { fontWeight: '600' },
  eyebrow: { fontWeight: '700', letterSpacing: 0.96 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: C.white },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,.07)',
    color: C.white,
    fontSize: 15,
  },
  send: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  drop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(110,143,179,.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  water: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emberDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ember, marginLeft: 4 },
  trophy: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyWave: { borderRadius: 24, borderWidth: 2, borderColor: C.ember },
});
