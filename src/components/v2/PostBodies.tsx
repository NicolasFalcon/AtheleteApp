import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Award, Bookmark, Check, Dumbbell, Trophy } from 'lucide-react-native';
import { CoverImage } from '@app/components/v2/CoverImage';
import { HexMedal } from '@app/components/v2/HexMedal';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import {
  recordDeltaLine,
  topPrLine,
  workoutStats,
} from '@app/features/social/postModel';
import type {
  AchievementAttachment,
  ChallengeAttachment,
  RecordAttachment,
  RoutineAttachment,
  RouteAttachment,
  WorkoutAttachment,
} from '@app/features/social/postTypes';
import { ROUTE_SAMPLE_MAPS } from '@app/features/social/routeSampleMaps';
import { usePostPhotoSource } from '@app/features/social/useSocial';

// The compositions of a post, one per type (v2.12 §22.5): photo, record,
// route and achievement reach the screen edges; workouts without a photo and
// routines carry no card. Every figure comes from the attachment snapshot the
// server wrote; the app never computes or edits them.

const RECORD_IMAGE = require('@app/assets/v2/photos/esfuerzo.jpg');
const RECORD_ASPECT = 1200 / 800;
const PLATE = '#0E0D0C';

// Breaks out of the screen's side padding (full bleed).
function useBleed() {
  const { layout } = useThemeV2();
  return { marginHorizontal: -layout.gutter };
}

function StatsGrid({
  stats,
  onDark,
  large,
}: {
  stats: { value: string; label: string }[];
  onDark?: boolean;
  large?: boolean;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.stats}>
      {stats.map(stat => (
        <View key={stat.label} style={styles.stat}>
          <TextV2
            style={[styles.statValue, large ? styles.statValueLarge : null]}
            color={onDark ? '#FFFFFF' : colors.text.primary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {stat.value}
          </TextV2>
          <TextV2 variant="caption" color={onDark ? '#C9C6C0' : colors.text.secondary}>
            {stat.label}
          </TextV2>
        </View>
      ))}
    </View>
  );
}

function CheckDot({ size = 22 }: { size?: number }) {
  const { colors } = useThemeV2();

  return (
    <View
      style={[
        styles.checkDot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ember.base },
      ]}
    >
      <Check size={size * 0.6} strokeWidth={3} color="#FFFFFF" />
    </View>
  );
}

// "NUEVO RÉCORD" / "NUEVA MEJOR MARCA": small Ember tag.
function Tag({ label }: { label: string }) {
  const { colors } = useThemeV2();

  return (
    <View style={[styles.tag, { backgroundColor: colors.ember.base }]}>
      <TextV2 style={styles.tagText}>{label}</TextV2>
    </View>
  );
}

