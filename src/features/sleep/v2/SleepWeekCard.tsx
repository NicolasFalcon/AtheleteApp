import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { PressableScale, TextV2 } from '@app/components/v2';
import { hoursLabel, weekSlots, type SleepOverview } from '@app/features/sleep/sleepModel';

// Progreso · "Sueño · 7 noches" (handoff v2.15 §25.2 entry, Progress.dc.html):
// average, consistency and the 7 bars, "Recuperación N" when estimated, and
// "Ver sueño y recuperación". Night material in both themes. Only with Apple
// Health, as in the design.
const C = {
  card: '#0E1217',
  white: '#FFFFFF',
  secondary: '#7E8C9C',
  recovery: '#6E8FB3',
  recoveryLight: '#9DB5CF',
};

export function SleepWeekCard({ overview, onOpen }: { overview: SleepOverview; onOpen: () => void }) {
  const slots = weekSlots(overview);
  const last = slots[slots.length - 1]?.date;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Ver sueño y recuperación" onPress={onOpen} style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="sleepWeek" cx="100%" cy="0%" rx="80%" ry="70%">
            <Stop offset="0" stopColor={C.recovery} stopOpacity={0.34} />
            <Stop offset="0.62" stopColor={C.recovery} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sleepWeek)" />
      </Svg>
      <View style={styles.head}>
        <View style={styles.eyebrow}>
          <View style={styles.dot} />
          <TextV2 variant="eyebrow" color={C.recoveryLight}>
            Sueño · 7 noches
          </TextV2>
        </View>
        {overview.recovery ? (
          <TextV2 variant="caption" color={C.secondary}>
            {`Recuperación ${overview.recovery.score}`}
          </TextV2>
        ) : null}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <TextV2 color={C.white} style={styles.value}>
            {hoursLabel(overview.avg7Min)}
          </TextV2>
          <TextV2 variant="caption" color={C.secondary}>
            Promedio
          </TextV2>
        </View>
        <View style={styles.stat}>
          <TextV2 color={C.white} style={styles.value}>
            {overview.consistencyMin === null ? '—' : `± ${Math.round(overview.consistencyMin)}`}
          </TextV2>
          <TextV2 variant="caption" color={C.secondary}>
            Consistencia (min)
          </TextV2>
        </View>
      </View>
      <View style={styles.gap6}>
        <View style={styles.bars}>
          {slots.map(slot => {
            const minutes = slot.night?.durationMin ?? 0;
            const on = slot.date === last;
            return (
              <View
                key={slot.date}
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(slot.night ? 6 : 0, Math.min(1, minutes / 540) * 100)}%`,
                    backgroundColor: on ? C.recovery : minutes < 420 ? 'rgba(110,143,179,.16)' : 'rgba(110,143,179,.3)',
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.days}>
          {slots.map(slot => (
            <TextV2
              key={slot.date}
              variant="captionStrong"
              align="center"
              color={slot.date === last ? C.white : C.secondary}
              style={styles.day}
            >
              {slot.letter}
            </TextV2>
          ))}
        </View>
      </View>
      <View style={styles.link}>
        <TextV2 variant="bodyStrong" color={C.recoveryLight} style={styles.linkText}>
          Ver sueño y recuperación
        </TextV2>
        <ArrowRight size={16} color={C.recoveryLight} strokeWidth={2} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', padding: 20, borderRadius: 24, backgroundColor: C.card, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.recovery },
  stats: { flexDirection: 'row', gap: 28 },
  stat: { gap: 2 },
  value: { fontSize: 40, lineHeight: 40, fontWeight: '800', letterSpacing: -2 },
  gap6: { gap: 6 },
  bars: { height: 72, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bar: { flex: 1, borderRadius: 7 },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, fontSize: 11 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontSize: 15, textDecorationLine: 'underline' },
});
