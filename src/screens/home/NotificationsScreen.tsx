import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { useCallback, useMemo, useRef } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { BADGE_ICONS } from '@app/features/gamification/badgeIcons';
import {
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  Droplets,
  Dumbbell,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import {
  BackButton,
  EllieSurface,
  Eyebrow,
  GlassHeader,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { useOpenCore33 } from '@app/features/core33/useOpenCore33';
import { BlockError } from '@app/features/home/v2/BlockError';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import {
  NUTRITION_PLAN_MISSING_ID,
  TODAY_TAG_LABEL,
  buildActivity,
  buildMilestones,
  buildTodayItems,
  photoForDestination,
  type ActivityItem,
  type Milestone,
  type PhotoKey,
  type TodayItem,
} from '@app/features/notifications/notificationsModel';
import type {
  NotificationDestination,
  ProductNotification,
} from '@app/features/notifications/types';
import { useEllieData } from '@app/hooks/useEllieData';
import { useNotificationsOverview } from '@app/hooks/useNotificationsOverview';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps, MainTabParamList } from '@app/types/navigation';

type Props = AppScreenProps<'Notifications'>;

const PHOTOS: Record<PhotoKey, number> = {
  core: HOME_PHOTOS.core,
  total: HOME_PHOTOS.total,
  mobility: HOME_PHOTOS.mobility,
  workout: HOME_PHOTOS.workout,
  overhead: HOME_PHOTOS.overhead,
};

const ACTIVITY_ICONS: Record<ActivityItem['kind'], LucideIcon> = {
  workout: Dumbbell,
  water: Droplets,
  nutrition: UtensilsCrossed,
};

// Notificaciones v2 (Home.dc.html · HOME_08 / HOME_09). Only data the app
// already has: ELLIE nudges, badges, records, sessions, water and nutrition.
export function NotificationsScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const overview = useNotificationsOverview();
  const ellieData = useEllieData();
  const openCore33 = useOpenCore33();

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      ellieData.overviewQuery.refetch().catch(() => {});
      ellieData.personalRecordsQuery.refetch().catch(() => {});
      // refetch functions are stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Notificaciones sits above the tabs: go back down to MainTabs on a tab.
  const openEllieChat = useOpenEllieChat();
  const openTab = (screen: keyof MainTabParamList) => {
    navigation.navigate(ROOT_ROUTES.MainTabs, { screen });
  };

  const openDestination = (destination: NotificationDestination) => {
    switch (destination) {
      case 'workouts':
        openTab(TAB_ROUTES.Workouts);
        return;
      case 'challenge':
        openCore33();
        return;
      case 'hydration':
        openTab(TAB_ROUTES.Home);
        return;
      case 'nutrition':
        navigation.navigate(APP_ROUTES.NutritionPlan);
        return;
      case 'ellie':
        openEllieChat();
        return;
      case 'progress':
        openTab(TAB_ROUTES.Progress);
        return;
      case 'quiz':
        navigation.navigate(APP_ROUTES.QuizLanding);
        return;
      default:
        navigation.navigate(APP_ROUTES.PersonalRecords);
    }
  };

  const handleNotificationPress = (notification: ProductNotification) => {
    if (notification.sourceAction === 'log_nutrition') {
      navigation.navigate(APP_ROUTES.NutritionPlan, { openLog: true });
      return;
    }

    openDestination(notification.destination);
  };

  const data = ellieData.overviewQuery.data;
  const todayItems = useMemo(
    () => buildTodayItems(overview.notifications, data?.challengeDay ?? 0),
    [data?.challengeDay, overview.notifications],
  );
  const needsPlan = overview.notifications.some(
    item => item.id === NUTRITION_PLAN_MISSING_ID,
  );

  const exerciseNames = useMemo(() => {
    const map: Record<string, string> = {};
    (ellieData.exercisesQuery.data || []).forEach(exercise => {
      map[exercise.id] = exercise.name;
    });
    return map;
  }, [ellieData.exercisesQuery.data]);

  const now = new Date();
  const milestones = data
    ? buildMilestones({
        badges: data.badges,
        records: ellieData.personalRecordsQuery.records,
        exerciseNames,
        now,
      })
    : [];
  const activity = data
    ? buildActivity({
        sessions: data.workoutSessions,
        todayWaterMl: data.hydration.todayMl,
        todayCalories: data.todayNutritionLog?.calories ?? 0,
        now,
      })
    : [];

  const back = () => safeGoBack(navigation, [tabFallback(TAB_ROUTES.Home)]);
  const loading = overview.isLoading;
  const failed = Boolean(overview.error);
  const retry = () => {
    ellieData.overviewQuery.refetch().catch(() => {});
    ellieData.personalRecordsQuery.refetch().catch(() => {});
    ellieData.exercisesQuery.refetch().catch(() => {});
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Notificaciones"
        left={<BackButton onPress={back} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.gutter,
            paddingBottom: insets.bottom + 48,
          },
        ]}
      >
        {failed ? (
          <BlockError
            message="No pudimos cargar tus notificaciones."
            onRetry={retry}
          />
        ) : loading ? (
          <SkeletonGroup>
            <View style={styles.section}>
              <Skeleton width={110} height={12} />
              <Skeleton height={168} radius={24} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </View>
          </SkeletonGroup>
        ) : todayItems.length > 0 ? (
          <TodaySection items={todayItems} onPress={handleNotificationPress} />
        ) : (
          <AllClear />
        )}

        <EllieSurface
          message={
            ellieData.heroInsight?.text ??
            'ELLIE está lista para ayudarte con tu progreso de hoy.'
          }
          action={{
            label: 'Hablar con ELLIE',
            onPress: () => openEllieChat(),
          }}
          orbSize={40}
          style={{ marginHorizontal: -layout.gutter }}
        />

        {!loading && !failed && milestones.length > 0 ? (
          <Milestones
            items={milestones}
            onPress={item =>
              item.destination === 'records'
                ? navigation.navigate(APP_ROUTES.PersonalRecords)
                : navigation.navigate(APP_ROUTES.Achievements)
            }
          />
        ) : null}

        {!loading && !failed && activity.length > 0 ? (
          <Activity items={activity} />
        ) : null}

        {!loading && !failed && needsPlan ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Activa tu plan nutricional"
            onPress={() => openEllieChat(ELLIE_ASKS.nutritionPlan)}
            style={[
              styles.config,
              {
                borderTopColor: colors.divider,
                borderBottomColor: colors.divider,
              },
            ]}
          >
            <UtensilsCrossed
              size={18}
              color={colors.text.secondary}
              strokeWidth={2}
            />
            <View style={styles.flex}>
              <TextV2 variant="bodyStrong">Activa tu plan nutricional</TextV2>
              <TextV2 variant="meta" tone="secondary">
                Configuración pendiente · Con ELLIE
              </TextV2>
            </View>
            <ChevronRight
              size={16}
              color={colors.text.tertiary}
              strokeWidth={2}
            />
          </PressableScale>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TodaySection({
  items,
  onPress,
}: {
  items: TodayItem[];
  onPress: (notification: ProductNotification) => void;
}) {
  const { colors, radius } = useThemeV2();
  const [featured, ...rest] = items;

  return (
    <View style={styles.section}>
      <Eyebrow>{`Para hoy · ${items.length}`}</Eyebrow>
      <FeaturedCard item={featured} onPress={onPress} />
      {rest.map(item => (
        <PressableScale
          key={item.notification.id}
          accessibilityRole="button"
          accessibilityLabel={item.notification.title}
          onPress={() => onPress(item.notification)}
          style={[styles.row, { borderBottomColor: colors.divider }]}
        >
          <View
            style={[
              styles.thumb,
              {
                borderRadius: radius.inputCompact,
                backgroundColor: colors.divider,
              },
            ]}
          >
            <Image
              source={
                PHOTOS[photoForDestination(item.notification.destination)]
              }
              resizeMode="cover"
              style={styles.fill}
            />
          </View>
          <View style={styles.flex}>
            <TextV2 variant="bodyStrong" numberOfLines={1}>
              {item.notification.title}
            </TextV2>
            <TextV2 variant="meta" tone="secondary" numberOfLines={2}>
              {item.notification.summary}
            </TextV2>
          </View>
          <ChevronRight
            size={16}
            color={colors.text.tertiary}
            strokeWidth={2}
          />
        </PressableScale>
      ))}
    </View>
  );
}

function FeaturedCard({
  item,
  onPress,
}: {
  item: TodayItem;
  onPress: (notification: ProductNotification) => void;
}) {
  return (
    <SceneScope>
      <FeaturedContent item={item} onPress={onPress} />
    </SceneScope>
  );
}

function FeaturedContent({
  item,
  onPress,
}: {
  item: TodayItem;
  onPress: (notification: ProductNotification) => void;
}) {
  const { colors, radius, scene } = useThemeV2();
  const blue = item.tag === 'ongoing';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${TODAY_TAG_LABEL[item.tag]}: ${
        item.notification.title
      }`}
      onPress={() => onPress(item.notification)}
      style={[
        styles.featured,
        { borderRadius: radius.card, backgroundColor: scene.plate },
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={PHOTOS[photoForDestination(item.notification.destination)]}
          resizeMode="cover"
          style={styles.fill}
        />
      </View>
      <LinearGradient
        colors={[
          'rgba(20,19,18,.92)',
          'rgba(20,19,18,.55)',
          'rgba(20,19,18,.2)',
        ]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featuredContent}>
        <View style={[styles.tag, blue ? styles.tagBlue : styles.tagEmber]}>
          <View
            style={[
              styles.tagDot,
              {
                backgroundColor: blue
                  ? colors.recovery.base
                  : colors.ember.base,
              },
            ]}
          />
          <TextV2
            variant="micro"
            color={blue ? colors.recovery.tintText : colors.ember.textOnDark}
            style={styles.tagText}
          >
            {TODAY_TAG_LABEL[item.tag]}
          </TextV2>
        </View>
        <View style={styles.featuredBottom}>
          <View style={styles.flex}>
            <TextV2 variant="section" numberOfLines={1}>
              {item.notification.title}
            </TextV2>
            <TextV2 variant="meta" tone="secondary" numberOfLines={2}>
              {item.notification.summary}
            </TextV2>
          </View>
          <View style={[styles.arrow, { backgroundColor: scene.cta.onScene }]}>
            <ArrowRight
              size={16}
              color={scene.cta.onSceneText}
              strokeWidth={2}
            />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

function AllClear() {
  const { colors } = useThemeV2();

  return (
    <View style={styles.allClear}>
      <View
        style={[styles.allClearDisc, { backgroundColor: colors.ember.base }]}
      >
        <Check size={26} color={colors.ember.onText} strokeWidth={2.4} />
      </View>
      <View style={styles.flex}>
        <TextV2 variant="title22">Todo al día</TextV2>
        <TextV2 variant="label" tone="secondary" style={styles.regular}>
          Te avisaremos cuando haya algo para hoy.
        </TextV2>
      </View>
    </View>
  );
}

function Milestones({
  items,
  onPress,
}: {
  items: Milestone[];
  onPress: (item: Milestone) => void;
}) {
  const { colors, layout, radius, shadow, scene } = useThemeV2();

  return (
    <View style={styles.section}>
      <Eyebrow>Hitos</Eyebrow>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -layout.gutter }}
        contentContainerStyle={[
          styles.milestones,
          { paddingHorizontal: layout.gutter },
        ]}
      >
        {items.map(item => {
          const Icon = BADGE_ICONS[item.icon] ?? Award;

          return (
            <PressableScale
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.detail}`}
              onPress={() => onPress(item)}
              style={[
                styles.milestone,
                {
                  borderRadius: radius.cardCompact + 2,
                  // Fresh: dark plate in both modes, white text (D-03).
                  backgroundColor: item.fresh
                    ? scene.plate
                    : colors.surface.raised,
                  boxShadow: shadow.subtle, // Dark: inner border (D-15)
                },
              ]}
            >
              <View
                style={[
                  styles.hex,
                  {
                    backgroundColor: item.fresh
                      ? scene.medal
                      : colors.cta.primary,
                  },
                ]}
              >
                <View
                  style={[styles.hexRing, { borderColor: colors.ember.base }]}
                >
                  <Icon
                    size={13}
                    color={
                      item.fresh ? scene.onDark.primary : colors.cta.primaryText
                    }
                    strokeWidth={2}
                  />
                </View>
              </View>
              <View style={styles.milestoneTexts}>
                <TextV2
                  variant="bodyStrong"
                  numberOfLines={2}
                  color={
                    item.fresh ? scene.onDark.primary : colors.text.primary
                  }
                >
                  {item.title}
                </TextV2>
                <TextV2
                  variant="caption"
                  color={item.fresh ? scene.onDark.meta : colors.text.secondary}
                >
                  {item.detail}
                </TextV2>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Activity({ items }: { items: ActivityItem[] }) {
  const { colors } = useThemeV2();

  return (
    <View>
      <Eyebrow style={styles.activityTitle}>Actividad reciente</Eyebrow>
      <View>
        <View style={[styles.timeline, { backgroundColor: colors.divider }]} />
        {items.map(item => {
          const Icon = ACTIVITY_ICONS[item.kind];
          const water = item.kind === 'water';

          return (
            <View key={item.id} style={styles.activityRow}>
              <View
                style={[
                  styles.activityDot,
                  { backgroundColor: colors.bg, borderColor: colors.divider },
                ]}
              >
                <Icon
                  size={14}
                  color={water ? colors.recovery.base : colors.text.secondary}
                  strokeWidth={2}
                />
              </View>
              <TextV2 variant="label" style={[styles.flex, styles.regular]}>
                {item.text}
              </TextV2>
              <TextV2 variant="caption" tone="secondary">
                {item.when}
              </TextV2>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
    gap: 30,
  },
  section: {
    gap: 12,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  regular: {
    fontWeight: '400',
  },
  featured: {
    height: 168,
    overflow: 'hidden',
    boxShadow: '0 14px 32px rgba(0,0,0,.14)',
  },
  featuredContent: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 18,
    right: 18,
    justifyContent: 'space-between',
  },
  tag: {
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagEmber: {
    backgroundColor: 'rgba(255,91,31,.18)',
  },
  tagBlue: {
    backgroundColor: 'rgba(110,143,179,.24)',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    overflow: 'hidden',
  },
  allClear: {
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  allClearDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestones: {
    gap: 12,
    paddingBottom: 6,
  },
  milestone: {
    width: 150,
    padding: 16,
    gap: 14,
  },
  hex: {
    width: 44,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTexts: {
    gap: 2,
  },
  activityTitle: {
    paddingBottom: 10,
  },
  timeline: {
    position: 'absolute',
    left: 15,
    top: 14,
    bottom: 14,
    width: StyleSheet.hairlineWidth,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 9,
  },
  activityDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  config: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
