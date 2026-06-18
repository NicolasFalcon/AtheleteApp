import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Dumbbell,
  Droplets,
  RefreshCw,
  Sparkles,
  Target,
  UtensilsCrossed,
} from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import { ELLIE_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { EllieBriefingCard } from '@app/features/ellie/components/EllieBriefingCard';
import { EllieChatContextChips } from '@app/features/ellie/components/EllieChatContextChips';
import { EllieChatInputBar } from '@app/features/ellie/components/EllieChatInputBar';
import {
  EllieDailyFocusGrid,
  type EllieDailyFocus,
} from '@app/features/ellie/components/EllieDailyFocusGrid';
import { EllieHeader } from '@app/features/ellie/components/EllieHeader';
import { EllieMessageRenderer } from '@app/features/ellie/components/EllieMessageRenderer';
import { ElliePriorityCard } from '@app/features/ellie/components/ElliePriorityCard';
import { EllieQuickQuestionChips } from '@app/features/ellie/components/EllieQuickQuestionChips';
import { EllieSegmentedControl } from '@app/features/ellie/components/EllieSegmentedControl';
import { EllieWeeklySummaryCard } from '@app/features/ellie/components/EllieWeeklySummaryCard';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useEllieChat } from '@app/hooks/useEllieChat';
import { useEllieData } from '@app/hooks/useEllieData';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import type { EllieActionType } from '@app/shared';
import type { EllieStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<
  EllieStackParamList,
  typeof ELLIE_ROUTES.Ellie
>;
type EllieSection = 'analysis' | 'chat';

function getNudgeIcon(action: EllieActionType | null, color: string) {
  switch (action) {
    case 'start_workout':
    case 'generate_workout':
      return <Dumbbell color={color} size={18} strokeWidth={2.1} />;
    case 'view_challenge':
      return <Target color={color} size={18} strokeWidth={2.1} />;
    case 'log_hydration':
      return <Droplets color={color} size={18} strokeWidth={2.1} />;
    case 'log_nutrition':
    case 'generate_nutrition':
      return <UtensilsCrossed color={color} size={18} strokeWidth={2.1} />;
    default:
      return <Sparkles color={color} size={18} strokeWidth={2.1} />;
  }
}

export function EllieScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarMotion = useTabBarMotion();
  const { profile } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const ellieData = useEllieData();
  const [section, setSection] = useState<EllieSection>('analysis');
  const messagesRef = useRef<ScrollView | null>(null);

  const ellieChat = useEllieChat({
    userName: profile?.name,
    serializedContext: ellieData.serializedContext,
  });

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboard: {
      flex: 1,
    },
    shell: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    analysisContent: {
      paddingBottom: tabBarHeight + theme.spacing.lg,
      gap: theme.spacing.md,
    },
    analysisSection: {
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    sectionSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 2,
    },
    priorityList: {
      gap: theme.spacing.sm,
      marginTop: 6,
    },
    chatShell: {
      flex: 1,
      marginTop: -2,
    },
    chatHeaderWrap: {
      gap: 3,
      marginBottom: 6,
      paddingHorizontal: 2,
    },
    chatHeaderEyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    chatHeaderTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 22,
      fontWeight: theme.typography.weights.bold,
    },
    chatHeaderHint: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    messageScrollContent: {
      paddingTop: 4,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    typingWrap: {
      alignItems: 'flex-start',
    },
    typingBubble: {
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: '80%',
    },
    typingText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    errorWrap: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
    },
  });

  useEffect(() => {
    if (section !== 'chat') {
      return;
    }

    requestAnimationFrame(() => {
      messagesRef.current?.scrollToEnd({ animated: true });
    });
  }, [ellieChat.messages, ellieChat.isSending, section]);

  const briefingInsights = useMemo(() => {
    const items = ellieData.secondaryInsights.map(insight => insight.text);

    if (ellieData.recentPrLabel) {
      items.push(`PR reciente: ${ellieData.recentPrLabel}.`);
    }

    return items.slice(0, 3);
  }, [ellieData.recentPrLabel, ellieData.secondaryInsights]);

  const openChatWithPrompt = useCallback(
    (prompt: string) => {
      setSection('chat');
      ellieChat.prefillDraft(prompt);
    },
    [ellieChat],
  );

  const openNutritionPlan = useCallback(() => {
    navigation.navigate(ELLIE_ROUTES.NutritionPlan);
  }, [navigation]);

  const handlePriorityAction = useCallback(
    (action: EllieActionType | null) => {
      if (!action) {
        return;
      }

      if (action === 'start_workout' || action === 'generate_workout') {
        navigation.getParent()?.navigate(TAB_ROUTES.Workouts as never);
        return;
      }

      if (action === 'view_challenge') {
        navigation.navigate(ELLIE_ROUTES.Challenge);
        return;
      }

      if (action === 'view_progress') {
        navigation.getParent()?.navigate(TAB_ROUTES.Progress as never);
        return;
      }

      if (action === 'log_nutrition') {
        navigation.navigate(ELLIE_ROUTES.NutritionPlan, { openLog: true });
        return;
      }

      if (action === 'log_hydration') {
        navigation.getParent()?.navigate(TAB_ROUTES.Home as never);
        return;
      }

      setSection('chat');
    },
    [navigation],
  );

  const dailyFocuses = useMemo<EllieDailyFocus[]>(() => {
    const context = ellieData.context;

    if (!context) {
      return [];
    }

    return [
      {
        id: 'training',
        label: 'Entreno',
        status: context.training.todayWorkoutDone
          ? 'Sesión de hoy completa'
          : `${context.training.workoutsThisWeek}/${context.profile.trainingDaysPerWeek} esta semana`,
        action: context.training.todayWorkoutDone
          ? 'Preparar la siguiente'
          : 'Resolver el entreno de hoy',
        attention: context.training.todayWorkoutDone ? 'low' : 'high',
        icon: (
          <Dumbbell
            color={theme.colors.textPrimary}
            size={16}
            strokeWidth={2}
          />
        ),
        onPress: () =>
          openChatWithPrompt(
            '¿Qué debería entrenar hoy según mi progreso actual?',
          ),
      },
      {
        id: 'nutrition',
        label: 'Nutrición',
        status: context.nutrition.loggedToday
          ? 'Registro cargado hoy'
          : 'Aún sin registrar',
        action: context.nutrition.loggedToday
          ? 'Revisar adherencia'
          : 'Definir el siguiente paso',
        attention: context.nutrition.loggedToday ? 'low' : 'high',
        icon: (
          <UtensilsCrossed
            color={theme.colors.textPrimary}
            size={16}
            strokeWidth={2}
          />
        ),
        onPress: () => handlePriorityAction('log_nutrition'),
      },
      {
        id: 'hydration',
        label: 'Agua',
        status: `${context.hydration.todayPercentage}% de la meta`,
        action:
          context.hydration.todayPercentage >= 80
            ? 'Cerrar bien el día'
            : 'Recuperar hidratación',
        attention:
          context.hydration.todayPercentage >= 80
            ? 'low'
            : context.hydration.todayPercentage >= 40
            ? 'medium'
            : 'high',
        icon: (
          <Droplets
            color={theme.colors.textPrimary}
            size={16}
            strokeWidth={2}
          />
        ),
        onPress: () => handlePriorityAction('log_hydration'),
      },
      {
        id: 'core33',
        label: 'Core 33',
        status: context.challenge.active
          ? `Día ${context.challenge.currentDay} · ${context.challenge.completionRate}%`
          : 'Sin reto activo',
        action: context.challenge.active
          ? 'Revisar lo recuperable'
          : 'Conocer el reto',
        attention:
          context.challenge.active && !context.challenge.todayCompleted
            ? 'medium'
            : 'low',
        icon: (
          <Target color={theme.colors.textPrimary} size={16} strokeWidth={2} />
        ),
        onPress: () => handlePriorityAction('view_challenge'),
      },
    ];
  }, [
    ellieData.context,
    handlePriorityAction,
    openChatWithPrompt,
    theme.colors.textPrimary,
  ]);

  const handleSend = () => {
    const mode =
      ellieData.suggestedModes[ellieChat.draft] ||
      ellieData.resolvePromptMode(ellieChat.draft);
    ellieChat.sendDraft(mode).catch(() => {});
  };

  if (
    ellieData.overviewQuery.isLoading ||
    ellieData.personalRecordsQuery.isLoading ||
    ellieData.exercisesQuery.isLoading
  ) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando ELLIE..." />
      </SafeAreaView>
    );
  }

  if (
    ellieData.overviewQuery.error ||
    ellieData.personalRecordsQuery.error ||
    ellieData.exercisesQuery.error
  ) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.errorWrap}>
          <EllieHeader
            onBack={
              navigation.canGoBack() ? () => navigation.goBack() : undefined
            }
          />
          <EmptyState
            title="No pudimos cargar ELLIE"
            description="Revisa la conexión con Supabase o vuelve a intentarlo en un momento."
            icon={
              <RefreshCw
                color={theme.colors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            }
            actionLabel="Reintentar"
            onAction={() => {
              Promise.all([
                ellieData.overviewQuery.refetch(),
                ellieData.personalRecordsQuery.refetch(),
                ellieData.exercisesQuery.refetch(),
              ]).catch(() => {});
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.keyboard}
      >
        <View style={styles.shell}>
          <EllieHeader
            onBack={
              navigation.canGoBack() ? () => navigation.goBack() : undefined
            }
          />

          <EllieSegmentedControl value={section} onChange={setSection} />

          {section === 'analysis' ? (
            <ScrollView
              contentContainerStyle={styles.analysisContent}
              onScroll={tabBarMotion.onScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <EllieBriefingCard
                heroText={
                  ellieData.heroInsight?.text ||
                  'ELLIE ya revisó tus datos y tiene prioridades claras para hoy.'
                }
                insights={briefingInsights}
                onPrimaryAction={() =>
                  openChatWithPrompt(
                    ellieData.promptCards[0]?.prompt ||
                      'Dime cuál debería ser mi prioridad ahora.',
                  )
                }
              />

              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>Focos de hoy</Text>
                <Text style={styles.sectionSubtitle}>
                  Situación, nivel de atención y siguiente movimiento.
                </Text>
                <EllieDailyFocusGrid items={dailyFocuses} />
              </View>

              {ellieData.priorityNudges.length > 0 ? (
                <View style={styles.analysisSection}>
                  <Text style={styles.sectionTitle}>Acciones recomendadas</Text>
                  <Text style={styles.sectionSubtitle}>
                    ELLIE priorizó estas decisiones por impacto inmediato.
                  </Text>
                  <View style={styles.priorityList}>
                    {ellieData.priorityNudges.slice(0, 3).map(nudge => (
                      <ElliePriorityCard
                        key={nudge.id}
                        icon={getNudgeIcon(
                          nudge.action,
                          theme.colors.textPrimary,
                        )}
                        text={nudge.text}
                        actionLabel={nudge.actionLabel || 'Abrir'}
                        onPress={() => handlePriorityAction(nudge.action)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <EllieQuickQuestionChips
                chips={ellieData.quickQuestionChips}
                onSelect={openChatWithPrompt}
              />

              {ellieData.weeklySummary ? (
                <EllieWeeklySummaryCard
                  summary={ellieData.weeklySummary}
                  onOpenChat={() =>
                    openChatWithPrompt(
                      `Analiza mi progreso de esta semana. ${ellieData.weeklySummary?.suggestion}`,
                    )
                  }
                />
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.chatShell}>
              <View style={styles.chatHeaderWrap}>
                <Text style={styles.chatHeaderEyebrow}>Coach IA</Text>
                <Text style={styles.chatHeaderTitle}>
                  ¿En qué quieres que te ayude hoy?
                </Text>
                <Text style={styles.chatHeaderHint}>
                  Elige una intención o cuéntame exactamente qué necesitas.
                </Text>
              </View>
              <EllieChatContextChips
                chips={ellieData.quickChatChips.slice(0, 6)}
                hasHistory={ellieChat.hasHistory}
                isClearing={ellieChat.isClearing}
                onSelectPrompt={ellieChat.prefillDraft}
                onClearChat={() => {
                  ellieChat.clearChat().catch(() => {});
                }}
              />

              {ellieChat.historyQuery.isLoading ? (
                <Loader label="Cargando conversación..." />
              ) : (
                <>
                  <ScrollView
                    ref={messagesRef}
                    contentContainerStyle={styles.messageScrollContent}
                    onScroll={tabBarMotion.onScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    contentInsetAdjustmentBehavior="automatic"
                    automaticallyAdjustKeyboardInsets
                  >
                    {ellieChat.messages.map(message => (
                      <EllieMessageRenderer
                        key={message.id}
                        message={message}
                        busyMessageId={ellieChat.busyMessageId}
                        busyAction={ellieChat.busyAction}
                        onSaveWorkout={ellieChat.saveGeneratedWorkout}
                        onActivatePlan={
                          ellieChat.activateGeneratedNutritionPlan
                        }
                        onDiscard={ellieChat.discardGeneratedMessage}
                        onRegenerate={ellieChat.regenerateGeneratedMessage}
                        onOpenNutritionPlan={openNutritionPlan}
                      />
                    ))}
                    {ellieChat.isSending ? (
                      <View style={styles.typingWrap}>
                        <View style={styles.typingBubble}>
                          <Sparkles
                            color={theme.colors.textPrimary}
                            size={14}
                            strokeWidth={2}
                          />
                          <Text style={styles.typingText}>
                            ELLIE está pensando...
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </ScrollView>

                  <EllieChatInputBar
                    draft={ellieChat.draft}
                    savedDraft={ellieChat.savedDraft}
                    onChangeDraft={ellieChat.setDraft}
                    onSend={handleSend}
                    onRestoreSavedDraft={ellieChat.restoreSavedDraft}
                    onDismissSavedDraft={ellieChat.dismissSavedDraft}
                    disabled={ellieChat.isSending}
                  />
                </>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
