import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Check } from 'lucide-react-native';
import {
  PressableScale,
  Scrim,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type {
  Core33Challenge,
  Core33ChallengeId,
} from '@app/features/core33/core33Catalog';

// PLACEHOLDER photos of the handoff package (barra, movilidad, cuerdas).
export const CHALLENGE_PHOTOS: Partial<Record<Core33ChallengeId, ImageSourcePropType>> = {
  fuerza: require('@app/assets/v2/photos/barra-mujer.jpg'),
  movimiento: require('@app/assets/v2/photos/movilidad.jpg'),
  disciplina: require('@app/assets/v2/photos/cuerdas.jpg'),
};

const SIGNATURE_CAPTIONS: Partial<Record<Core33ChallengeId, string>> = {
  recuperacion: 'horas de sueño',
  nutricion: 'comidas · vasos · raciones',
};

// Three bars: how demanding the challenge is.
export function LevelBars({ level }: { level: number }) {
  return (
    <View style={styles.bars} accessibilityLabel={`Nivel ${level} de 3`} accessible>
      {[8, 12, 16].map((height, index) => (
        <View
          key={height}
          style={[
            styles.bar,
            {
              height,
              backgroundColor: index < level ? '#FFFFFF' : 'rgba(255,255,255,.28)',
            },
          ]}
        />
      ))}
    </View>
  );
}

// Photo of a challenge, or its signature figure when it has none.
export function ChallengeArt({ challenge }: { challenge: Core33Challenge }) {
  const photo = CHALLENGE_PHOTOS[challenge.id];
  if (photo) {
    return <Image source={photo} resizeMode="cover" style={StyleSheet.absoluteFill} />;
  }
  const signature = challenge.signature;
  return (
    <View style={[StyleSheet.absoluteFill, styles.signature, { backgroundColor: signature?.background ?? '#141312' }]}>
      <TextV2 variant="title28" color={signature?.color ?? '#FFFFFF'} style={styles.signatureText}>
        {signature?.text}
      </TextV2>
      <TextV2 variant="meta" color="#A8A6A1">
        {SIGNATURE_CAPTIONS[challenge.id]}
      </TextV2>
    </View>
  );
}

// Card of "Explorar retos": the recommended one is large, the others tiles.
export function ChallengeCard({
  challenge,
  large = false,
  recommended = false,
  onPress,
}: {
  challenge: Core33Challenge;
  large?: boolean;
  recommended?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${challenge.name}. ${challenge.intent}`}
      onPress={onPress}
      style={[large ? styles.cardLarge : styles.cardTile, styles.card]}
    >
      <ChallengeArt challenge={challenge} />
      <Scrim variant="bottom" />
      {recommended ? (
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <TextV2 variant="metaStrong" color="#FFFFFF">
            Encaja con tu objetivo
          </TextV2>
        </View>
      ) : null}
      <View style={styles.cardLevel}>
        <LevelBars level={challenge.level} />
      </View>
      <View style={styles.cardText}>
        <TextV2 variant="eyebrow" color={challenge.accent}>
          {challenge.category}
        </TextV2>
        <TextV2
          variant={large ? 'title28' : 'bodyStrong'}
          color="#FFFFFF"
          style={large ? styles.nameLarge : styles.nameTile}
          numberOfLines={2}
        >
          {challenge.name}
        </TextV2>
        {large ? (
          <>
            <TextV2 variant="body" color="#D8D6D1">
              {challenge.intent}
            </TextV2>
            <TextV2 variant="meta" color="#A8A6A1">
              {challenge.habits.map(habit => habit.pillar).join(' · ')}
            </TextV2>
          </>
        ) : null}
      </View>
    </PressableScale>
  );
}

// Dark stat row (Racha actual · Mejor racha · Por cerrar).
export function StatsRow({
  items,
}: {
  items: { value: string; unit?: string; label: string; node?: ReactNode }[];
}) {
  return (
    <View style={styles.stats}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.statWrap}>
          {index > 0 ? <View style={styles.statLine} /> : null}
          <View style={styles.stat}>
            {item.node ?? (
              <View style={styles.statValue}>
                <TextV2 variant="title22" color="#FFFFFF" style={styles.statNumber}>
                  {item.value}
                </TextV2>
                {item.unit ? (
                  <TextV2 variant="meta" color="#A8A6A1">
                    {item.unit}
                  </TextV2>
                ) : null}
              </View>
            )}
            <TextV2 variant="meta" color="#A8A6A1">
              {item.label}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

// A habit of the day: a 72 pt circle that fills with Ember when done, the
// pillar in capitals, the habit and its state.
export function HabitButton({
  pillar,
  text,
  done,
  onPress,
  disabled = false,
}: {
  pillar: string;
  text: string;
  done: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityLabel={`${pillar}: ${text}`}
      accessibilityState={{ checked: done, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.habit}
    >
      <View
        style={[
          styles.habitCircle,
          done
            ? { backgroundColor: '#FF5B1F' }
            : { boxShadow: `inset 0 0 0 2px ${colors.outline.strong}`, opacity: 0.55 },
        ]}
      >
        <Check size={26} color={done ? '#121212' : colors.text.primary} strokeWidth={2.2} />
      </View>
      <TextV2 variant="eyebrow" tone="secondary" align="center">
        {pillar}
      </TextV2>
      <TextV2 variant="bodyStrong" align="center" numberOfLines={3}>
        {text}
      </TextV2>
      <TextV2 variant="meta" align="center" color={done ? colors.ember.deep : colors.text.secondary}>
        {done ? 'Hecho' : 'Pendiente'}
      </TextV2>
    </PressableScale>
  );
}

// A habit as a plain row (Detalle / Listo): circle, habit and pillar.
export function HabitLine({
  pillar,
  text,
  onDark = false,
}: {
  pillar: string;
  text: string;
  onDark?: boolean;
}) {
  const { colors } = useThemeV2();
  const fg = onDark ? '#FFFFFF' : colors.text.primary;
  const sub = onDark ? '#A8A6A1' : colors.text.secondary;
  return (
    <View style={styles.line}>
      <View
        style={[
          styles.lineCircle,
          { boxShadow: `inset 0 0 0 2px ${onDark ? 'rgba(255,255,255,.4)' : colors.outline.strong}` },
        ]}
      />
      <TextV2 variant="body" color={fg} style={styles.lineText}>
        {text}
      </TextV2>
      <TextV2 variant="meta" color={sub}>
        {pillar}
      </TextV2>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <TextV2 variant="eyebrow" tone="secondary">
        {title}
      </TextV2>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 2 },
  signature: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  signatureText: { fontSize: 44, lineHeight: 48, fontWeight: '300', letterSpacing: -1.5 },
  card: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#141312' },
  cardLarge: { height: 400 },
  cardTile: { flex: 1, height: 230, borderRadius: 24 },
  badge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.18)' },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5B1F' },
  cardLevel: { position: 'absolute', top: 16, right: 16 },
  cardText: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 4 },
  nameLarge: { fontSize: 32, lineHeight: 36, fontWeight: '600' },
  nameTile: { fontSize: 17 },
  stats: { flexDirection: 'row' },
  statWrap: { flex: 1, flexDirection: 'row' },
  statLine: { width: 1, backgroundColor: 'rgba(255,255,255,.14)' },
  stat: { flex: 1, gap: 2, paddingLeft: 14 },
  statValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statNumber: { fontWeight: '600' },
  habit: { flex: 1, alignItems: 'center', gap: 4 },
  habitCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  lineCircle: { width: 24, height: 24, borderRadius: 12 },
  lineText: { flex: 1 },
  section: { gap: 10 },
});
