import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  Check,
  Dumbbell,
  ListChecks,
  Minus,
  Plus,
  Timer,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import {
  AvatarStack,
  BackButton,
  Button,
  GlassSurface,
  PersonAvatar,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  haptics,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  CREATE_STEPS,
  DURATIONS,
  STEP_ERRORS,
  canCreate,
  challengeTitle,
  createErrorMessage,
  createErrorStep,
  friendMetrics,
  initialDraft,
  metricInfo,
  selectMetric,
  stepGoal,
  toggleInvitee,
  validateStep,
  type CreateDraft,
} from '@app/features/social/challengeModel';
import type { ChallengeMetric } from '@app/features/social/challengeTypes';
import { handleOf } from '@app/features/social/socialMappers';
import { activityLine, firstName, joinWithAnd } from '@app/features/social/socialModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialCreateChallenge'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

const ICONS: Partial<Record<ChallengeMetric, LucideIcon>> = {
  workouts: Dumbbell,
  strength_sessions: Weight,
  minutes_trained: Timer,
  core33_habit_days: ListChecks,
  mobility_minutes: Activity,
};

// Dev only: a draft already filled in for each step.
function devDraft(step: number | undefined, inviteeId: string | undefined): CreateDraft {
  const base = initialDraft(inviteeId);
  if (step === undefined || step === 0) {
    return base;
  }
  const withMetric = selectMetric(base, 'workouts');
  return {
    ...withMetric,
    durationDays: step >= 2 ? 7 : null,
    inviteeIds: step >= 3 ? ['fx-carlos', 'fx-andrea'] : withMetric.inviteeIds,
  };
}

