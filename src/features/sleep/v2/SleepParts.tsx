import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight, ChevronLeft, Heart, Minus, Plus } from 'lucide-react-native';
import { LivingHalo, PressableScale, TextV2 } from '@app/components/v2';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import { DAY_NAMES, weekdayIndex } from '@app/features/week/weekModel';
import {
  QUALITY_WORDS,
  WAKE_FEELINGS,
  clock,
  hoursLabel,
  isLateBedtime,
  minutesFrom22,
  splitMinutes,
  weekSlots,
  type SleepNight,
  type SleepOverview,
  type SleepStage,
  type WakeFeeling,
} from '@app/features/sleep/sleepModel';

// Sueño (handoff v2.15 §25.2): night material, the same in Light and Dark.
export const NIGHT = {
  bg: '#0B0E12',
  surface: '#131820',
  divider: '#1C232D',
  hero: '#0E1520',
  duotone: '#1B3350',
  text: '#F2F0EC',
  white: '#FFFFFF',
  muted: '#C3CCD6',
  secondary: '#7E8C9C',
  tertiary: '#5E6B7A',
  badge: '#D5DCE4',
  recovery: '#6E8FB3',
  recoveryLight: '#9DB5CF',
  rem: '#B7CBE0',
  deep: '#34557C',
  awake: 'rgba(242,240,236,.6)',
  ember: '#FF5B1F',
  emberText: '#FF8A5C',
};

const STAGE_ROWS: { stage: SleepStage; label: string; color: string }[] = [
  { stage: 'awake', label: 'Despierto', color: NIGHT.awake },
  { stage: 'rem', label: 'REM', color: NIGHT.rem },
  { stage: 'core', label: 'Ligero', color: NIGHT.recovery },
  { stage: 'deep', label: 'Profundo', color: NIGHT.deep },
];

// ── Hero ────────────────────────────────────────────────────────────────────
export function SleepHero({
  height,
  topInset,
  badge,
  glow = false,
  onBack,
  children,
}: {
  height: number;
  topInset: number;
  badge: { text: string; heart?: boolean } | null;
  glow?: boolean;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <View style={[styles.hero, { height }]}>
      <Image source={HOME_PHOTOS.mobility} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.heroPhoto]} />
      <View style={[StyleSheet.absoluteFill, styles.duotone]} />
      {glow ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="heroGlow" cx="85%" cy="10%" rx="80%" ry="50%">
              <Stop offset="0" stopColor={NIGHT.recovery} stopOpacity={0.35} />
              <Stop offset="0.7" stopColor={NIGHT.recovery} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroGlow)" />
        </Svg>
      ) : null}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11,14,18,.55)', 'rgba(11,14,18,0)', 'rgba(11,14,18,.45)', 'rgba(11,14,18,.96)', NIGHT.bg]}
        locations={[0, 0.24, 0.5, 0.86, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroTop, { top: topInset + 14 }]}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Atrás" onPress={onBack} style={styles.glassRound}>
          <ChevronLeft size={22} color={NIGHT.white} strokeWidth={2} />
        </PressableScale>
        {badge ? (
          <View style={styles.badge}>
            {badge.heart ? <Heart size={12} color={NIGHT.badge} strokeWidth={2} /> : null}
            <TextV2 variant="caption" color={NIGHT.badge} style={styles.badgeText}>
              {badge.text}
            </TextV2>
          </View>
        ) : null}
      </View>
      <View style={styles.heroBottom}>{children}</View>
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return (
    <View style={styles.eyebrowRow}>
      <View style={styles.eyebrowDot} />
      <TextV2 variant="eyebrow" color={NIGHT.recoveryLight}>
        {children}
      </TextV2>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <TextV2 color={NIGHT.text} style={styles.sectionTitle}>
        {children.toUpperCase()}
      </TextV2>
      {right}
    </View>
  );
}

