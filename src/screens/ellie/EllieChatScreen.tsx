import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquarePlus, MoreHorizontal, RefreshCw, Trash2, X } from 'lucide-react-native';
import { Image } from 'react-native';
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
import { isRetryable } from '@app/features/ellie/ellieCopy';
import {
  EllieVoice,
  MealAnalysisCard,
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
import { relativeWhen } from '@app/features/ellie/chatModel';
import { useAuth } from '@app/hooks/useAuth';
import {
  useDeleteEllieConversation,
  useEllieConversations,
} from '@app/hooks/useEllieConversations';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRegisteredMeal } from '@app/hooks/useRegisteredMeal';
import { useMealMutations } from '@app/hooks/useMeals';
import { draftFromAnalysis, toSaveInput } from '@app/features/nutrition/mealDraft';
import { mealRegistrar } from '@app/features/nutrition/mealRegistrar';
import { PhotoSourceSheet } from '@app/features/vision/v2/PhotoSourceSheet';
import { usePhotoAttachment } from '@app/features/vision/usePhotoAttachment';
import type { MealCardMessage } from '@app/features/ellie/chatModel';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'EllieChat'>;

// The card of a photo of a meal with its own state: registered or not (read
// from the database, so it also holds after restarting), registering, failed.
function MealCard({
  card,
  language,
  onEdit,
  onOpenDay,
}: {
  card: MealCardMessage;
  language: 'es' | 'en';
  onEdit: () => void;
  onOpenDay: () => void;
}) {
  const meals = useMealMutations();
  const { registered, mark } = useRegisteredMeal(card.id);
  const [registering, setRegistering] = useState(false);
  const [failed, setFailed] = useState(false);

  const register = async () => {
    if (registered || registering || mealRegistrar.isBusy(card.id)) {
      return;
    }
    setRegistering(true);
    setFailed(false);
    const { outcome, meal } = await mealRegistrar.register(
      card.id,
      toSaveInput(draftFromAnalysis(card.meal, new Date()), { source: 'chat', chatMessageId: card.id, language }),
      input => meals.save.mutateAsync(input),
    );
    if (outcome === 'saved' && meal) {
      mark({ id: meal.id, mealType: meal.mealType });
    } else if (outcome === 'failed') {
      setFailed(true);
    }
    setRegistering(false);
  };

  return (
    <MealAnalysisCard
      card={card}
      registered={registered}
      registering={registering}
      error={failed}
      language={language}
      onRegister={() => {
        register().catch(() => undefined);
      }}
      onEdit={onEdit}
      onOpenDay={onOpenDay}
    />
  );
}

