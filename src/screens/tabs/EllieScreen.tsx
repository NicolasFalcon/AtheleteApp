import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  Dumbbell,
  Flame,
  Leaf,
  MoreHorizontal,
  Moon,
  RefreshCw,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import { ELLIE_ROUTES } from '@app/constants/routes';
import { EllieChatInputBar } from '@app/features/ellie/components/EllieChatInputBar';
import { EllieMessageRenderer } from '@app/features/ellie/components/EllieMessageRenderer';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useEllieChat } from '@app/hooks/useEllieChat';
import { useEllieData } from '@app/hooks/useEllieData';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import type { EllieStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<
  EllieStackParamList,
  typeof ELLIE_ROUTES.Ellie
>;

type QuickAction = {
  id: string;
  label: string;
  prompt: string;
  icon: ReactNode;
};

type ExploreCard = {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  icon: ReactNode;
};

export function EllieScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onScroll, setTabBarVisible } = useTabBarMotion();
  const { profile } = useAuth();
  const { height: tabBarHeight, bottomClearance } = useTabBarMetrics();
  const { width } = useWindowDimensions();
  const ellieData = useEllieData();
  const messagesRef = useRef<ScrollView | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [activeExploreIndex, setActiveExploreIndex] = useState(0);

  const ellieChat = useEllieChat({
    userName: profile?.name,
    serializedContext: ellieData.serializedContext,
  });

  const firstName = useMemo(() => {
    const [name] = profile?.name?.trim().split(/\s+/) || [];
    return name || '';
  }, [profile?.name]);

  const cardWidth = Math.min(248, Math.max(214, width * 0.58));
  const carouselStep = cardWidth + theme.spacing.sm;

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: 'today-routine',
        label: 'Rutina de hoy',
        prompt: 'Ayúdame a elegir la rutina ideal para hoy.',
        icon: (
          <Dumbbell color={theme.colors.textPrimary} size={16} strokeWidth={2} />
        ),
      },
      {
        id: 'nutrition-plan',
        label: 'Plan nutricional',
        prompt: 'Quiero revisar o ajustar mi plan nutricional.',
        icon: (
          <Leaf color={theme.colors.textPrimary} size={17} strokeWidth={2} />
        ),
      },
      {
        id: 'recovery',
        label: 'Recuperación',
        prompt: 'Dame una recomendación para mejorar mi recuperación.',
        icon: (
          <RefreshCw
            color={theme.colors.textPrimary}
            size={16}
            strokeWidth={2}
          />
        ),
      },
      {
        id: 'weekly-progress',
        label: 'Progreso semanal',
        prompt: 'Analiza mi progreso semanal y dime qué mejorar.',
        icon: (
          <BarChart3
            color={theme.colors.textPrimary}
            size={16}
            strokeWidth={2}
          />
        ),
      },
    ],
    [theme.colors.textPrimary],
  );

  const exploreCards = useMemo<ExploreCard[]>(
    () => [
      {
        id: 'recovery',
        title: 'Mejora tu recuperación',
        subtitle: 'Duerme mejor, rinde más.',
        prompt: '¿Cómo puedo mejorar mi recuperación esta semana?',
        icon: <Moon color={theme.colors.textPrimary} size={19} strokeWidth={2} />,
      },
      {
        id: 'macros',
        title: 'Ajusta tus macros',
        subtitle: 'Equilibra tu nutrición.',
        prompt: 'Ayúdame a ajustar mis macros según mi objetivo actual.',
        icon: (
          <UtensilsCrossed
            color={theme.colors.textPrimary}
            size={19}
            strokeWidth={2}
          />
        ),
      },
      {
        id: 'chest',
        title: 'Rutina para pecho',
        subtitle: 'Entrenamiento efectivo.',
        prompt: 'Créame una rutina efectiva para pecho.',
        icon: (
          <Dumbbell color={theme.colors.textPrimary} size={19} strokeWidth={2} />
        ),
      },
      {
        id: 'plateau',
        title: 'Cómo romper un estancamiento',
        subtitle: 'Vuelve a progresar.',
        prompt: 'Siento que estoy estancado. ¿Qué debería ajustar?',
        icon: (
          <Flame color={theme.colors.textPrimary} size={19} strokeWidth={2} />
        ),
      },
    ],
    [theme.colors.textPrimary],
  );

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboard: {
      flex: 1,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    inputDock: {
      marginBottom: hasStartedChat ? 0 : tabBarHeight,
      backgroundColor: theme.colors.background,
    },
    welcomeContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: bottomClearance + theme.spacing.lg,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    heroCopy: {
      flex: 1,
    },
    greeting: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 28,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      lineHeight: 34,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    ellieButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      marginTop: 2,
      ...theme.elevations.subtle,
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xl,
    },
    quickPill: {
      width: (width - theme.spacing.md * 2 - theme.spacing.xs) / 2,
      minHeight: 42,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.1)',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      ...theme.elevations.subtle,
    },
    quickLabel: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 17,
    },
    exploreHeader: {
      marginBottom: theme.spacing.sm,
    },
    exploreBlock: {
      marginTop: 'auto',
      paddingTop: theme.spacing.lg,
    },
    exploreTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 19,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 24,
    },
    exploreSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    carouselContent: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.md,
      paddingBottom: 2,
    },
    exploreCard: {
      width: cardWidth,
      minHeight: 136,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.08)',
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...theme.elevations.subtle,
    },
    exploreCardContent: {
      flex: 1,
    },
    exploreIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    exploreCardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 20,
    },
    exploreCardSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
    },
    cardCta: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: theme.spacing.sm,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'rgba(17,17,17,0.16)',
    },
    dotActive: {
      backgroundColor: theme.colors.textPrimary,
    },
    chatShell: {
      flex: 1,
      paddingTop: theme.spacing.xs,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 2,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    chatTitleWrap: {
      flex: 1,
      alignItems: 'center',
    },
    chatEyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
      marginTop: 2,
    },
    chatTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.semibold,
    },
    messageScrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      gap: 14,
    },
    messageScroll: {
      flex: 1,
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

  const startChatWithPrompt = useCallback(
    (prompt: string) => {
      setHasStartedChat(true);
      ellieChat.prefillDraft(prompt);
    },
    [ellieChat],
  );

  const openNutritionPlan = useCallback(() => {
    navigation.navigate(ELLIE_ROUTES.NutritionPlan);
  }, [navigation]);

  const handleSend = () => {
    if (!ellieChat.draft.trim()) {
      return;
    }

    setHasStartedChat(true);
    const mode =
      ellieData.suggestedModes[ellieChat.draft] ||
      ellieData.resolvePromptMode(ellieChat.draft);
    ellieChat.sendDraft(mode).catch(() => {});
  };

  const handleExploreScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / carouselStep);
    setActiveExploreIndex(Math.min(2, Math.max(0, index)));
  };

  useEffect(() => {
    if (!hasStartedChat) {
      return;
    }

    requestAnimationFrame(() => {
      messagesRef.current?.scrollToEnd({ animated: true });
    });
  }, [ellieChat.messages, ellieChat.isSending, hasStartedChat]);

  useEffect(() => {
    setTabBarVisible(!hasStartedChat);

    return () => {
      setTabBarVisible(true);
    };
  }, [hasStartedChat, setTabBarVisible]);

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
        <View style={styles.screen}>
          {hasStartedChat ? (
            <View style={styles.chatShell}>
              <View style={styles.chatHeader}>
                <Pressable
                  onPress={() => setHasStartedChat(false)}
                  style={({ pressed }) => [
                    styles.headerIconButton,
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <ChevronLeft
                    color={theme.colors.textPrimary}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
                <View style={styles.chatTitleWrap}>
                  <Text style={styles.chatTitle}>ELLIE</Text>
                  <Text style={styles.chatEyebrow}>Coach IA</Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (ellieChat.hasHistory) {
                      ellieChat.clearChat().catch(() => {});
                    }
                  }}
                  style={({ pressed }) => [
                    styles.headerIconButton,
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <MoreHorizontal
                    color={theme.colors.textPrimary}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>

              {ellieChat.historyQuery.isLoading ? (
                <Loader label="Cargando conversación..." />
              ) : (
                <>
                  <ScrollView
                    ref={messagesRef}
                    style={styles.messageScroll}
                    contentContainerStyle={styles.messageScrollContent}
                    onScroll={onScroll}
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

                  <View style={styles.inputDock}>
                    <EllieChatInputBar
                      draft={ellieChat.draft}
                      savedDraft={ellieChat.savedDraft}
                      placeholder="Pregúntale algo a ELLIE..."
                      onChangeDraft={ellieChat.setDraft}
                      onSend={handleSend}
                      onRestoreSavedDraft={ellieChat.restoreSavedDraft}
                      onDismissSavedDraft={ellieChat.dismissSavedDraft}
                      disabled={ellieChat.isSending}
                    />
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={styles.welcomeContent}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.hero}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.greeting}>
                      Hola{firstName ? `, ${firstName}` : ''}
                    </Text>
                    <Text style={styles.subtitle}>
                      ELLIE está lista para ayudarte hoy
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      startChatWithPrompt('¿En qué puedes ayudarme hoy?')
                    }
                    style={({ pressed }) => [
                      styles.ellieButton,
                      pressed ? { opacity: 0.86 } : null,
                    ]}
                  >
                    <Sparkles
                      color={theme.colors.accentContrast}
                      size={18}
                      strokeWidth={2}
                    />
                  </Pressable>
                </View>

                <View style={styles.quickGrid}>
                  {quickActions.map(action => (
                    <Pressable
                      key={action.id}
                      onPress={() => startChatWithPrompt(action.prompt)}
                      style={({ pressed }) => [
                        styles.quickPill,
                        pressed ? { opacity: 0.78 } : null,
                      ]}
                    >
                      {action.icon}
                      <Text style={styles.quickLabel}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.exploreBlock}>
                  <View style={styles.exploreHeader}>
                    <Text style={styles.exploreTitle}>Explora con ELLIE</Text>
                    <Text style={styles.exploreSubtitle}>
                      Ideas y recomendaciones pensadas para ti
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    decelerationRate="fast"
                    onScroll={handleExploreScroll}
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={carouselStep}
                    contentContainerStyle={styles.carouselContent}
                  >
                    {exploreCards.map(card => (
                      <Pressable
                        key={card.id}
                        onPress={() => startChatWithPrompt(card.prompt)}
                        style={({ pressed }) => [
                          styles.exploreCard,
                          pressed ? { opacity: 0.82 } : null,
                        ]}
                      >
                        <View style={styles.exploreIconWrap}>{card.icon}</View>
                        <View style={styles.exploreCardContent}>
                          <Text style={styles.exploreCardTitle}>
                            {card.title}
                          </Text>
                          <Text style={styles.exploreCardSubtitle}>
                            {card.subtitle}
                          </Text>
                        </View>
                        <View style={styles.cardCta}>
                          <ArrowRight
                            color={theme.colors.textPrimary}
                            size={16}
                            strokeWidth={2}
                          />
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={styles.pagination}>
                    {[0, 1, 2].map(index => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          activeExploreIndex === index
                            ? styles.dotActive
                            : null,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