// Recovery: score, "/ 100", the "estimación" tag and the Baja · Media · Alta
// scale with a white marker at the score.
export function RecoveryScale({ score, level }: { score: number; level: 'low' | 'medium' | 'high' }) {
  return (
    <View style={styles.scale}>
      <View style={styles.scaleBar}>
        <View style={[styles.scaleSeg, styles.flex4, styles.segLow]} />
        <View style={[styles.scaleSeg, styles.flex3, styles.segMid]} />
        <View style={[styles.scaleSeg, styles.flex3, styles.segHigh]} />
        <View style={[styles.scaleMarker, { left: `${Math.min(100, Math.max(0, score))}%` }]} />
      </View>
      <View style={styles.scaleLabels}>
        {(['low', 'medium', 'high'] as const).map((key, i) => (
          <TextV2
            key={key}
            variant="caption"
            color={level === key ? NIGHT.badge : NIGHT.secondary}
            style={[i === 0 ? styles.flex4 : styles.flex3, level === key ? styles.bold : null]}
          >
            {key === 'low' ? 'Baja' : key === 'medium' ? 'Media' : 'Alta'}
          </TextV2>
        ))}
      </View>
    </View>
  );
}

export function EstimateTag() {
  return (
    <View style={styles.estimate}>
      <TextV2 variant="captionStrong" color={NIGHT.recoveryLight} style={styles.estimateText}>
        ESTIMACIÓN
      </TextV2>
    </View>
  );
}

// "7 h 42 min" at the given size.
export function Duration({ minutes, size }: { minutes: number; size: number }) {
  const { h, m } = splitMinutes(minutes);
  const unit = Math.round(size * 0.31);
  return (
    <View style={styles.duration}>
      <TextV2 color={NIGHT.white} style={[styles.big, { fontSize: size, lineHeight: size * 0.95 }]}>
        {String(h)}
      </TextV2>
      <TextV2 color={NIGHT.secondary} style={[styles.unit, { fontSize: unit }]}>
        h
      </TextV2>
      <TextV2 color={NIGHT.white} style={[styles.big, styles.ml6, { fontSize: size, lineHeight: size * 0.95 }]}>
        {String(m).padStart(2, '0')}
      </TextV2>
      <TextV2 color={NIGHT.secondary} style={[styles.unit, { fontSize: unit }]}>
        min
      </TextV2>
    </View>
  );
}

