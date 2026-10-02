import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight, Bell, Check, Play } from 'lucide-react-native';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import {
  Button,
  Eyebrow,
  IconButton,
  Scrim,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type { HomeMode } from '@app/features/home/homePriority';
import { HERO_PHOTO } from '@app/features/home/v2/homePhotos';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { ProfileIdentity } from '@app/types/profileIdentity';

export const HERO_HEIGHT = 500;

export type HeroWorkout = {
  title: string;
  typeLabel: string;
  minutes: number;
  exercises: number;
  calories: number;
};

export type HomeHeroData = {
  // Core 33 (mode core33 / workoutDone)
  core: {
    day: number;
    habits: Array<{ name: string; done: boolean }>;
    left: number;
  } | null;
  // Hero routine for `workout` (recommended #1) and `new` (shortest beginner).
  workout: HeroWorkout | null;
  // Saved session for `resume`.
  resume: {
    title: string;
    done: number;
    total: number;
    minutes: number;
  } | null;
  // Finished session for `workoutDone`.
  done: { minutes: number; typeLabel: string } | null;
  allDoneLine: string;
};

export type HomeHeroProps = {
  mode: HomeMode | null; // null while the first load is in progress
  error: boolean;
  onRetry: () => void;
  greeting: string;
  dateLine: string;
  identity: ProfileIdentity;
  hasNotifications: boolean;
  data: HomeHeroData;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenCore33: () => void;
  onStartWorkout: () => void;
  onResume: () => void;
  onOpenProgress: () => void;
};

// Inicio hero (Home.dc.html): 500 pt photographic scene with the 6 modes.
export function HomeHero(props: HomeHeroProps) {
  const insets = useSafeAreaInsets();
  const photo = HERO_PHOTO[props.mode ?? 'workout'];

  return (
    <SceneScope>
      <HeroFrame>
        {props.mode ? (
          <Image
            source={photo.source}
            resizeMode="cover"
            style={styles.photo}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <WarmHalo />
        <Scrim variant="hero" style={StyleSheet.absoluteFill} />
        <HeroTop {...props} top={insets.top + 8} />
        <View style={styles.bottom}>
          <HeroContent {...props} />
        </View>
      </HeroFrame>
    </SceneScope>
  );
}

function HeroFrame({ children }: { children: ReactNode }) {
  const { scene } = useThemeV2();

  return (
    <View style={[styles.frame, { backgroundColor: scene.plate }]}>
      {children}
    </View>
  );
}

// radial-gradient(70% 55% at 78% 18%, rgba(255,150,90,.14), transparent 70%)
function WarmHalo() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient
          id="homeHeroHalo"
          cx="78%"
          cy="18%"
          rx="70%"
          ry="55%"
          fx="78%"
          fy="18%"
        >
          <Stop offset="0" stopColor="rgb(255,150,90)" stopOpacity={0.14} />
          <Stop offset="0.7" stopColor="rgb(20,19,18)" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeHeroHalo)" />
    </Svg>
  );
}