// Crear reto (SOCIAL_11): five short steps — tipo, objetivo, duración, amigos y
// revisión con la vista previa. Between friends there is no repetitions type
// (BT-45); points only exist in the official challenge.
export function SocialCreateChallengeScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const overview = useSocialResource('getFriendsOverview', s => s.getFriendsOverview());
  const inviteeId = route.params?.inviteeId;
  const devStep = __DEV__ ? route.params?.devStep : undefined;
  const [step, setStep] = useState<number>(devStep ?? 0);
  const [draft, setDraft] = useState<CreateDraft>(() => devDraft(devStep, inviteeId));
  const [creating, setCreating] = useState(false);

  const friends = overview.data?.friends ?? [];
  const friendIds = friends.map(item => item.profile.id);
  const check = validateStep(step, draft, friendIds);
  const metric = draft.metric ? metricInfo(draft.metric) : null;
  const title =
    draft.metric && draft.durationDays
      ? challengeTitle(draft.metric, draft.goal, draft.durationDays)
      : '';
  const invitees = friends.filter(item => draft.inviteeIds.includes(item.profile.id));

  const back = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      safeGoBack(navigation, BACK_FALLBACKS);
    }
  };

  const create = async () => {
    if (!canCreate(draft, friendIds) || !draft.metric || !draft.durationDays || creating) {
      return;
    }
    setCreating(true);
    try {
      const result = await service.createFriendChallenge({
        metric: draft.metric,
        goal: draft.goal,
        durationDays: draft.durationDays,
        inviteeIds: draft.inviteeIds,
      });
      if (result.ok) {
        haptics.success();
        toast.show('Reto creado. Empieza cuando acepte alguien.');
        navigation.replace(APP_ROUTES.SocialChallenge, { challengeId: result.challengeId });
      } else {
        // The server validates again: show what it rejected and go back to
        // the step that fixes it.
        toast.show(createErrorMessage(result), { tone: 'error' });
        const target = createErrorStep(result);
        if (target !== null) {
          setStep(target);
        }
      }
    } catch {
      toast.show('No se pudo crear el reto. Inténtalo de nuevo.', { tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const next = () => {
    if (!check.ok) {
      haptics.error();
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      create();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.bar}>
          <BackButton onPress={back} />
          <TextV2 variant="cta" align="center" style={styles.flex}>
            Nuevo reto
          </TextV2>
          <View style={styles.side} />
        </View>
        <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Paso ${step + 1} de 5`}>
          {CREATE_STEPS.map((item, index) => (
            <View key={item.key} style={styles.stepCell}>
              <View
                style={[
                  styles.stepBar,
                  { backgroundColor: index === step ? colors.cta.primary : index < step ? colors.ember.base : colors.surface.muted },
                ]}
              />
              <TextV2
                variant="caption"
                color={index === step ? colors.text.primary : colors.text.tertiary}
                style={index === step ? styles.stepActive : undefined}
              >
                {item.label}
              </TextV2>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 14, paddingBottom: 140 }}
      >
        <Animated.View key={step} entering={FadeInRight.duration(280)} style={styles.stepBody}>
          <TextV2 style={styles.question}>{CREATE_STEPS[step].question}</TextV2>

          {step === 0 ? (
            <View accessibilityRole="radiogroup">
              {friendMetrics().map(item => {
                const on = draft.metric === item.metric;
                const Icon = ICONS[item.metric] ?? Dumbbell;
                return (
                  <PressableScale
                    key={item.metric}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${item.title}. ${item.subtitle}`}
                    onPress={() => {
                      haptics.selection();
                      setDraft(selectMetric(draft, item.metric));
                    }}
                    style={[styles.typeRow, { borderBottomColor: colors.divider }]}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: on ? colors.cta.primary : colors.surface.muted }]}>
                      <Icon size={19} strokeWidth={1.9} color={on ? colors.cta.primaryText : colors.text.primary} />
                    </View>
                    <View style={styles.flex}>
                      <TextV2 variant="cta">{item.title}</TextV2>
                      <TextV2 variant="meta" tone="secondary">
                        {item.subtitle}
                      </TextV2>
                    </View>
                    <View
                      style={[
                        styles.dot,
                        on
                          ? { backgroundColor: colors.cta.primary }
                          : { borderWidth: 1.5, borderColor: colors.outline.control },
                      ]}
                    >
                      {on ? <Check size={13} strokeWidth={3} color={colors.cta.primaryText} /> : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          {step === 1 && metric && draft.metric ? (
            <View>
              <View style={styles.stepper}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Menos"
                  onPress={() => draft.metric && setDraft({ ...draft, goal: stepGoal(draft.metric, draft.goal, -1) })}
                  style={[styles.round, { backgroundColor: colors.surface.muted }]}
                >
                  <Minus size={22} strokeWidth={2} color={colors.text.primary} />
                </PressableScale>
                <View style={styles.goal}>
                  <TextV2 style={styles.goalNumber}>{String(draft.goal)}</TextV2>
                  <TextV2 variant="body" tone="secondary">
                    {metric.unit}
                  </TextV2>
                </View>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Más"
                  onPress={() => draft.metric && setDraft({ ...draft, goal: stepGoal(draft.metric, draft.goal, 1) })}
                  style={[styles.round, { backgroundColor: colors.surface.muted }]}
                >
                  <Plus size={22} strokeWidth={2} color={colors.text.primary} />
                </PressableScale>
              </View>
              <TextV2 variant="meta" tone="secondary" align="center">
                Se cuenta solo con lo que registráis en Athelete.
              </TextV2>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.durations} accessibilityRole="radiogroup">
              {DURATIONS.map(item => {
                const on = draft.durationDays === item.days;
                return (
                  <PressableScale
                    key={item.days}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={item.label}
                    onPress={() => {
                      haptics.selection();
                      setDraft({ ...draft, durationDays: item.days });
                    }}
                    style={[
                      styles.duration,
                      {
                        backgroundColor: colors.surface.raised,
                        boxShadow: on ? `inset 0 0 0 2px ${colors.cta.primary}` : undefined,
                      },
                    ]}
                  >
                    <TextV2 variant="cta">{item.label}</TextV2>
                    <TextV2 variant="meta" tone="secondary">
                      Empieza cuando acepte alguien
                    </TextV2>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              {overview.status === 'loading' ? (
                <SkeletonGroup>
                  <Skeleton height={46} radius={23} />
                  <Skeleton height={46} radius={23} />
                </SkeletonGroup>
              ) : null}
              {overview.status === 'ready' && friends.length === 0 ? (
                <TextV2 variant="body" tone="secondary">
                  Todavía no tienes amigos a los que retar. Añade a alguien desde Amigos.
                </TextV2>
              ) : null}
              {friends.map(item => {
                const on = draft.inviteeIds.includes(item.profile.id);
                return (
                  <PressableScale
                    key={item.profile.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={item.profile.name}
                    onPress={() => {
                      haptics.selection();
                      setDraft(toggleInvitee(draft, item.profile.id));
                    }}
                    style={styles.friendRow}
                  >
                    <PersonAvatar
                      name={item.profile.name}
                      avatarKey={item.profile.avatar_key}
                      profilePhotoUrl={item.profile.profile_photo_url}
                      relationship="friends"
                      size={46}
                      style={on ? { boxShadow: `0 0 0 2px ${colors.bg}, 0 0 0 3.5px ${colors.cta.primary}` } : undefined}
                    />
                    <View style={styles.flex}>
                      <TextV2 variant="cta">{item.profile.name}</TextV2>
                      <TextV2 variant="meta" tone="secondary">
                        {item.lastActivity ? activityLine(item.lastActivity) : handleOf(item.profile.username)}
                      </TextV2>
                    </View>
                    <View
                      style={[
                        styles.dotLarge,
                        on
                          ? { backgroundColor: colors.cta.primary }
                          : { borderWidth: 1.5, borderColor: colors.outline.control },
                      ]}
                    >
                      {on ? <Check size={14} strokeWidth={3} color={colors.cta.primaryText} /> : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          {step === 4 ? (
            <>
              <SceneScope>
              <View style={styles.review}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewTag}>
                    <TextV2 variant="eyebrow" color="#D8D6D1">
                      Entre amigos
                    </TextV2>
                  </View>
                  <TextV2 variant="meta" color="#A8A6A1">
                    {draft.durationDays
                      ? DURATIONS.find(item => item.days === draft.durationDays)?.label
                      : ''}
                  </TextV2>
                </View>
                <View style={styles.reviewTitles}>
                  <TextV2 style={styles.reviewTitle}>{title}</TextV2>
                  <TextV2 variant="meta" color="#A8A6A1">
                    Se cuenta solo desde Athelete
                  </TextV2>
                </View>
                <View style={styles.reviewPeople}>
                  <AvatarStack
                    size={32}
                    max={4}
                    ringColor="#141312"
                    items={[
                      { key: 'me', name: 'Tú', relationship: 'self' as const },
                      ...invitees.map(item => ({
                        key: item.profile.id,
                        name: item.profile.name,
                        avatarKey: item.profile.avatar_key,
                        profilePhotoUrl: item.profile.profile_photo_url,
                        relationship: 'friends' as const,
                      })),
                    ]}
                  />
                  <TextV2 variant="meta" color="#D8D6D1" style={styles.flex}>
                    {`Tú y ${joinWithAnd(invitees.map(item => firstName(item.profile.name)))}`}
                  </TextV2>
                </View>
              </View>
              </SceneScope>
              <TextV2 variant="body" tone="secondary" style={styles.reviewNote}>
                Solo tú y las personas invitadas veréis el progreso. Los puntos se ganan en los retos oficiales.
              </TextV2>
            </>
          ) : null}
        </Animated.View>
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: colors.divider }]}
      >
        {!check.ok ? (
          <TextV2 variant="caption" tone="tertiary" align="center">
            {STEP_ERRORS[check.error]}
          </TextV2>
        ) : null}
        <Button
          label={step < 4 ? 'Siguiente' : 'Crear reto'}
          loading={creating}
          loadingLabel="Creando"
          disabled={!check.ok}
          onPress={next}
        />
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 12, gap: 14, paddingBottom: 6 },
  bar: { flexDirection: 'row', alignItems: 'center' },
  side: { width: 44 },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  stepCell: { flex: 1, gap: 6 },
  stepBar: { height: 3, borderRadius: 2 },
  stepActive: { fontWeight: '600' },
  stepBody: { gap: 20 },
  question: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 30 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotLarge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 26 },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  goal: { alignItems: 'center', gap: 2 },
  goalNumber: { fontSize: 64, fontWeight: '600', letterSpacing: -1.9, lineHeight: 66 },
  durations: { gap: 10 },
  duration: { padding: 18, paddingHorizontal: 20, borderRadius: 22, gap: 2 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  review: { borderRadius: 30, backgroundColor: '#141312', padding: 24, paddingHorizontal: 22, gap: 22 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTag: { height: 24, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', justifyContent: 'center' },
  reviewTitles: { gap: 6 },
  reviewTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 30, color: '#FFFFFF' },
  reviewPeople: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.1)' },
  reviewNote: { marginTop: 20 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 0.5, gap: 8 },
});