// ── Anoche · sueño ──────────────────────────────────────────────────────────
export function NightSection({
  label,
  night,
}: {
  label: string;
  night: { durationMin: number; bedtimeAt: string; wakeAt: string; stages: SleepNight['stages'] };
}) {
  const stages = night.stages;
  const start = new Date(night.bedtimeAt).getTime();
  const end = new Date(night.wakeAt).getTime();
  const span = Math.max(1, end - start);
  const mid = new Date(start + span / 2);
  const total = stages ? stages.remMin + stages.coreMin + stages.deepMin + stages.awakeMin : 0;
  const minutesOf: Record<SleepStage, number> = stages
    ? { awake: stages.awakeMin, rem: stages.remMin, core: stages.coreMin, deep: stages.deepMin }
    : { awake: 0, rem: 0, core: 0, deep: 0 };

  return (
    <View style={styles.gap18}>
      <View style={styles.sectionHead}>
        <TextV2 variant="eyebrow" color={NIGHT.secondary}>
          {`${label} · sueño`}
        </TextV2>
        <TextV2 variant="meta" color={NIGHT.secondary}>
          {`${clock(night.bedtimeAt)} → ${clock(night.wakeAt)}`}
        </TextV2>
      </View>
      <Duration minutes={night.durationMin} size={64} />
      {stages && stages.segments.length > 0 ? (
        <>
          <View style={styles.hypno}>
            <View style={styles.hypnoLabels}>
              {STAGE_ROWS.map(row => (
                <TextV2 key={row.stage} variant="caption" color={NIGHT.secondary} style={styles.fs11}>
                  {row.label}
                </TextV2>
              ))}
            </View>
            <Svg viewBox="0 0 280 132" preserveAspectRatio="none" style={styles.hypnoChart}>
              {[12, 48, 84, 120].map(y => (
                <Line key={y} x1={0} y1={y} x2={280} y2={y} stroke={NIGHT.divider} strokeWidth={1} />
              ))}
              {stages.segments.map((segment, i) => {
                const row = STAGE_ROWS.findIndex(item => item.stage === segment.stage);
                const x = ((new Date(segment.start).getTime() - start) / span) * 280;
                const w = ((new Date(segment.end).getTime() - new Date(segment.start).getTime()) / span) * 280;
                return (
                  <Rect
                    key={i}
                    x={Math.max(0, x)}
                    y={row * 36}
                    width={Math.max(1.5, w - 0.6)}
                    height={24}
                    rx={3}
                    fill={STAGE_ROWS[row]?.color ?? NIGHT.recovery}
                  />
                );
              })}
            </Svg>
          </View>
          <View style={styles.axis}>
            <TextV2 variant="caption" color={NIGHT.tertiary} style={styles.fs11}>
              {clock(night.bedtimeAt)}
            </TextV2>
            <TextV2 variant="caption" color={NIGHT.tertiary} style={styles.fs11}>
              {clock(mid.toISOString())}
            </TextV2>
            <TextV2 variant="caption" color={NIGHT.tertiary} style={styles.fs11}>
              {clock(night.wakeAt)}
            </TextV2>
          </View>
          <View style={styles.stageTotals}>
            {(['deep', 'rem', 'core', 'awake'] as const).map(stage => {
              const row = STAGE_ROWS.find(item => item.stage === stage)!;
              return (
                <View key={stage} style={styles.stageTotal}>
                  <View style={[styles.stageBar, { backgroundColor: row.color }]} />
                  <TextV2 variant="caption" color={NIGHT.secondary}>
                    {row.label}
                  </TextV2>
                  <TextV2 color={NIGHT.text} style={styles.stageValue}>
                    {hoursLabel(minutesOf[stage])}
                  </TextV2>
                  <TextV2 variant="caption" color={NIGHT.tertiary}>
                    {`${total ? Math.round((minutesOf[stage] / total) * 100) : 0} %`}
                  </TextV2>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <TextV2 variant="meta" color={NIGHT.secondary}>
          Las fases solo se ven en la última noche con Apple Watch.
        </TextV2>
      )}
    </View>
  );
}

// ── 7 noches ────────────────────────────────────────────────────────────────
const BAR_HEIGHT = 168;
const BAR_MAX_MIN = 540;

export function WeekBars({
  overview,
  selected,
  onSelect,
}: {
  overview: SleepOverview;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const slots = weekSlots(overview);
  const delta = overview.deltaVsPrevWeekMin;
  return (
    <View style={styles.gap16}>
      <SectionTitle
        right={
          <View style={styles.goal}>
            <View style={styles.goalDash} />
            <TextV2 variant="caption" color={NIGHT.secondary}>
              Meta 8 h
            </TextV2>
          </View>
        }
      >
        7 noches
      </SectionTitle>
      <View style={styles.stats}>
        <Stat value={hoursLabel(overview.avg7Min)} label="Promedio" />
        <Stat
          value={overview.consistencyMin === null ? '—' : `± ${Math.round(overview.consistencyMin)}`}
          unit={overview.consistencyMin === null ? undefined : 'min'}
          label="Consistencia"
        />
        <Stat
          value={delta === null ? '—' : `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta))}`}
          unit={delta === null ? undefined : 'min'}
          label="vs semana pasada"
          tone={NIGHT.recoveryLight}
        />
      </View>
      <View style={styles.bars}>
        <View style={[styles.goalLine, { bottom: 26 + BAR_HEIGHT * (480 / BAR_MAX_MIN) }]} />
        {slots.map(slot => {
          const on = slot.date === selected;
          const minutes = slot.night?.durationMin ?? 0;
          const pct = Math.min(1, minutes / BAR_MAX_MIN) * 100;
          const fill = on ? NIGHT.recovery : minutes < 420 ? 'rgba(110,143,179,.16)' : 'rgba(110,143,179,.3)';
          return (
            <PressableScale
              key={slot.date}
              accessibilityRole="button"
              accessibilityLabel={`${slot.letter}: ${slot.night ? hoursLabel(minutes) : 'sin datos'}`}
              disabled={!slot.night}
              onPress={() => onSelect(slot.date)}
              style={styles.barCol}
            >
              <TextV2 variant="captionStrong" align="center" color={on ? NIGHT.white : NIGHT.tertiary}>
                {slot.night ? hoursLabel(minutes).replace(' h ', ':') : ''}
              </TextV2>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(slot.night ? 4 : 0, pct)}%`, backgroundColor: fill },
                  on ? styles.barOn : null,
                ]}
              />
              <TextV2
                variant="caption"
                align="center"
                color={on ? NIGHT.white : NIGHT.secondary}
                style={[styles.barDay, on ? styles.bold : null]}
              >
                {slot.letter}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ value, unit, label, tone = NIGHT.text }: { value: string; unit?: string; label: string; tone?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        <TextV2 color={tone} style={styles.statNumber}>
          {value}
        </TextV2>
        {unit ? (
          <TextV2 variant="body" color={NIGHT.secondary} style={styles.fs15}>
            {unit}
          </TextV2>
        ) : null}
      </View>
      <TextV2 variant="caption" color={NIGHT.secondary}>
        {label}
      </TextV2>
    </View>
  );
}

// ── Horario ─────────────────────────────────────────────────────────────────
const WINDOW_MIN = 11 * 60; // 22:00 → 09:00

export function Schedule({ overview, selected }: { overview: SleepOverview; selected: string | null }) {
  const slots = weekSlots(overview);
  const nights = slots.map(slot => slot.night).filter(Boolean) as NonNullable<(typeof slots)[number]['night']>[];
  if (nights.length === 0) {
    return null;
  }
  const beds = nights.map(night => minutesFrom22(night.bedtimeAt));
  const earliest = nights[beds.indexOf(Math.min(...beds))];
  const latest = nights[beds.indexOf(Math.max(...beds))];
  const late = nights.filter(night => isLateBedtime(night.bedtimeAt)).length;
  const line = `Te acuestas entre ${clock(earliest.bedtimeAt)} y ${clock(latest.bedtimeAt)}.${
    late ? ` ${late === 1 ? 'Una noche' : `${late} noches`} después de medianoche.` : ''
  }`;
  return (
    <View style={styles.gap16}>
      <View style={styles.gap4}>
        <SectionTitle>Horario</SectionTitle>
        <TextV2 variant="body" color={NIGHT.muted} style={styles.fs15}>
          {line}
        </TextV2>
      </View>
      <View style={styles.schedule}>
        <View style={styles.schedHours}>
          {['22:00', '01:00', '04:00', '07:00'].map((label, i) => (
            <TextV2 key={label} variant="caption" color={NIGHT.tertiary} style={[styles.fs11, styles.schedHour, { top: `${i * 27.3}%` }]}>
              {label}
            </TextV2>
          ))}
        </View>
        <View style={styles.schedPlot}>
          {[0, 27.3, 54.5, 81.8].map(top => (
            <View key={top} style={[styles.schedLine, { top: `${top}%` }]} />
          ))}
          <View style={styles.schedCols}>
            {slots.map(slot => {
              const night = slot.night;
              if (!night) {
                return <View key={slot.date} style={styles.schedCol} />;
              }
              const on = slot.date === selected;
              const top = (minutesFrom22(night.bedtimeAt) / WINDOW_MIN) * 100;
              const span = (Math.max(0, new Date(night.wakeAt).getTime() - new Date(night.bedtimeAt).getTime()) / 60000 / WINDOW_MIN) * 100;
              const lateNight = isLateBedtime(night.bedtimeAt);
              return (
                <View key={slot.date} style={styles.schedCol}>
                  <View
                    style={[
                      styles.capsule,
                      { top: `${top}%`, height: `${Math.min(100 - top, span)}%`, backgroundColor: on ? NIGHT.recovery : 'rgba(110,143,179,.3)' },
                    ]}
                  />
                  <View
                    style={[
                      styles.capsuleDot,
                      { top: `${top}%`, backgroundColor: lateNight ? NIGHT.ember : on ? NIGHT.white : NIGHT.recoveryLight },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.schedDays}>
        {slots.map(slot => (
          <TextV2
            key={slot.date}
            variant="caption"
            align="center"
            color={slot.date === selected ? NIGHT.white : NIGHT.secondary}
            style={[styles.flex1, slot.date === selected ? styles.bold : null]}
          >
            {slot.letter}
          </TextV2>
        ))}
      </View>
    </View>
  );
}

// ── Señales del cuerpo ──────────────────────────────────────────────────────
export function Signals({ overview }: { overview: SleepOverview }) {
  const night = overview.lastNight;
  const load = overview.yesterdayLoad;
  return (
    <View style={styles.gap16}>
      <SectionTitle>Señales del cuerpo</SectionTitle>
      <View style={styles.signals}>
        <SignalTile label="FC en reposo" value={night?.restingHr ? String(Math.round(night.restingHr)) : '—'} unit="lpm" note="Anoche" />
        <SignalTile label="VFC" value={night?.hrvMs ? String(Math.round(night.hrvMs)) : '—'} unit="ms" note="Anoche" />
        <SignalTile
          label="Carga de ayer"
          value={load ? (load.level === 'high' ? 'Alta' : load.level === 'medium' ? 'Media' : 'Baja') : '—'}
          note={load ? `${load.minutes} min` : 'Sin entreno'}
          noteColor={load?.level === 'high' ? NIGHT.emberText : NIGHT.recoveryLight}
        />
      </View>
    </View>
  );
}

function SignalTile({
  label,
  value,
  unit,
  note,
  noteColor = NIGHT.recoveryLight,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  noteColor?: string;
}) {
  return (
    <View style={styles.signal}>
      <TextV2 variant="caption" color={NIGHT.secondary}>
        {label}
      </TextV2>
      <View style={styles.statValue}>
        <TextV2 color={NIGHT.text} style={styles.signalValue}>
          {value}
        </TextV2>
        {unit ? (
          <TextV2 variant="caption" color={NIGHT.secondary}>
            {unit}
          </TextV2>
        ) : null}
      </View>
      <TextV2 variant="captionStrong" color={noteColor}>
        {note}
      </TextV2>
    </View>
  );
}

// ── ELLIE band, legal note ──────────────────────────────────────────────────
export function NightEllieBand({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.ellie}>
      <LivingHalo size={36} />
      <TextV2 color={NIGHT.text} style={styles.ellieText}>
        {text}
      </TextV2>
      <ArrowRight size={16} color={NIGHT.white} strokeWidth={2} />
    </PressableScale>
  );
}

export function LegalNote({ children }: { children: string }) {
  return (
    <TextV2 variant="caption" color={NIGHT.tertiary} style={styles.legal}>
      {children}
    </TextV2>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────
export function WhiteButton({
  label,
  heart = false,
  height = 56,
  disabled = false,
  loading = false,
  onPress,
}: {
  label: string;
  heart?: boolean;
  height?: number;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.whiteButton, { height, borderRadius: height / 2 }, disabled ? styles.dimmed : null]}
    >
      {heart ? <Heart size={18} color={NIGHT.bg} strokeWidth={2} /> : null}
      <TextV2 variant="cta" color={NIGHT.bg} style={styles.whiteLabel}>
        {loading ? 'Un momento…' : label}
      </TextV2>
    </PressableScale>
  );
}

export function LinkButton({ label, onPress, color = NIGHT.text }: { label: string; onPress: () => void; color?: string }) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.link}>
      <TextV2 variant="bodyStrong" color={color} style={styles.linkText}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

// ── Manual form (SLEEP_03) ──────────────────────────────────────────────────
export type SleepDraft = { bed: number; wake: number; quality: number | null; feeling: WakeFeeling | null };

export function TimeCard({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.timeCard}>
      <TextV2 variant="caption" color={NIGHT.secondary}>
        {label}
      </TextV2>
      <TextV2 color={NIGHT.text} style={styles.timeValue}>
        {value}
      </TextV2>
      <View style={styles.timeButtons}>
        <PressableScale accessibilityRole="button" accessibilityLabel="15 min antes" onPress={onMinus} style={styles.timeButton}>
          <Minus size={20} color={NIGHT.text} strokeWidth={2.2} />
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel="15 min después" onPress={onPlus} style={styles.timeButton}>
          <Plus size={20} color={NIGHT.text} strokeWidth={2.2} />
        </PressableScale>
      </View>
    </View>
  );
}

export function QualityPicker({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <View style={styles.gap14}>
      <SectionTitle
        right={
          <TextV2 variant="captionStrong" color={NIGHT.recoveryLight} style={styles.fs13}>
            {value ? QUALITY_WORDS[value - 1] : 'Elige de 1 a 5'}
          </TextV2>
        }
      >
        Calidad
      </SectionTitle>
      <View style={styles.qualities}>
        {[1, 2, 3, 4, 5].map(n => {
          const on = value === n;
          return (
            <PressableScale
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={QUALITY_WORDS[n - 1]}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(n)}
              style={[styles.quality, on ? styles.qualityOn : styles.qualityOff]}
            >
              <TextV2 color={on ? NIGHT.white : NIGHT.secondary} style={styles.qualityNumber}>
                {String(n)}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.sectionHead}>
        <TextV2 variant="caption" color={NIGHT.tertiary} style={styles.fs11}>
          Muy mala
        </TextV2>
        <TextV2 variant="caption" color={NIGHT.tertiary} style={styles.fs11}>
          Excelente
        </TextV2>
      </View>
    </View>
  );
}

export function FeelingPicker({ value, onChange }: { value: WakeFeeling | null; onChange: (value: WakeFeeling) => void }) {
  return (
    <View style={styles.gap14}>
      <SectionTitle>Al despertar</SectionTitle>
      <View style={styles.chips}>
        {WAKE_FEELINGS.map(item => {
          const on = value === item.key;
          return (
            <PressableScale
              key={item.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(item.key)}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <TextV2 variant="bodyStrong" color={on ? NIGHT.bg : NIGHT.text} style={styles.fs15}>
                {item.label}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

export function RecordRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.recordRow, last ? styles.recordLast : null]}>
      <TextV2 variant="body" color={NIGHT.secondary} style={styles.fs15}>
        {label}
      </TextV2>
      <TextV2 color={NIGHT.text} style={styles.recordValue}>
        {value}
      </TextV2>
    </View>
  );
}

export function ConnectCard({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={styles.connectCard}>
      <TextV2 color={NIGHT.text} style={styles.connectTitle}>
        DEJA DE REGISTRARLO A MANO.
      </TextV2>
      <TextV2 variant="body" color={NIGHT.muted} style={styles.fs14}>
        Con Apple Health verás duración, fases, FC en reposo y VFC cada mañana, y tu recuperación del día.
      </TextV2>
      <WhiteButton label="Conectar Apple Health" heart height={48} onPress={onConnect} />
    </View>
  );
}

export function InfoTile({ title, headline, text, heart = false }: { title: string; headline: string; text: string; heart?: boolean }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoHead}>
        {heart ? <Heart size={14} color={NIGHT.recoveryLight} strokeWidth={2} /> : null}
        <TextV2 variant="captionStrong" color={NIGHT.recoveryLight} style={styles.fs13}>
          {title}
        </TextV2>
      </View>
      <TextV2 color={NIGHT.text} style={styles.infoHeadline}>
        {headline}
      </TextV2>
      <TextV2 variant="meta" color={NIGHT.secondary}>
        {text}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex3: { flex: 3 },
  flex4: { flex: 4 },
  bold: { fontWeight: '700' },
  dimmed: { opacity: 0.35 },
  ml6: { marginLeft: 6 },
  fs11: { fontSize: 11 },
  fs13: { fontSize: 13 },
  fs14: { fontSize: 14 },
  fs15: { fontSize: 15 },
  gap4: { gap: 4 },
  gap14: { gap: 14 },
  gap16: { gap: 16 },
  gap18: { gap: 18 },
  hero: { overflow: 'hidden', backgroundColor: NIGHT.hero },
  heroPhoto: { opacity: 0.55 },
  duotone: { backgroundColor: NIGHT.duotone, opacity: 0.55 },
  heroTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },
  heroBottom: { position: 'absolute', left: 20, right: 20, bottom: 28, gap: 14 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: NIGHT.recovery },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 24, lineHeight: 26, fontWeight: '800', letterSpacing: -0.72 },
  scale: { gap: 8, paddingTop: 6 },
  scaleBar: { flexDirection: 'row', gap: 4, height: 6 },
  scaleSeg: { borderRadius: 3 },
  segLow: { backgroundColor: 'rgba(255,255,255,.14)' },
  segMid: { backgroundColor: 'rgba(110,143,179,.45)' },
  segHigh: { backgroundColor: NIGHT.recovery },
  scaleMarker: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: NIGHT.white,
    boxShadow: '0 0 0 4px rgba(110,143,179,.35)',
  },
  scaleLabels: { flexDirection: 'row', gap: 4 },
  estimate: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(110,143,179,.18)',
    justifyContent: 'center',
  },
  estimateText: { fontSize: 10, letterSpacing: 0.8 },
  duration: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  big: { fontWeight: '800', letterSpacing: -2.5 },
  unit: { fontWeight: '600', paddingBottom: 6 },
  hypno: { flexDirection: 'row', gap: 10 },
  hypnoLabels: { width: 64, height: 132, justifyContent: 'space-between', paddingVertical: 3 },
  hypnoChart: { flex: 1, height: 132 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 74, marginTop: -10 },
  stageTotals: { flexDirection: 'row', gap: 12, paddingTop: 18, borderTopWidth: 1, borderTopColor: NIGHT.divider },
  stageTotal: { flex: 1, gap: 6 },
  stageBar: { height: 4, borderRadius: 2 },
  stageValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.34 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalDash: { width: 14, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: NIGHT.tertiary },
  stats: { flexDirection: 'row', gap: 28 },
  stat: { gap: 2 },
  statValue: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statNumber: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -1.28 },
  bars: { height: 196, flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingBottom: 26 },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: '#3A4553' },
  barCol: { flex: 1, height: BAR_HEIGHT, justifyContent: 'flex-end', gap: 6 },
  bar: { borderRadius: 10 },
  barOn: { boxShadow: '0 10px 26px rgba(110,143,179,.4)' },
  barDay: { position: 'absolute', left: 0, right: 0, bottom: -24 },
  schedule: { flexDirection: 'row', gap: 8 },
  schedHours: { width: 40, height: 200 },
  schedHour: { position: 'absolute', marginTop: -6 },
  schedPlot: { flex: 1, height: 200 },
  schedLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderTopColor: NIGHT.divider },
  schedCols: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  schedCol: { flex: 1, alignItems: 'center' },
  capsule: { position: 'absolute', width: 14, borderRadius: 7 },
  capsuleDot: { position: 'absolute', width: 6, height: 6, marginTop: -3, borderRadius: 3 },
  schedDays: { flexDirection: 'row', paddingLeft: 48, marginTop: -6 },
  signals: { flexDirection: 'row', gap: 8 },
  signal: {
    flex: 1,
    backgroundColor: NIGHT.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 10,
    boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,.06)',
  },
  signalValue: { fontSize: 28, lineHeight: 30, fontWeight: '800', letterSpacing: -1.12 },
  ellie: {
    marginHorizontal: -20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: NIGHT.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ellieText: { flex: 1, fontSize: 17, lineHeight: 23 },
  legal: { lineHeight: 18 },
  whiteButton: {
    backgroundColor: NIGHT.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  whiteLabel: { fontSize: 16, fontWeight: '700' },
  link: { height: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { textDecorationLine: 'underline', fontSize: 15 },
  timeCard: {
    flex: 1,
    backgroundColor: NIGHT.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,.06)',
  },
  timeValue: { fontSize: 42, lineHeight: 42, fontWeight: '800', letterSpacing: -2.1 },
  timeButtons: { flexDirection: 'row', gap: 6 },
  timeButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualities: { flexDirection: 'row', gap: 6 },
  quality: { flex: 1, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  qualityOn: { backgroundColor: NIGHT.recovery, boxShadow: '0 10px 24px rgba(110,143,179,.4)' },
  qualityOff: { backgroundColor: NIGHT.surface, boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,.06)' },
  qualityNumber: { fontSize: 24, fontWeight: '800', letterSpacing: -0.72 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center' },
  chipOn: { backgroundColor: NIGHT.white },
  chipOff: { backgroundColor: 'rgba(255,255,255,.08)' },
  recordRow: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: NIGHT.divider,
  },
  recordLast: { borderBottomWidth: 1, borderBottomColor: NIGHT.divider },
  recordValue: { fontSize: 17, fontWeight: '700' },
  connectCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: NIGHT.hero,
    gap: 14,
    boxShadow: 'inset 0 0 0 0.5px rgba(110,143,179,.25)',
  },
  connectTitle: { fontSize: 20, lineHeight: 21, fontWeight: '800', letterSpacing: -0.6 },
  infoTile: {
    flex: 1,
    backgroundColor: NIGHT.surface,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
    boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,.06)',
  },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoHeadline: { fontSize: 20, lineHeight: 21, fontWeight: '800', letterSpacing: -0.6 },
});

// "Anoche" for the latest night, else the weekday ("Martes").
export function nightLabel(date: string, lastDate: string | null): string {
  return date === lastDate ? 'Anoche' : DAY_NAMES[weekdayIndex(date)];
}