// Workout with a photo: full-bleed photo of 480 pt, "● COMPLETADO", the
// title at 34/800 and the three figures. The photo reserves its height (the
// card is a fixed 480 pt) and is signed on demand.
export function WorkoutPhotoBody({
  attachment,
  photoPath,
  width,
  height,
  onPress,
}: {
  attachment: WorkoutAttachment;
  photoPath: string;
  width?: number | null;
  height?: number | null;
  onPress?: () => void;
}) {
  const { colors } = useThemeV2();
  const bleed = useBleed();
  const source = usePostPhotoSource(photoPath);
  const aspect = width && height ? width / height : 0.8;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Entrenamiento ${attachment.title}`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.photoCard, bleed]}
    >
      <CoverImage source={source} aspect={aspect} x={0.5} y={0.3} />
      <View style={[StyleSheet.absoluteFill, styles.photoDim]} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.92)']}
        locations={[0.38, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.photoContent}>
        <View style={styles.photoTitleGroup}>
          <View style={styles.doneRow}>
            <View style={[styles.doneDot, { backgroundColor: colors.ember.base }]} />
            <TextV2 style={styles.doneLabel}>COMPLETADO</TextV2>
          </View>
          <TextV2 style={styles.photoTitle} numberOfLines={2}>
            {attachment.title}
          </TextV2>
        </View>
        <StatsGrid stats={workoutStats(attachment)} onDark large />
      </View>
    </PressableScale>
  );
}

// Workout without a photo: typographic, no card. Check + title at 30/800, a
// 2 pt rule and the trio. Old posts without `volume_kg`, `prs_count` or
// `top_pr` still draw (the volume reads "—" and there is no record line).
export function WorkoutLightBody({
  attachment,
  onPress,
}: {
  attachment: WorkoutAttachment;
  onPress?: () => void;
}) {
  const { colors } = useThemeV2();
  const topPr = topPrLine(attachment);
  const prs = attachment.prs_count ?? 0;
  const recordLine = topPr ?? (prs > 0 ? `${prs} ${prs === 1 ? 'récord' : 'récords'} en la sesión` : null);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Entrenamiento ${attachment.title}`}
      disabled={!onPress}
      onPress={onPress}
      style={styles.lightBody}
    >
      <View style={styles.lightTitleRow}>
        <CheckDot size={26} />
        <TextV2 style={styles.lightTitle} numberOfLines={2}>
          {attachment.title}
        </TextV2>
      </View>
      <View style={[styles.rule, { borderTopColor: colors.text.primary }]}>
        <StatsGrid stats={workoutStats(attachment)} />
      </View>
      {recordLine ? (
        <View style={styles.recordLine}>
          <Tag label="NUEVO RÉCORD" />
          <TextV2 variant="bodyStrong" style={styles.flex} numberOfLines={2}>
            {recordLine}
          </TextV2>
        </View>
      ) : null}
    </PressableScale>
  );
}

