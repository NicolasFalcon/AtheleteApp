import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { devHomeSlide } from '@app/dev/homeModeOverride';
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
import {
  slidesKey,
  type HomeMode,
  type HomeSlide,
  type HomeSlideKind,
} from '@app/features/home/homePriority';
import { HERO_PHOTO } from '@app/features/home/v2/homePhotos';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { ProfileIdentity } from '@app/types/profileIdentity';
import { tightLine } from '@app/theme/v2';

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
  // Pending session for `resume` (saved, or in progress / paused).
  resume: {
    title: string;
    done: number;
    total: number;
    minutes: number; // active minutes so far (pauses excluded)
    inProgress?: boolean;
  } | null;
  // Finished session for `workoutDone`.
  done: { minutes: number; typeLabel: string } | null;
  allDoneLine: string;
};

export type HomeHeroProps = {
  // Ordered slides of the day (resolveHomeSlides); null while the first load
  // is in progress.
  slides: HomeSlide[] | null;
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

// Photo of each slide (the six designs keep their own photo).
const SLIDE_PHOTO: Record<HomeSlideKind, HomeMode> = {
  resume: 'resume',
  workout: 'workout',
  core33: 'core33',
  core33Closed: 'core33',
  workoutDone: 'workoutDone',
  allDone: 'allDone',
  new: 'new',
};

// Slide content sits 58 pt from the bottom; with several slides it rises to
// 100 pt to leave room for the indicator.
const CONTENT_BOTTOM_ONE = 58;
const CONTENT_BOTTOM_MANY = 100;
// Nudge shown once per app session: 56 pt and back.
const PEEK_PT = 56;
let peekShown = false;

// Inicio hero (Home.dc.html, v2.12): 500 pt photographic scene. With one
// slide it is the hero as always; with several it becomes a full-bleed
// carousel (one slide per state, snap, no autoplay) with a named indicator.
// Greeting, date, profile and bell stay fixed above it.
export function HomeHero(props: HomeHeroProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const touched = useRef(false);
  const [index, setIndex] = useState(0);

  const slides = props.error ? null : props.slides;
  const multi = Boolean(slides && slides.length > 1);
  const key = slides ? slidesKey(slides) : '';

  // When the set of slides changes (something was completed) the first slide
  // is the next pending action again.
  useEffect(() => {
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [key]);

  // Development only: open on a slide (`-homeSlide N`), for captures.
  useEffect(() => {
    const target = devHomeSlide();
    if (multi && target > 0) {
      peekShown = true; // no nudge while a capture asks for a slide
      const id = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: target * width, animated: false });
        setIndex(target);
      }, 600);
      return () => clearTimeout(id);
    }
  }, [multi, width]);

  // A single small nudge per app session, never with reduced motion.
  useEffect(() => {
    if (!multi || peekShown || reduceMotion) {
      return;
    }
    const out = setTimeout(() => {
      peekShown = true;
      scrollRef.current?.scrollTo({ x: PEEK_PT, animated: true });
    }, 700);
    const back = setTimeout(() => {
      if (!touched.current) {
        scrollRef.current?.scrollTo({ x: 0, animated: true });
      }
    }, 1300);
    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [multi, reduceMotion]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0) {
      setIndex(next);
    }
  };

  const goTo = (target: number) => {
    touched.current = true;
    setIndex(target);
    scrollRef.current?.scrollTo({ x: target * width, animated: true });
  };

  const pages: (HomeSlide | null)[] = slides && slides.length > 0 ? slides : [null];

  return (
    <SceneScope>
      <HeroFrame>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          snapToInterval={width}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEnabled={multi}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={() => {
            touched.current = true;
          }}
          style={StyleSheet.absoluteFill}
        >
          {pages.map((slide, position) => (
            <View key={slide?.kind ?? 'state'} style={{ width, height: HERO_HEIGHT }}>
              {slide ? (
                <Image
                  source={HERO_PHOTO[SLIDE_PHOTO[slide.kind]].source}
                  resizeMode="cover"
                  style={styles.photo}
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <WarmHalo id={`homeHeroHalo${position}`} />
              <Scrim variant="hero" style={StyleSheet.absoluteFill} />
              <View
                style={[
                  styles.bottom,
                  { bottom: multi ? CONTENT_BOTTOM_MANY : CONTENT_BOTTOM_ONE },
                ]}
              >
                <HeroContent {...props} slide={slide} />
              </View>
            </View>
          ))}
        </ScrollView>
        <HeroTop {...props} top={insets.top + 8} />
        {multi && slides ? (
          <HeroPager slides={slides} index={index} onSelect={goTo} />
        ) : null}
      </HeroFrame>
    </SceneScope>
  );
}

// Named capsules, one per slide: the active one white with dark text, the
// rest glass; the ones closed today carry an Ember dot. "1 / N" on the right.
function HeroPager({
  slides,
  index,
  onSelect,
}: {
  slides: HomeSlide[];
  index: number;
  onSelect: (index: number) => void;
}) {
  const { colors, scene } = useThemeV2();

  return (
    <View style={styles.pager} pointerEvents="box-none">
      {slides.map((slide, position) => {
        const active = position === index;
        return (
          <Pressable
            key={slide.kind}
            accessibilityRole="button"
            accessibilityLabel={`${slide.label}${slide.closed ? ', completado' : ''}, ${
              position + 1
            } de ${slides.length}`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(position)}
            style={styles.capsuleHit}
          >
            <View
              style={[
                styles.capsule,
                {
                  backgroundColor: active ? scene.cta.onScene : scene.glass.onPhoto,
                },
              ]}
            >
              {slide.closed ? (
                <View style={[styles.capsuleDot, { backgroundColor: colors.ember.base }]} />
              ) : null}
              <TextV2
                variant="metaStrong"
                color={active ? scene.cta.onSceneText : scene.onDark.primary}
              >
                {slide.label}
              </TextV2>
            </View>
          </Pressable>
        );
      })}
      <TextV2 variant="meta" color={scene.onDark.tertiary} style={styles.position}>
        {`${index + 1} / ${slides.length}`}
      </TextV2>
    </View>
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
function WarmHalo({ id }: { id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient
          id={id}
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
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
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

function HeroContent(props: HomeHeroProps & { slide: HomeSlide | null }) {
  const { slide, error, onRetry, data } = props;

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

  if (!slide) {
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

  switch (slide.kind) {
    case 'core33':
    case 'core33Closed':
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
        style={{ fontSize: size, ...tightLine(size, 0.86) }}
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
          label={left === 0 ? 'Ver reto' : 'Cerrar el día'}
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
        {`${resume?.inProgress ? 'Sesión en curso' : 'Sesión guardada'}${
          resume ? ` · ${resume.title}` : ''
        }`}
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
      {data.core && data.core.left > 0 ? (
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
  },
  pager: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  capsuleHit: {
    height: 44,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  capsule: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capsuleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  position: {
    marginLeft: 'auto',
    paddingRight: 6,
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
    ...tightLine(34, 1),
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
    ...tightLine(56, 0.9),
  },
});
