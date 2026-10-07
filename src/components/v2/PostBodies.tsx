import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Award,
  Check,
  ChevronRight,
  Dumbbell,
  Trophy,
} from 'lucide-react-native';
import { HexMedal } from '@app/components/v2/HexMedal';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { recordDeltaLine, workoutStats } from '@app/features/social/postModel';
import type {
  AchievementAttachment,
  ChallengeAttachment,
  RecordAttachment,
  RoutineAttachment,
  WorkoutAttachment,
} from '@app/features/social/postTypes';
import { usePostPhotoSource } from '@app/features/social/useSocial';

// The compositions of a post, one per type (handoff §5 "Social Post"): they
// are not one generic card. Every figure comes from the attachment snapshot
// the server wrote; the app never computes or edits them.

const RECORD_IMAGE = require('@app/assets/v2/photos/esfuerzo.jpg');

function StatsGrid({
  stats,
  onDark,
}: {
  stats: { value: string; label: string }[];
  onDark?: boolean;
}) {
  const { scene, colors } = useThemeV2();

  return (
    <View style={styles.stats}>
      {stats.map(stat => (
        <View key={stat.label} style={styles.stat}>
          <TextV2 variant="section" color={onDark ? scene.onDark.primary : undefined}>
            {stat.value}
          </TextV2>
          <TextV2
            variant="caption"
            color={onDark ? scene.onDark.meta : colors.text.secondary}
          >
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
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.ember.base,
        },
      ]}
    >
      <Check size={size * 0.6} strokeWidth={3} color={colors.ember.onText} />
    </View>
  );
}

function NewRecordTag({ large = false }: { large?: boolean }) {
  const { colors } = useThemeV2();

  return (
    <View
      style={[
        styles.tag,
        large ? styles.tagLarge : null,
        { backgroundColor: colors.ember.base },
      ]}
    >
      <TextV2 variant="eyebrow" color={colors.ember.onText}>
        Nuevo récord
      </TextV2>
    </View>
  );
}

// Workout with a photo: dark card, photo, title and three figures.
export function WorkoutPhotoBody({
  attachment,
  photoPath,
  onPress,
}: {
  attachment: WorkoutAttachment;
  photoPath: string;
  onPress?: () => void;
}) {
  const { scene } = useThemeV2();
  const source = usePostPhotoSource(photoPath);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Entrenamiento ${attachment.title}`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.photoCard, { backgroundColor: scene.plate }]}
    >
      {source ? (
        <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : null}
      <LinearGradient
        colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.88)']}
        locations={[0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.photoContent}>
        <View style={styles.titleRow}>
          <CheckDot />
          <TextV2 variant="section" color={scene.onDark.primary} numberOfLines={2} style={styles.flex}>
            {attachment.title}
          </TextV2>
        </View>
        <View style={[styles.statsDivider, { borderTopColor: 'rgba(255,255,255,.18)' }]}>
          <StatsGrid stats={workoutStats(attachment)} onDark />
        </View>
      </View>
    </PressableScale>
  );
}

// Workout without a photo: white card with the figures and, if there was one,
// the record of the session.
export function WorkoutLightBody({
  attachment,
  onPress,
}: {
  attachment: WorkoutAttachment;
  onPress?: () => void;
}) {
  const { colors, shadow } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Entrenamiento ${attachment.title}`}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.lightCard,
        { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
      ]}
    >
      <View style={styles.titleRow}>
        <CheckDot />
        <TextV2 variant="cta" numberOfLines={2} style={styles.flex}>
          {attachment.title}
        </TextV2>
      </View>
      <StatsGrid stats={workoutStats(attachment)} />
      {attachment.record ? (
        <View style={[styles.recordLine, { borderTopColor: colors.divider }]}>
          <NewRecordTag />
          <TextV2 variant="meta" style={styles.flex}>
            {`${attachment.record.exercise} · ${attachment.record.value} ${attachment.record.unit}`}
          </TextV2>
        </View>
      ) : null}
    </PressableScale>
  );
}