function HeroTop({
  top,
  greeting,
  dateLine,
  identity,
  hasNotifications,
  onOpenProfile,
  onOpenNotifications,
}: HomeHeroProps & { top: number }) {
  const { colors } = useThemeV2();

  return (
    <View style={[styles.top, { top }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        hitSlop={4}
        onPress={onOpenProfile}
        style={[styles.avatar, { borderColor: colors.border.onDarkStrong }]}
      >
        <ProfileAvatar
          avatarKey={identity.avatarKey}
          profilePhotoUrl={identity.profilePhotoUrl}
          size={44}
        />
      </Pressable>
      <View style={styles.greeting}>
        <TextV2 variant="bodyStrong" numberOfLines={1}>
          {greeting}
        </TextV2>
        <TextV2 variant="caption" tone="tertiary" numberOfLines={1}>
          {dateLine}
        </TextV2>
      </View>
      <IconButton
        icon={Bell}
        variant="glass"
        badge={hasNotifications}
        accessibilityLabel={
          hasNotifications
            ? 'Notificaciones, tienes avisos pendientes'
            : 'Notificaciones'
        }
        onPress={onOpenNotifications}
      />
    </View>
  );
}

function HeroContent(props: HomeHeroProps) {
  const { mode, error, onRetry, data } = props;

  if (error) {
    return (
      <View style={styles.content}>
        <Eyebrow tone="tertiary">Inicio</Eyebrow>
        <TextV2 variant="title22">No pudimos cargar tu día.</TextV2>
        <Button
          label="Reintentar"
          variant="onScene"
          size="md"
          onPress={onRetry}
        />
      </View>
    );
  }

  if (!mode) {
    return (
      <SkeletonGroup>
        <View style={styles.content}>
          <Skeleton width={120} height={12} />
          <Skeleton width="70%" height={28} />
          <Skeleton width="50%" height={20} />
          <Skeleton height={52} radius={26} />
        </View>
      </SkeletonGroup>
    );
  }

  switch (mode) {
    case 'core33':
      return <CoreContent {...props} core={data.core} />;
    case 'workout':
      return <WorkoutContent {...props} workout={data.workout} />;
    case 'resume':
      return <ResumeContent {...props} resume={data.resume} />;
    case 'workoutDone':
      return <DoneContent {...props} done={data.done} />;
    case 'new':
      return <NewContent {...props} workout={data.workout} />;
    case 'allDone':
      return <AllDoneContent {...props} line={data.allDoneLine} />;
  }
}

function BigNumber({
  value,
  suffix,
  size,
}: {
  value: string | number;
  suffix: string;
  size: number;
}) {
  return (
    <View style={styles.bigRow}>
      <TextV2
        variant="displayM"
        style={{ fontSize: size, lineHeight: size * 0.86 }}
      >
        {String(value)}
      </TextV2>
      <TextV2 variant="section" tone="tertiary" style={styles.bigSuffix}>
        {suffix}
      </TextV2>
    </View>
  );
}

function Segments({ fills }: { fills: number[] }) {
  const { colors, scene } = useThemeV2();

  return (
    <View style={styles.segments}>
      {fills.map((fill, index) => (
        <View
          key={index}
          style={[styles.segment, { backgroundColor: scene.glass.onPhoto }]}
        >
          <View
            style={[
              styles.segmentFill,
              {
                width: `${Math.round(Math.min(1, fill) * 100)}%`,
                backgroundColor: colors.ember.base,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function CoreContent({
  core,
  onOpenCore33,
}: HomeHeroProps & { core: HomeHeroData['core'] }) {
  const { scene } = useThemeV2();
  const day = core?.day ?? 0;
  const left = core?.left ?? 0;

  return (
    <View style={styles.content}>
      <Eyebrow tone="tertiary">
        {day >= 33 ? 'Core 33 · Último día' : `Core 33 · Día ${day}`}
      </Eyebrow>
      <BigNumber value={day} suffix="/ 33" size={92} />
      <View style={styles.habits}>
        {(core?.habits ?? []).map((habit, index) => (
          <View key={index} style={styles.habit}>
            <Segments fills={[habit.done ? 1 : 0]} />
            <TextV2
              variant="caption"
              numberOfLines={1}
              color={habit.done ? scene.onDark.primary : scene.onDark.body}
            >
              {habit.done ? `✓ ${habit.name}` : habit.name}
            </TextV2>
          </View>
        ))}
      </View>
      <View style={styles.rowBetween}>
        <TextV2 variant="body" tone="secondary" style={styles.flex}>
          {left === 0
            ? 'Día cerrado'
            : `${left} ${left === 1 ? 'hábito' : 'hábitos'} para terminar`}
        </TextV2>
        <Button
          label="Cerrar el día"
          variant="onScene"
          size="md"
          icon={ArrowRight}
          iconPosition="end"
          onPress={onOpenCore33}
        />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <TextV2 variant="displayS" style={styles.statValue}>
        {String(value)}
      </TextV2>
      <TextV2 variant="meta" tone="tertiary">
        {label}
      </TextV2>
    </View>
  );
}

function WorkoutContent({
  workout,
  onStartWorkout,
}: HomeHeroProps & { workout: HeroWorkout | null }) {
  return (
    <View style={styles.content}>
      <Eyebrow tone="tertiary">
        {workout ? `Hoy · ${workout.typeLabel}` : 'Hoy'}
      </Eyebrow>
      <TextV2 variant="title22" numberOfLines={2} style={styles.tight}>
        {workout?.title ?? 'Elige tu entreno de hoy'}
      </TextV2>
      {workout ? (
        <View style={styles.stats}>
          <Stat value={workout.minutes} label="minutos" />
          <Stat value={workout.exercises} label="ejercicios" />
          <Stat value={workout.calories} label="kcal" />
        </View>
      ) : null}
      <Button
        label="Empezar"
        variant="onScene"
        icon={Play}
        iconPosition="end"
        fullWidth
        onPress={onStartWorkout}
      />
    </View>
  );
}

function ResumeContent({
  resume,
  onResume,
}: HomeHeroProps & { resume: HomeHeroData['resume'] }) {
  const total = Math.max(resume?.total ?? 0, 1);
  const done = Math.min(resume?.done ?? 0, total);

  return (
    <View style={styles.content}>
      <Eyebrow tone="tertiary" numberOfLines={1}>
        {resume ? `Sesión guardada · ${resume.title}` : 'Sesión guardada'}
      </Eyebrow>
      <BigNumber value={done} suffix={`/ ${total} ejercicios`} size={80} />
      <Segments
        fills={Array.from({ length: total }, (_, index) =>
          index < done ? 1 : 0,
        )}
      />
      <Button
        label={`Retomar · ${resume?.minutes ?? 0} min`}
        variant="onScene"
        icon={Play}
        iconPosition="end"
        fullWidth
        onPress={onResume}
      />
    </View>
  );
}

function CheckDisc({ size }: { size: number }) {
  const { colors } = useThemeV2();

  return (
    <View
      style={[
        styles.check,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.ember.base,
        },
        size > 50 && styles.checkHalo,
      ]}
    >
      <Check size={size / 2} color={colors.ember.onText} strokeWidth={2.4} />
    </View>
  );
}

function DoneContent({
  done,
  data,
  onOpenCore33,
}: HomeHeroProps & { done: HomeHeroData['done'] }) {
  return (
    <View style={styles.content}>
      <CheckDisc size={64} />
      <View style={styles.doneTexts}>
        <Eyebrow tone="tertiary">Entreno hecho</Eyebrow>
        <View style={styles.baseline}>
          <TextV2 variant="displayM" style={styles.doneValue}>
            {String(done?.minutes ?? 0)}
          </TextV2>
          <TextV2 variant="bodyL" tone="tertiary">
            {`min de ${done?.typeLabel ?? 'entreno'}`}
          </TextV2>
        </View>
      </View>
      {data.core ? (
        <Button
          label="Siguiente: cerrar Core 33"
          variant="secondary"
          size="md"
          icon={ArrowRight}
          iconPosition="end"
          fullWidth
          onPress={onOpenCore33}
        />
      ) : null}
    </View>
  );
}

function NewContent({
  workout,
  onStartWorkout,
}: HomeHeroProps & { workout: HeroWorkout | null }) {
  return (
    <View style={styles.content}>
      <Eyebrow tone="tertiary">Tu primera sesión</Eyebrow>
      <TextV2 variant="title22" numberOfLines={2} style={styles.tight}>
        {workout?.title ?? 'Elige tu primera rutina'}
      </TextV2>
      {workout ? (
        <View style={styles.baseline}>
          <TextV2 variant="displayM" style={styles.doneValue}>
            {String(workout.minutes)}
          </TextV2>
          <TextV2 variant="bodyL" tone="tertiary">
            {`min · ${workout.typeLabel.toLowerCase()}`}
          </TextV2>
        </View>
      ) : null}
      <Button
        label="Empezar"
        variant="onScene"
        icon={Play}
        iconPosition="end"
        fullWidth
        onPress={onStartWorkout}
      />
    </View>
  );
}

function AllDoneContent({
  line,
  onOpenProgress,
}: HomeHeroProps & { line: string }) {
  return (
    <View style={styles.content}>
      <View style={styles.checks}>
        <CheckDisc size={44} />
        <CheckDisc size={44} />
        <CheckDisc size={44} />
      </View>
      <View style={styles.doneTexts}>
        <Eyebrow tone="tertiary">Día completo</Eyebrow>
        <TextV2 variant="title22">{line}</TextV2>
      </View>
      <Button
        label="Ver tu semana"
        variant="secondary"
        size="md"
        icon={ArrowRight}
        iconPosition="end"
        fullWidth
        onPress={onOpenProgress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  // width/height 100% inside an absolute box (Fabric crops absoluteFill).
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  top: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  greeting: {
    flex: 1,
    minWidth: 0,
  },
  bottom: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 58,
  },
  content: {
    gap: 18,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: -10,
  },
  bigSuffix: {
    paddingBottom: 6,
  },
  habits: {
    flexDirection: 'row',
    gap: 6,
  },
  habit: {
    flex: 1,
    gap: 8,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  tight: {
    marginTop: -10,
  },
  stats: {
    flexDirection: 'row',
    gap: 28,
  },
  statValue: {
    fontSize: 34,
    lineHeight: 34,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkHalo: {
    boxShadow: '0 0 0 10px rgba(255,91,31,.14)',
  },
  checks: {
    flexDirection: 'row',
    gap: 8,
  },
  doneTexts: {
    gap: 4,
  },
  baseline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  doneValue: {
    fontSize: 56,
    lineHeight: 52,
  },
});