// Record: full-bleed dark plate of 340 pt. "NUEVO RÉCORD", the figure at
// 104/800, the exercise and the delta; the photo fades in from the right.
export function RecordBody({
  attachment,
  onPress,
}: {
  attachment: RecordAttachment;
  onPress?: () => void;
}) {
  const bleed = useBleed();
  const delta = recordDeltaLine(attachment);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Nuevo récord. ${attachment.exercise_name}, ${attachment.value} ${attachment.unit}`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.recordCard, bleed]}
    >
      <CoverImage
        source={RECORD_IMAGE}
        aspect={RECORD_ASPECT}
        x={0.5}
        y={0.3}
        style={styles.recordPhoto}
      />
      <View style={[StyleSheet.absoluteFill, styles.recordDim]} />
      <LinearGradient
        pointerEvents="none"
        colors={[PLATE, PLATE, 'rgba(14,13,12,0)']}
        locations={[0, 0.3, 0.69]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="recordGlow" cx="0%" cy="100%" r="62%">
            <Stop offset="0" stopColor="#FF5B1F" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FF5B1F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="0%" cy="100%" r="80%" fill="url(#recordGlow)" />
      </Svg>
      <View style={styles.recordContent}>
        <View style={styles.recordPill}>
          <TextV2 style={styles.recordPillText}>NUEVO RÉCORD</TextV2>
        </View>
        <View style={styles.recordBottom}>
          <View style={styles.recordFigure}>
            <TextV2
              style={styles.bigValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {String(attachment.value)}
            </TextV2>
            <TextV2 style={styles.bigUnit}>{attachment.unit}</TextV2>
          </View>
          <TextV2 style={styles.recordTitle}>{attachment.exercise_name}</TextV2>
          {delta ? <TextV2 style={styles.recordDelta}>{delta}</TextV2> : null}
        </View>
      </View>
    </PressableScale>
  );
}

// Routine: four 3:4 thumbnails, the title at 30/800, the meta and two
// buttons (Guardar rutina · Ver rutina). No card.
export function RoutineBody({
  attachment,
  saved,
  saving,
  onOpen,
  onSave,
}: {
  attachment: RoutineAttachment;
  saved: boolean;
  saving?: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const count = attachment.exercises.length;
  const shown = attachment.exercises.slice(0, 4);
  const meta = [
    attachment.difficulty,
    `${attachment.duration_min} min`,
    count > 0 ? `${count} ejercicios` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const ink = colors.cta.primary;

  return (
    <View style={styles.routine}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Rutina compartida ${attachment.title}`}
        onPress={onOpen}
        style={styles.routineTop}
      >
        {shown.length > 0 ? (
          <View style={styles.thumbs}>
            {shown.map((exercise, index) => {
              const more = index === 3 && count > 4 ? count - 3 : 0;
              return (
                <View
                  key={exercise.exercise_id}
                  style={[styles.thumb, { backgroundColor: colors.surface.muted }]}
                >
                  {/* TODO(social-wire): anatomy thumbnail by exercise_id. */}
                  <Dumbbell size={22} strokeWidth={1.6} color={colors.text.tertiary} />
                  {more > 0 ? (
                    <View style={styles.thumbMore}>
                      <TextV2 variant="cta" color="#FFFFFF">{`+${more}`}</TextV2>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
        <View style={styles.routineTexts}>
          <TextV2 style={styles.routineTitle} numberOfLines={2}>
            {attachment.title}
          </TextV2>
          <TextV2 variant="body" color={colors.text.secondary}>
            {meta}
          </TextV2>
        </View>
      </PressableScale>
      <View style={styles.routineActions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Rutina guardada' : 'Guardar rutina'}
          disabled={saved || saving}
          onPress={onSave}
          style={[
            styles.routineButton,
            saved
              ? { backgroundColor: colors.surface.raised, boxShadow: `inset 0 0 0 1px ${colors.divider}` }
              : { backgroundColor: ink },
          ]}
        >
          {saved ? (
            <Check size={14} strokeWidth={2.4} color={colors.text.primary} />
          ) : (
            <Bookmark size={14} strokeWidth={2} color={colors.cta.primaryText} />
          )}
          <TextV2 variant="metaStrong" color={saved ? colors.text.primary : colors.cta.primaryText}>
            {saved ? 'Guardada' : 'Guardar rutina'}
          </TextV2>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Ver rutina"
          onPress={onOpen}
          style={[
            styles.routineButton,
            { boxShadow: `inset 0 0 0 1px ${mode === 'dark' ? colors.divider : colors.divider}` },
          ]}
        >
          <TextV2 variant="metaStrong">Ver rutina</TextV2>
        </PressableScale>
      </View>
    </View>
  );
}

// Medal band shared by achievements and finished challenges: full width with
// an Ember glow on the left, the 96 pt medal, an Ember eyebrow and the title
// at 30/800.
function MedalBand({
  eyebrow,
  title,
  meta,
  icon,
  label,
  onPress,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  icon: typeof Award;
  label: string;
  onPress?: () => void;
}) {
  const { colors } = useThemeV2();
  const bleed = useBleed();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.band, bleed, { backgroundColor: colors.surface.raised }]}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bandGlow" cx="70" cy="50%" r="190" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FF5B1F" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#FF5B1F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bandGlow)" />
      </Svg>
      <HexMedal icon={icon} size={96} />
      <View style={styles.flex}>
        <TextV2 style={[styles.bandEyebrow, { color: colors.ember.base }]}>{eyebrow}</TextV2>
        <TextV2 style={styles.bandTitle} numberOfLines={3}>
          {title}
        </TextV2>
        {meta ? (
          <TextV2 variant="body" color={colors.text.secondary}>
            {meta}
          </TextV2>
        ) : null}
      </View>
    </PressableScale>
  );
}

// Achievement: medal + what was achieved.
export function AchievementBody({
  attachment,
  onPress,
}: {
  attachment: AchievementAttachment;
  onPress?: () => void;
}) {
  const meta =
    attachment.kind === 'core33' && attachment.days_completed
      ? `${attachment.days_completed} de 33 días · sin fallar uno`
      : '';

  return (
    <MedalBand
      eyebrow={attachment.kind === 'core33' ? 'RETO COMPLETADO' : 'LOGRO'}
      title={attachment.title}
      meta={meta}
      icon={Award}
      label={`Logro. ${attachment.title}`}
      onPress={onPress}
    />
  );
}

// Challenge: the same band with the final figure and the position among
// friends.
export function ChallengeBody({
  attachment,
  onPress,
}: {
  attachment: ChallengeAttachment;
  onPress?: () => void;
}) {
  const position =
    attachment.rank_among_friends === 1
      ? 'Primero de tus amigos'
      : attachment.rank_among_friends
      ? `Puesto ${attachment.rank_among_friends} entre amigos`
      : 'Reto completado';

  return (
    <MedalBand
      eyebrow="RETO COMPLETADO"
      title={attachment.title}
      meta={`${attachment.final_value} / ${attachment.goal} · ${position}`}
      icon={Trophy}
      label={`Reto. ${attachment.title}`}
      onPress={onPress}
    />
  );
}

// Photo-only post: edge to edge, at its own proportion, reserving its height
// from `photo_width` / `photo_height`.
export function PhotoBody({
  photoPath,
  width,
  height,
}: {
  photoPath: string;
  width: number | null;
  height: number | null;
}) {
  const { scene } = useThemeV2();
  const bleed = useBleed();
  const source = usePostPhotoSource(photoPath);
  const ratio = width && height ? Math.min(1.25, Math.max(0.6, width / height)) : 0.8;

  return (
    <View style={[styles.photoOnly, bleed, { aspectRatio: ratio, backgroundColor: scene.plate }]}>
      {source ? (
        <CoverImage source={source} aspect={width && height ? width / height : 0.8} />
      ) : null}
    </View>
  );
}

// Route post (SOCIAL_16): the map with the route cut out as the protagonist
// fading into the page, the distance at 72/800 over it and one line of
// figures. The planned route is only a note. TODO(ruta): fixtures only until
// the backend has the `route` type (Fase 5).
export function RouteBody({
  attachment,
  onPress,
}: {
  attachment: RouteAttachment;
  onPress?: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const bleed = useBleed();
  const sample = ROUTE_SAMPLE_MAPS[attachment.sport === 'cycling' ? 'bike' : 'run'];
  const layer = mode === 'dark' ? sample.dark : sample.light;
  const crop = sample.crop;
  const hours = Math.floor(attachment.duration_sec / 3600);
  const minutes = Math.floor((attachment.duration_sec % 3600) / 60);
  const seconds = attachment.duration_sec % 60;
  const time =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;
  const line = [
    time,
    attachment.pace_label,
    attachment.elevation_m !== null ? `+${attachment.elevation_m} m` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Ruta de ${attachment.distance_km} kilómetros`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.route, bleed]}
    >
      <View style={{ height: sample.height }}>
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <Rect x={-300} y={-300} width={1000} height={1500} fill={layer.bg} />
          {layer.blocks.map((d, i) => (
            <Path key={`b${i}`} d={d} fill={mode === 'dark' ? '#1B1E1A' : '#DCDED3'} />
          ))}
          {layer.strokes.map((s, i) => (
            <Path
              key={`s${i}`}
              d={s.d}
              stroke={s.stroke}
              strokeWidth={s.width}
              strokeLinecap={s.round ? 'round' : undefined}
              fill="none"
            />
          ))}
          <Path
            d={sample.route.d}
            stroke={colors.ember.base}
            strokeOpacity={0.2}
            strokeWidth={sample.route.glowWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={sample.route.d}
            stroke={colors.ember.base}
            strokeWidth={sample.route.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle
            cx={sample.route.start.x}
            cy={sample.route.start.y}
            r={5.5}
            fill={colors.bg}
            stroke={colors.ember.base}
            strokeWidth={2.5}
          />
          <Circle
            cx={sample.route.end.x}
            cy={sample.route.end.y}
            r={6.5}
            fill={colors.ember.base}
            stroke={colors.bg}
            strokeWidth={2.5}
          />
        </Svg>
        <LinearGradient
          pointerEvents="none"
          colors={[`${colors.bg}00`, `${colors.bg}00`, colors.bg]}
          locations={[0, 0.52, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.routeTexts}>
        <View style={styles.routeFigure}>
          <TextV2 style={styles.routeBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {String(attachment.distance_km).replace('.', ',')}
          </TextV2>
          <TextV2 style={[styles.routeUnit, { color: colors.text.secondary }]}>km</TextV2>
        </View>
        <TextV2 variant="bodyStrong" style={styles.routeLine}>
          {line}
        </TextV2>
        {attachment.planned_name ? (
          <View style={styles.planRow}>
            <View style={styles.planDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.planDot, { backgroundColor: colors.text.secondary }]} />
              ))}
            </View>
            <TextV2 variant="caption" color={colors.text.secondary}>
              {`Ruta planificada · ${attachment.planned_name}`}
            </TextV2>
          </View>
        ) : null}
        {attachment.new_best ? (
          <View style={styles.recordLine}>
            <Tag label="NUEVA MEJOR MARCA" />
            <TextV2 variant="bodyStrong" style={styles.flex}>
              {attachment.new_best}
            </TextV2>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7, lineHeight: 32 },
  statValueLarge: { fontSize: 24, letterSpacing: -0.5, lineHeight: 28 },
  checkDot: { alignItems: 'center', justifyContent: 'center' },
  tag: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: '#FFFFFF' },
  // Workout with photo
  photoCard: { height: 480, overflow: 'hidden', backgroundColor: '#141312' },
  photoDim: { backgroundColor: 'rgba(20,19,18,.22)' },
  photoContent: { position: 'absolute', left: 20, right: 20, bottom: 22, gap: 16 },
  photoTitleGroup: { gap: 6 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneDot: { width: 6, height: 6, borderRadius: 3 },
  doneLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: '#FFFFFF' },
  photoTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 36, color: '#FFFFFF' },
  // Workout without photo
  lightBody: { paddingTop: 4, gap: 16 },
  lightTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lightTitle: { flex: 1, fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 33 },
  rule: { borderTopWidth: 2, paddingTop: 14 },
  recordLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Record
  recordCard: { height: 340, overflow: 'hidden', backgroundColor: PLATE },
  recordPhoto: { left: '30%' },
  recordDim: { backgroundColor: 'rgba(14,13,12,.34)' },
  recordContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 22,
    bottom: 24,
    justifyContent: 'space-between',
  },
  recordPill: {
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#FF5B1F',
    justifyContent: 'center',
  },
  recordPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: '#FFFFFF' },
  recordBottom: { gap: 8 },
  recordFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bigValue: {
    fontSize: 104,
    fontWeight: '800',
    letterSpacing: -6.2,
    lineHeight: 92,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  bigUnit: { fontSize: 26, fontWeight: '600', color: '#C9C6C0' },
  recordTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.33, color: '#FFFFFF' },
  recordDelta: { fontSize: 14, fontWeight: '600', color: '#FF8A5C' },
  // Routine
  routine: { gap: 14 },
  routineTop: { gap: 14 },
  thumbs: { flexDirection: 'row', gap: 6 },
  thumb: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMore: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,19,18,.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineTexts: { gap: 4 },
  routineTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 32 },
  routineActions: { flexDirection: 'row', gap: 8 },
  routineButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Medal band
  band: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    overflow: 'hidden',
  },
  bandEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 6 },
  bandTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 31, marginBottom: 6 },
  // Photo only
  photoOnly: { overflow: 'hidden' },
  // Route
  route: { overflow: 'hidden' },
  routeTexts: { marginTop: -64, paddingHorizontal: 20, gap: 8 },
  routeFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  routeBig: { fontSize: 72, fontWeight: '800', letterSpacing: -4, lineHeight: 66, flexShrink: 1 },
  routeUnit: { fontSize: 22, fontWeight: '600' },
  routeLine: { fontSize: 15 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planDots: { flexDirection: 'row', gap: 2 },
  planDot: { width: 3, height: 3, borderRadius: 2 },
});
