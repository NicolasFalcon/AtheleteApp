import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { TextV2 } from '@app/components/v2';
import {
  SHARE_COPY,
  ZONE_ORDER,
  clockText,
  kmText,
  minFigure,
  stickerDate,
  stickerSize,
  stickerTrio,
  zonesLine,
  type ShareLanguage,
  type StickerData,
  type StickerTone,
  type StickerVariant,
} from '@app/features/share/shareModel';

// Compartir · sticker (handoff v2.16 §26.2–26.5, ShareSticker.dc.html): the
// same in both themes; it depends on the photo and the background chosen.
// Rendered at 1× pt; the export captures it at 3×.
const EMBER = '#FF5B1F';

export const TONES: Record<
  StickerTone,
  { bg: string; fg: string; sec: string; div: string; off: string; prBg: string; prFg: string; shadow: string; textShadow: boolean }
> = {
  light: {
    bg: 'rgba(247,246,243,.96)',
    fg: '#121212',
    sec: '#5E5C58',
    div: 'rgba(18,18,18,.12)',
    off: 'rgba(18,18,18,.12)',
    prBg: 'rgba(255,91,31,.14)',
    prFg: '#B8380A',
    shadow: '0 10px 30px rgba(0,0,0,.18)',
    textShadow: false,
  },
  dark: {
    bg: 'rgba(20,19,18,.94)',
    fg: '#FFFFFF',
    sec: '#A8A6A1',
    div: 'rgba(255,255,255,.14)',
    off: 'rgba(255,255,255,.16)',
    prBg: 'rgba(255,91,31,.2)',
    prFg: '#FF8A5C',
    shadow: '0 10px 30px rgba(0,0,0,.3), inset 0 0 0 0.5px rgba(255,255,255,.08)',
    textShadow: false,
  },
  glass: {
    bg: 'rgba(20,19,18,.42)',
    fg: '#FFFFFF',
    sec: '#ECEAE5',
    div: 'rgba(255,255,255,.28)',
    off: 'rgba(255,255,255,.3)',
    prBg: 'rgba(255,91,31,.9)',
    prFg: '#FFFFFF',
    shadow: 'inset 0 0 0 0.5px rgba(255,255,255,.22)',
    textShadow: true,
  },
};