// Record: dark block with the figure over a faded photo.
export function RecordBody({
  attachment,
  onPress,
}: {
  attachment: RecordAttachment;
  onPress?: () => void;
}) {
  const { scene, colors } = useThemeV2();
  const delta = recordDeltaLine(attachment);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Nuevo récord. ${attachment.exercise_name}, ${attachment.value} ${attachment.unit}`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.recordCard, { backgroundColor: scene.plate }]}
    >
      <Image source={RECORD_IMAGE} resizeMode="cover" style={styles.recordImage} />
      <LinearGradient
        colors={[scene.plate, scene.plate, 'rgba(20,19,18,0)']}
        locations={[0, 0.38, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.recordContent}>
        <NewRecordTag large />
        <View style={styles.recordBottom}>
          <View style={styles.recordFigure}>
            <TextV2 style={[styles.bigValue, { color: scene.onDark.primary }]}>
              {String(attachment.value)}
            </TextV2>
            <TextV2 variant="section" color={scene.onDark.meta}>
              {attachment.unit}
            </TextV2>
          </View>
          <TextV2 variant="cta" color={scene.onDark.primary}>
            {attachment.exercise_name}
          </TextV2>
          {delta ? (
            <TextV2 variant="metaStrong" color={colors.ember.textOnDark}>
              {delta}
            </TextV2>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

// Routine: title, meta, movement chips and "Ver rutina" / "Guardar".
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
  const { colors, shadow } = useThemeV2();
  const count = attachment.exercises.length;
  const shown = attachment.exercises.slice(0, 4);
  const meta = [
    attachment.difficulty,
    `${attachment.duration_min} min`,
    count > 0 ? `${count} ejercicios` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.routineCard,
        { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
      ]}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Rutina compartida ${attachment.title}`}
        onPress={onOpen}
        style={styles.routineTop}
      >
        <View style={styles.flex}>
          <TextV2 variant="eyebrow" tone="secondary">
            Rutina compartida
          </TextV2>
          <TextV2 variant="section">{attachment.title}</TextV2>
          <TextV2 variant="meta" tone="secondary">
            {meta}
          </TextV2>
        </View>
        <ChevronRight size={18} strokeWidth={2} color={colors.text.tertiary} />
      </PressableScale>
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
      <View style={styles.routineActions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Ver rutina"
          onPress={onOpen}
          style={[styles.routineButton, { backgroundColor: colors.surface.muted }]}
        >
          <TextV2 variant="metaStrong">Ver rutina</TextV2>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Rutina guardada' : 'Guardar rutina'}
          disabled={saved || saving}
          onPress={onSave}
          style={[
            styles.routineButton,
            { backgroundColor: saved ? colors.surface.muted : colors.cta.primary },
          ]}
        >
          {saved ? <CheckDot size={18} /> : null}
          <TextV2
            variant="metaStrong"
            color={saved ? colors.text.primary : colors.cta.primaryText}
          >
            {saved ? 'Guardada' : 'Guardar'}
          </TextV2>
        </PressableScale>
      </View>
    </View>
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
  const { colors } = useThemeV2();
  const meta =
    attachment.kind === 'core33' && attachment.days_completed
      ? `${attachment.days_completed} de 33 días · sin fallar uno`
      : '';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Logro. ${attachment.title}`}
      disabled={!onPress}
      onPress={onPress}
      style={styles.achievement}
    >
      <HexMedal icon={Award} size={84} />
      <View style={styles.flex}>
        <TextV2 variant="eyebrow" color={colors.ember.deep}>
          {attachment.kind === 'core33' ? 'Reto completado' : 'Logro'}
        </TextV2>
        <TextV2 variant="section">{attachment.title}</TextV2>
        {meta ? (
          <TextV2 variant="meta" tone="secondary">
            {meta}
          </TextV2>
        ) : null}
      </View>
    </PressableScale>
  );
}

// Challenge: the final figure and the position among friends.
export function ChallengeBody({
  attachment,
  onPress,
}: {
  attachment: ChallengeAttachment;
  onPress?: () => void;
}) {
  const { colors, shadow } = useThemeV2();
  const position =
    attachment.rank_among_friends === 1
      ? 'Primero de tus amigos'
      : attachment.rank_among_friends
      ? `Puesto ${attachment.rank_among_friends} entre amigos`
      : 'Reto completado';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Reto. ${attachment.title}`}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.lightCard,
        { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
      ]}
    >
      <View style={styles.titleRow}>
        <Trophy size={20} strokeWidth={1.9} color={colors.text.primary} />
        <TextV2 variant="eyebrow" color={colors.ember.deep}>
          Reto completado
        </TextV2>
      </View>
      <TextV2 variant="section">{attachment.title}</TextV2>
      <View style={styles.challengeFigure}>
        <TextV2 variant="title24">{`${attachment.final_value} / ${attachment.goal}`}</TextV2>
        <TextV2 variant="meta" tone="secondary">
          {position}
        </TextV2>
      </View>
    </PressableScale>
  );
}

// Photo-only post: the photo at its own proportion.
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
  const source = usePostPhotoSource(photoPath);
  const ratio = width && height ? Math.min(1.25, Math.max(0.6, width / height)) : 0.8;

  return (
    <View style={[styles.photoOnly, { aspectRatio: ratio, backgroundColor: scene.plate }]}>
      {source ? (
        <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 1 },
  checkDot: { alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 6,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  tagLarge: { height: 22, paddingHorizontal: 8, borderRadius: 7 },
  photoCard: { height: 400, borderRadius: 28, overflow: 'hidden' },
  photoContent: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 14 },
  statsDivider: { borderTopWidth: 1, paddingTop: 14 },
  lightCard: { borderRadius: 24, paddingVertical: 18, paddingHorizontal: 20, gap: 14 },
  recordLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  recordCard: { height: 250, borderRadius: 28, overflow: 'hidden' },
  // Taller than the card and aligned to the top so the face stays in frame.
  recordImage: { position: 'absolute', right: 0, top: 0, height: '150%', width: '68%' },
  recordContent: {
    position: 'absolute',
    left: 22,
    top: 22,
    bottom: 22,
    right: 22,
    justifyContent: 'space-between',
  },
  recordBottom: { gap: 6 },
  recordFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigValue: { fontSize: 56, fontWeight: '600', letterSpacing: -1.7, lineHeight: 58 },
  routineCard: { borderRadius: 28, overflow: 'hidden' },
  routineTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 18,
    paddingBottom: 14,
  },
  thumbs: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 16 },
  thumb: {
    flex: 1,
    aspectRatio: 1,
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
  routineActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 18 },
  routineButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 4 },
  challengeFigure: { gap: 2 },
  photoOnly: { borderRadius: 24, overflow: 'hidden', width: '100%' },
});