// ELLIE_02 / 03 / STATE_08: the conversation. The user's messages are black
// pills, ELLIE speaks without a bubble. A prompt that comes from another
// screen (route params) is sent once when the thread is ready.
export function EllieChatScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profile, signOut } = useAuth();
  const language = useProfileLanguage();
  const params = route.params;
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const greeting = defaultGreeting(firstName);
  const chat = useEllieConversation({
    greeting,
    language,
    conversationId: params?.conversationId === 'new' ? null : params?.conversationId,
    clientContext: params?.source ?? null,
    // The session is gone: back to the sign-in.
    onUnauthorized: () => {
      signOut().catch(() => undefined);
    },
  });
  const conversations = useEllieConversations();
  const deleteConversation = useDeleteEllieConversation();
  const { state } = chat;
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const [menu, setMenu] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const photo = usePhotoAttachment();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const sentPrompt = useRef(false);

  // The prompt of another screen: once, when the thread has loaded.
  useEffect(() => {
    if (!params?.prompt || sentPrompt.current || !chat.ready) {
      return;
    }
    sentPrompt.current = true;
    chat.send(params.prompt, params.mode);
  }, [chat, params?.mode, params?.prompt]);

  const offline = state.blocked === 'offline';
  const loading = chat.loading;
  const autoFocus = Boolean(params?.focusInput);
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

  // A photo waiting in the composer goes with the message.
  const sendNow = () => {
    const attached = photo.attachment;
    if (attached?.status === 'uploading') {
      return;
    }
    if (attached?.status === 'ready' && attached.path) {
      chat.send(chat.draft, undefined, { uri: attached.uri, path: attached.path });
      photo.clear();
      return;
    }
    chat.send(chat.draft);
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
    if (message.kind === 'meal') {
      return (
        <MealCard
          key={message.id}
          card={message}
          language={language}
          onEdit={() =>
            navigation.navigate(APP_ROUTES.MealReview, {
              draft: draftFromAnalysis(message.meal, new Date()),
              source: 'chat',
              chatMessageId: message.id,
            })
          }
          onOpenDay={() => navigation.navigate(APP_ROUTES.NutritionPlan)}
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
          imageUri={message.imageUri}
          imagePath={message.imagePath}
          onRetry={
            message.failure && !isRetryable(message.failure.code)
              ? undefined
              : () => chat.retry(message.id)
          }
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
              {chat.historyFailed ? (
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

        {photo.attachment ? (
          <View style={[styles.attachment, { paddingHorizontal: layout.gutter }]}>
            <View style={[styles.attachThumb, { backgroundColor: colors.surface.muted }]}>
              <Image source={{ uri: photo.attachment.uri }} style={styles.attachImage} resizeMode="cover" />
              {photo.attachment.status === 'uploading' ? <View style={styles.attachVeil} /> : null}
            </View>
            {photo.attachment.status === 'failed' ? (
              <PressableScale accessibilityRole="button" onPress={() => { photo.retry().catch(() => undefined); }} style={styles.attachRetry}>
                <RefreshCw size={14} color={colors.ember.deep} strokeWidth={2.2} />
                <TextV2 variant="metaStrong" color={colors.ember.deep}>
                  {language === 'es' ? 'No se subió · Reintentar' : "Didn't upload · Retry"}
                </TextV2>
              </PressableScale>
            ) : (
              <TextV2 variant="meta" tone="secondary" style={styles.flex}>
                {photo.attachment.status === 'uploading'
                  ? language === 'es' ? 'Subiendo foto…' : 'Uploading photo…'
                  : language === 'es' ? 'Foto lista' : 'Photo ready'}
              </TextV2>
            )}
            <PressableScale accessibilityRole="button" accessibilityLabel={language === 'es' ? 'Quitar foto' : 'Remove photo'} onPress={photo.clear} style={styles.attachClose}>
              <X size={16} color={colors.text.secondary} strokeWidth={2.2} />
            </PressableScale>
          </View>
        ) : null}
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
            onSend={sendNow}
            canSend={chat.composer.canSend || (photo.attachment?.status === 'ready' && !chat.state.thinking && !chat.composer.disabled)}
            disabled={chat.composer.disabled}
            autoFocus={autoFocus}
            haloState={state.thinking ? 'thinking' : 'idle'}
            onVoice={() => navigation.navigate(APP_ROUTES.EllieVoice)}
            onPhoto={() => setPhotoMenu(true)}
          />
        </View>
      </KeyboardAvoidingView>

      <PhotoSourceSheet
        open={photoMenu}
        onClose={() => setPhotoMenu(false)}
        onPicked={picked => {
          photo.attach(picked).catch(() => undefined);
        }}
        language={language}
      />

      <Sheet open={menu} onClose={() => setMenu(false)} title="ELLIE">
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            chat.newConversation();
          }}
          style={styles.menuRow}
        >
          <MessageSquarePlus size={20} color={colors.text.primary} strokeWidth={1.8} />
          <TextV2 variant="cta">Nueva conversación</TextV2>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            setTimeout(() => setListOpen(true), 350);
          }}
          style={styles.menuRow}
        >
          <MoreHorizontal size={20} color={colors.text.primary} strokeWidth={1.8} />
          <TextV2 variant="cta">Conversaciones</TextV2>
        </PressableScale>
      </Sheet>

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Conversaciones" scrollable>
        {conversations.isLoading ? (
          <SkeletonGroup>
            <View style={styles.skeleton}>
              <Skeleton height={20} width="80%" />
              <Skeleton height={20} width="60%" />
            </View>
          </SkeletonGroup>
        ) : conversations.isError ? (
          <PressableScale accessibilityRole="button" onPress={() => conversations.refetch()}>
            <TextV2 variant="meta" color={colors.text.secondary}>
              No pudimos cargar tus conversaciones ·{' '}
              <TextV2 variant="metaStrong">Reintentar</TextV2>
            </TextV2>
          </PressableScale>
        ) : (conversations.data ?? []).length === 0 ? (
          <TextV2 variant="body" color={colors.text.secondary}>
            Aún no tienes conversaciones.
          </TextV2>
        ) : (
          (conversations.data ?? []).map(item => (
            <View key={item.id} style={styles.convRow}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={item.title || 'Conversación'}
                onPress={() => {
                  setListOpen(false);
                  chat.openConversation(item.id);
                }}
                style={styles.flex}
              >
                <TextV2
                  variant="bodyStrong"
                  numberOfLines={1}
                  color={item.id === chat.conversationId ? colors.ember.strong : undefined}
                >
                  {item.title || 'Conversación'}
                </TextV2>
                <TextV2 variant="caption" color={colors.text.secondary}>
                  {relativeWhen(item.updatedAt, new Date())}
                </TextV2>
              </PressableScale>
              <IconButton
                icon={Trash2}
                variant="muted"
                accessibilityLabel="Borrar conversación"
                onPress={() => {
                  setListOpen(false);
                  setTimeout(() => setPendingDelete(item.id), 350);
                }}
              />
            </View>
          ))
        )}
      </Sheet>

      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="¿Borrar esta conversación?"
        footer={
          <Button
            label="Borrar"
            onPress={async () => {
              const id = pendingDelete;
              setPendingDelete(null);
              if (!id) {
                return;
              }
              try {
                await deleteConversation.mutateAsync(id);
                if (id === chat.conversationId) {
                  chat.newConversation();
                }
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
          Se borra la conversación con todos sus mensajes y no se puede recuperar.
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
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  attachThumb: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  attachImage: { width: 56, height: 56 },
  attachVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,13,12,.45)' },
  attachRetry: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  attachClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
});