export function ShareSticker({
  data,
  variant,
  tone,
  language,
}: {
  data: StickerData;
  variant: StickerVariant;
  tone: StickerTone;
  language: ShareLanguage;
}) {
  const t = TONES[tone];
  const size = stickerSize(data, variant);
  const shade = t.textShadow ? styles.textShadow : null;

  if (variant === 'min') {
    const figure = minFigure(data, language);
    return (
      <View style={[styles.plate, size, styles.min, { backgroundColor: t.bg, boxShadow: t.shadow }]}>
        <Isologo size={44} stroke={2.5} fontSize={20} color={t.fg} weight="500" />
        <View style={styles.minFigure}>
          <TextV2 color={t.fg} style={[styles.minValue, shade]}>
            {figure.value}
          </TextV2>
          <TextV2 color={t.sec} style={[styles.minUnit, shade]}>
            {figure.unit}
          </TextV2>
        </View>
        <View style={styles.minDot} />
      </View>
    );
  }

  const copy = SHARE_COPY[language];
  const trio = stickerTrio(data, language);
  return (
    <View style={[styles.plate, size, styles.full, { backgroundColor: t.bg, boxShadow: t.shadow }]}>
      <View style={styles.head}>
        <View style={styles.brand}>
          <Isologo size={26} stroke={2} fontSize={12} color={t.fg} weight="600" />
          <TextV2 color={t.fg} style={[styles.wordmark, shade]}>
            ATHELETE
          </TextV2>
        </View>
        <TextV2 color={t.sec} style={[styles.date, shade]}>
          {stickerDate(data.date, language)}
        </TextV2>
      </View>

      {data.kind === 'workout' ? (
        <>
          <View style={styles.gap4}>
            <Eyebrow text={copy.workoutDone} color={t.sec} shade={shade} />
            <TextV2 color={t.fg} numberOfLines={1} style={[styles.name, shade]}>
              {data.title}
            </TextV2>
          </View>
          <View style={styles.bigRow}>
            <TextV2 color={t.fg} style={[styles.big, shade]}>
              {clockText(data.durationSec)}
            </TextV2>
            <TextV2 color={t.sec} style={[styles.bigLabel, shade]}>
              {copy.time}
            </TextV2>
          </View>
          <Trio items={trio} t={t} shade={shade} />
          {data.record ? (
            <View style={styles.recordRow}>
              <View style={[styles.record, { backgroundColor: t.prBg }]}>
                <Svg width={13} height={13} viewBox="0 0 24 24">
                  <Path d="M7 17 17 7M9 7h8v8" stroke={t.prFg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
                <TextV2 color={t.prFg} numberOfLines={1} style={styles.recordText}>
                  {`${copy.record} · ${data.record.text}`}
                </TextV2>
              </View>
              {data.record.extra > 0 ? (
                <TextV2 color={t.sec} style={[styles.moreRecords, shade]}>
                  {copy.moreRecords(data.record.extra)}
                </TextV2>
              ) : null}
            </View>
          ) : null}
          <View style={styles.gap7}>
            <View style={styles.segments}>
              {ZONE_ORDER.map(zone => (
                <View
                  key={zone}
                  style={[styles.segment, { backgroundColor: data.zones.includes(zone) ? EMBER : t.off }]}
                />
              ))}
            </View>
            <TextV2 color={t.sec} numberOfLines={1} style={[styles.zones, shade]}>
              {zonesLine(data.zones, language) || ' '}
            </TextV2>
          </View>
        </>
      ) : (
        <>
          <Eyebrow text={data.title.toUpperCase()} color={t.sec} shade={shade} />
          <RouteTrace points={data.points} />
          <View style={styles.bigRow}>
            <TextV2 color={t.fg} style={[styles.big, shade]}>
              {kmText(data.distanceM, language)}
            </TextV2>
            <TextV2 color={t.sec} style={[styles.km, shade]}>
              km
            </TextV2>
          </View>
          <Trio items={trio} t={t} shade={shade} />
        </>
      )}
    </View>
  );
}

function Eyebrow({ text, color, shade }: { text: string; color: string; shade: object | null }) {
  return (
    <View style={styles.eyebrow}>
      <View style={styles.eyebrowDot} />
      <TextV2 color={color} numberOfLines={1} style={[styles.eyebrowText, shade]}>
        {text}
      </TextV2>
    </View>
  );
}

function Trio({
  items,
  t,
  shade,
}: {
  items: { value: string; label: string }[];
  t: (typeof TONES)[StickerTone];
  shade: object | null;
}) {
  return (
    <View style={styles.trio}>
      {items.map((item, i) => (
        <View key={item.label} style={styles.trioCell}>
          {i > 0 ? <View style={[styles.trioDivider, { backgroundColor: t.div }]} /> : null}
          <View style={styles.trioTexts}>
            <TextV2 color={t.fg} numberOfLines={1} style={[styles.trioValue, shade]}>
              {item.value}
            </TextV2>
            <TextV2 color={t.sec} numberOfLines={1} style={[styles.trioLabel, shade]}>
              {item.label}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

// Ring with "Λ" (the isologo, 26.2 / 26.4).
export function Isologo({
  size,
  stroke,
  fontSize,
  color,
  weight,
}: {
  size: number;
  stroke: number;
  fontSize: number;
  color: string;
  weight: '500' | '600';
}) {
  return (
    <View style={[styles.iso, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: color }]}>
      <TextV2 color={color} style={{ fontSize, lineHeight: fontSize * 1.1, fontWeight: weight }}>
        Λ
      </TextV2>
    </View>
  );
}

const BOX = { width: 256, height: 150, pad: 8 };

// The GPS line in a 256 × 150 box, no base map: Ember 3.5 pt over a 10 pt
// halo at 22 %, scaled to fit keeping its proportion.
function RouteTrace({ points }: { points: { lat: number; lon: number }[] }) {
  const d = tracePath(points);
  return (
    <Svg width={BOX.width} height={BOX.height} viewBox={`0 0 ${BOX.width} ${BOX.height}`}>
      {d ? (
        <>
          <Path d={d} stroke={EMBER} strokeOpacity={0.22} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d={d} stroke={EMBER} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : null}
    </Svg>
  );
}

export function tracePath(points: { lat: number; lon: number }[]): string | null {
  if (points.length < 2) {
    return null;
  }
  const lat0 = (points.reduce((sum, p) => sum + p.lat, 0) / points.length) * (Math.PI / 180);
  const xy = points.map(p => ({ x: p.lon * Math.cos(lat0), y: -p.lat }));
  const minX = Math.min(...xy.map(p => p.x));
  const maxX = Math.max(...xy.map(p => p.x));
  const minY = Math.min(...xy.map(p => p.y));
  const maxY = Math.max(...xy.map(p => p.y));
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((BOX.width - BOX.pad * 2) / spanX, (BOX.height - BOX.pad * 2) / spanY);
  const offX = (BOX.width - spanX * scale) / 2;
  const offY = (BOX.height - spanY * scale) / 2;
  return xy
    .map((p, i) => `${i ? 'L' : 'M'}${(offX + (p.x - minX) * scale).toFixed(1)} ${(offY + (p.y - minY) * scale).toFixed(1)}`)
    .join(' ');
}

// Fondo de marca (26.6): #141312, an Ember light top left, the isologo ring
// cut at the bottom right and the wordmark. The same in both themes.
export function BrandBackground({ width, height }: { width: number; height: number }) {
  const ring = width * 0.9;
  return (
    <View style={[styles.brandBg, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="brandLight" cx="0%" cy="0%" r="70%">
            <Stop offset="0" stopColor={EMBER} stopOpacity={0.2} />
            <Stop offset="1" stopColor={EMBER} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#brandLight)" />
        <Circle
          cx={width * 0.95}
          cy={height * 0.98}
          r={ring / 2}
          stroke="#FFFFFF"
          strokeOpacity={0.045}
          strokeWidth={width * 0.07}
          fill="none"
        />
      </Svg>
      <TextV2
        color="rgba(255,255,255,.4)"
        style={[styles.brandWordmark, { top: width * 0.06, left: width * 0.06, fontSize: Math.max(8, width * 0.03) }]}
      >
        ATHELETE
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { overflow: 'hidden' },
  full: { borderRadius: 28, paddingTop: 20, paddingHorizontal: 22, paddingBottom: 22, justifyContent: 'space-between' },
  min: { borderRadius: 36, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 14, paddingRight: 24 },
  minFigure: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  minValue: { fontSize: 36, lineHeight: 38, fontWeight: '600', letterSpacing: -1.08, fontVariant: ['tabular-nums'] },
  minUnit: { fontSize: 15, fontWeight: '600' },
  minDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: EMBER, boxShadow: '0 0 0 4px rgba(255,91,31,.2)' },
  textShadow: { textShadowColor: 'rgba(0,0,0,.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { fontSize: 11, fontWeight: '700', letterSpacing: 3.52 },
  date: { fontSize: 11, fontWeight: '600', letterSpacing: 0.88 },
  iso: { alignItems: 'center', justifyContent: 'center' },
  gap4: { gap: 4 },
  gap7: { gap: 7 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: EMBER },
  eyebrowText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.88, flexShrink: 1 },
  name: { fontSize: 24, lineHeight: 28, fontWeight: '600', letterSpacing: -0.24 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  big: { fontSize: 60, lineHeight: 60, fontWeight: '600', letterSpacing: -2.4, fontVariant: ['tabular-nums'] },
  bigLabel: { fontSize: 13, fontWeight: '500' },
  km: { fontSize: 20, fontWeight: '600' },
  trio: { flexDirection: 'row', alignItems: 'center' },
  trioCell: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  trioDivider: { width: 1, height: 30, marginRight: 12 },
  trioTexts: { flex: 1, gap: 2, minWidth: 0, paddingRight: 12 },
  trioValue: { fontSize: 20, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  trioLabel: { fontSize: 11, fontWeight: '500' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  record: {
    flexShrink: 1,
    height: 28,
    paddingLeft: 9,
    paddingRight: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  recordText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  moreRecords: { fontSize: 12, fontWeight: '600' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 5, borderRadius: 3 },
  zones: { fontSize: 12, fontWeight: '500' },
  brandBg: { backgroundColor: '#141312', overflow: 'hidden' },
  brandWordmark: { position: 'absolute', fontWeight: '700', letterSpacing: 3 },
});
