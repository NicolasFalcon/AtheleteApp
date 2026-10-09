import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreHorizontal, Trash2 } from 'lucide-react-native';
import {
  BackButton,
  Button,
  EllieComposer,
  LivingHalo,
  IconButton,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { CANNED_PROMPTS, showSuggestions } from '@app/features/ellie/chatModel';
import {
  EllieVoice,
  NutritionPlanCard,
  RoutineCard,
  SuggestionPills,
  ThinkingIndicator,
  UserPill,
} from '@app/features/ellie/v2/ChatParts';
import {
  defaultGreeting,
  useEllieConversation,
} from '@app/features/ellie/v2/useEllieConversation';
import { ellieChatFixture } from '@app/dev/ellieFixtures';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'EllieChat'>;

// ELLIE_02 / 03 / STATE_08: the conversation. The user's messages are black
// pills, ELLIE speaks without a bubble. A prompt that comes from another
// screen (route params) is sent once when the thread is ready.
export function EllieChatScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profile } = useAuth();
  const ellieData = useEllieData();
  const params = route.params;
  const dev = __DEV__ ? params?.devState : undefined;
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const greeting = defaultGreeting(firstName);
  const fixture = useMemo(
    () => (dev ? ellieChatFixture(dev, greeting) : undefined),
    [dev, greeting],
  );
  const chat = useEllieConversation({
    userContext: ellieData.serializedContext,
    greeting,
    fixture,
  });
  const { state } = chat;
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const sentPrompt = useRef(false);

  // The prompt of another screen: once, when the thread has loaded.
  useEffect(() => {
    if (!params?.prompt || sentPrompt.current || !chat.ready || dev) {
      return;
    }
    sentPrompt.current = true;
    chat.send(params.prompt, params.mode);
  }, [chat, dev, params?.mode, params?.prompt]);

  const offline = state.blocked === 'offline';
  const loading = chat.loading || dev === 'loading';
  const autoFocus = Boolean(params?.focusInput) && !dev;
  const suggestions = showSuggestions(state);

  const scrollToEnd = useCallback(
    () => scroll.current?.scrollToEnd({ animated: true }),
    [],
  );

  const adjust = () => {
    chat.setDraft('Quiero ajustar este plan: ');
    input.current?.focus();
  };

  const pickSuggestion = (index: number) => {
    const prompt = CANNED_PROMPTS[index];
    chat.send(prompt.text, prompt.mode);
  };

  const body = state.messages.map(message => {
    if (message.kind === 'nutrition') {
      return (
        <NutritionPlanCard
          key={message.id}
          card={message}
          regenerating={Boolean(chat.busy[message.id])}
          onActivate={() => chat.activatePlan(message.id)}
          onAnother={() => chat.anotherVersion(message.id)}
          onAdjust={adjust}
        />
      );
    }
    if (message.kind === 'workout') {
      return (
        <RoutineCard
          key={message.id}
          card={message}
          regenerating={Boolean(chat.busy[message.id])}
          onStart={() =>
            message.workoutId &&
            navigation.navigate(APP_ROUTES.WorkoutDetail, {
              workoutId: message.workoutId,
            })
          }
          onSave={() => chat.saveRoutine(message.id)}
          onAnother={() => chat.anotherVersion(message.id)}
        />
      );
    }
    if (message.role === 'user') {
      return (
        <UserPill
          key={message.id}
          text={message.text}
          status={message.status}
          onRetry={() => chat.retry(message.id)}
        />
      );
    }
    return (
      <EllieVoice key={message.id} text={message.text} muted={message.notice} />
    );
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 6, paddingHorizontal: layout.gutter - 4 },
        ]}
      >
        <BackButton variant="muted" onPress={() => navigation.goBack()} />
        <View style={styles.title} accessibilityRole="header">
          <LivingHalo size={28} state={offline ? 'offline' : 'idle'} />
          <View>
            <TextV2 variant="bodyStrong">ELLIE</TextV2>
            <TextV2 variant="caption" color={colors.ellie.textSecondary}>
              {offline ? 'Sin conexión' : 'Contigo'}
            </TextV2>
          </View>
        </View>
        <IconButton
          icon={MoreHorizontal}
          variant="muted"
          accessibilityLabel="Más opciones"
          onPress={() => setMenu(true)}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          contentContainerStyle={[
            styles.thread,
            { paddingHorizontal: layout.gutter },
          ]}
        >
          {loading ? (
            <SkeletonGroup>
              <View style={styles.skeleton}>
                <Skeleton height={20} width="88%" />
                <Skeleton height={20} width="74%" />
                <Skeleton height={20} width="52%" />
              </View>
            </SkeletonGroup>
          ) : (
            <>
              {chat.historyFailed || dev === 'historyError' ? (
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => chat.refetchHistory()}
                >
                  <TextV2 variant="meta" color={colors.text.secondary}>
                    No pudimos cargar tu conversación ·{' '}
                    <TextV2 variant="metaStrong">Reintentar</TextV2>
                  </TextV2>
                </PressableScale>
              ) : null}
              {body}
              {state.thinking ? <ThinkingIndicator /> : null}
              {suggestions ? (
                <SuggestionPills
                  items={CANNED_PROMPTS.map(prompt => prompt.text)}
                  onPick={pickSuggestion}
                />
              ) : null}
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.composer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: layout.gutter,
            },
          ]}
        >
          <EllieComposer
            ref={input}
            variant="input"
            placeholder={chat.composer.placeholder}
            value={chat.draft}
            onChangeText={chat.setDraft}
            onSend={() => chat.send(chat.draft)}
            canSend={chat.composer.canSend}
            disabled={chat.composer.disabled}
            autoFocus={autoFocus}
            haloState={state.thinking ? 'thinking' : 'idle'}
            onVoice={() => navigation.navigate(APP_ROUTES.EllieVoice)}
          />
        </View>
      </KeyboardAvoidingView>

      <Sheet open={menu} onClose={() => setMenu(false)} title="ELLIE">
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            setTimeout(() => setConfirm(true), 350);
          }}
          style={styles.menuRow}
        >
          <Trash2 size={20} color={colors.text.primary} strokeWidth={1.8} />
          <TextV2 variant="cta">Nueva conversación</TextV2>
        </PressableScale>
      </Sheet>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Empezar de nuevo?"
        footer={
          <Button
            label="Borrar y empezar"
            onPress={async () => {
              setConfirm(false);
              try {
                await chat.reset();
              } catch {
                toast.show('No pudimos borrar la conversación', {
                  tone: 'error',
                });
              }
            }}
            style={styles.flex}
          />
        }
      >
        <TextV2 variant="body" color={colors.text.secondary}>
          ELLIE guarda una sola conversación. Se borrará la actual y empezarás
          una nueva.
        </TextV2>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thread: { gap: 22, paddingTop: 18, paddingBottom: 24, flexGrow: 1 },
  skeleton: { gap: 12 },
  composer: { paddingTop: 8 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
});
