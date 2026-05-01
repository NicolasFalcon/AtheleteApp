import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Sparkles, Dumbbell, UtensilsCrossed, BookOpen, Target, Heart, TrendingUp, Calendar, Trophy, Loader2, Trash2, Zap, Check, X, RefreshCw, Droplets, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEllieContext } from '@/hooks/useEllieContext';
import { generateSmartInsights, generateSmartRecommendations, generateProactiveNudges, EllieSmartRecommendation, EllieActionType, ellieQuickChips } from '@/lib/ellieEngine';
import { generateWeeklySummary } from '@/lib/ellie';
import { callEllieChat, generateWithEllie, ChatMessage, EllieGenerationResult } from '@/lib/ellieChat';
import { saveEllieWorkout, saveEllieNutritionPlan, EllieGeneratedWorkout, EllieGeneratedNutritionPlan } from '@/lib/ellieActions';
import { getWorkoutThumbnail } from '@/lib/workoutThumbnails';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useGamification } from '@/contexts/GamificationContext';
import { WorkoutThumbnailImage } from '@/components/workouts/WorkoutThumbnailImage';

const iconMap: Record<string, any> = {
  dumbbell: Dumbbell, utensils: UtensilsCrossed, book: BookOpen, target: Target,
  sparkles: Sparkles, heart: Heart, 'trending-up': TrendingUp, trophy: Trophy, zap: Zap, droplets: Droplets,
};

interface EllieScreenProps {
  onBack: () => void;
  onStartWorkout: () => void;
  onLogNutrition: () => void;
  onViewChallenge: () => void;
  onViewArticle: (articleId: string) => void;
  onGenerateWorkout?: () => void;
  onGenerateNutrition?: () => void;
}

export function EllieScreen({ onBack, onStartWorkout, onLogNutrition, onViewChallenge, onViewArticle }: EllieScreenProps) {
  const { user, workoutSessions, dailyNutritionLogs, challenge, getChallengeDay, getCompletedDays } = useApp();
  const { context, serialized } = useEllieContext();
  const { gamification: gamState } = useGamification();
  const [activeSection, setActiveSection] = useState<'insights' | 'chat'>('insights');
  const [chatPrefill, setChatPrefill] = useState<{ id: number; prompt: string } | null>(null);

  const insights = generateSmartInsights(context);
  const recommendations = generateSmartRecommendations(context);
  const nudges = generateProactiveNudges(context);
  const heroInsight = insights[0];
  const secondaryInsights = insights.slice(1, 4);
  const promptSuggestions = recommendations.slice(0, 4);
  const weeklySummary = generateWeeklySummary({
    workoutSessions,
    trainingDaysPerWeek: user.trainingDaysPerWeek,
    dailyNutritionLogs,
    challenge,
    challengeDay: getChallengeDay(),
    completedDays: getCompletedDays(),
    points: gamState.points,
  });

  const openChatWithPrompt = useCallback((prompt: string) => {
    setActiveSection('chat');
    setChatPrefill({ id: Date.now(), prompt });
  }, []);

  const handleRecAction = (rec: EllieSmartRecommendation | { action: EllieActionType; [k: string]: any }) => {
    switch (rec.action) {
      case 'start_workout': onStartWorkout(); break;
      case 'log_nutrition': onLogNutrition(); break;
      case 'view_challenge': onViewChallenge(); break;
      case 'log_hydration': onBack(); break; // Go back to home where hydration card is
      case 'read_article': if ('articleId' in rec && rec.articleId) onViewArticle(rec.articleId); break;
      case 'generate_workout':
      case 'generate_nutrition':
      case 'ask_ellie':
      case 'view_progress':
        setActiveSection('chat');
        break;
    }
  };

  return (
    <div className="app-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 pb-3 pt-3 backdrop-blur-md safe-area-pt">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">ELLIE</h1>
            <p className="text-xs text-muted-foreground">Tu coach IA de fitness</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-2 px-4">
        <div className="flex gap-2 rounded-xl bg-secondary p-1">
          <button onClick={() => setActiveSection('insights')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeSection === 'insights' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
            Análisis
          </button>
          <button onClick={() => setActiveSection('chat')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeSection === 'chat' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
            Habla con ELLIE
          </button>
        </div>
      </div>

      {activeSection === 'insights' ? (
        <div className="mt-4 space-y-4 px-4 pb-4">
          <div className="card-elevated relative overflow-hidden p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Briefing de hoy
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {heroInsight?.text || 'ELLIE ya revisó tus datos y tiene prioridades claras para hoy.'}
                  </h3>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    En foco
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {promptSuggestions.length} acciones
                  </p>
                </div>
              </div>

              {secondaryInsights.length > 0 && (
                <div className="mt-4 space-y-2">
                  {secondaryInsights.map((insight) => (
                    <div key={insight.id} className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      <p className="flex-1 text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {promptSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Empieza con una pregunta útil</h3>
                  <p className="text-xs text-muted-foreground">ELLIE la dejará escrita en el chat para que la revises antes de enviar.</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {promptSuggestions.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => openChatWithPrompt(rec.prompt)}
                    className="flex-shrink-0 rounded-full border border-border/70 bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {rec.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Proactive nudges */}
          {nudges.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3">Prioridades ahora</h3>
              <div className="space-y-2">
                {nudges.map(nudge => {
                  const NudgeIcon = iconMap[nudge.icon] || Sparkles;
                  const toneColor = nudge.tone === 'positive' ? 'bg-success/10' : nudge.tone === 'encouragement' ? 'bg-warning/10' : 'bg-primary/10';
                  const toneTextColor = nudge.tone === 'positive' ? 'text-success' : nudge.tone === 'encouragement' ? 'text-warning' : 'text-primary';
                  const hasAction = !!nudge.action && !!nudge.actionLabel;
                  return (
                    <button
                      key={nudge.id}
                      onClick={() => { if (nudge.action) handleRecAction({ action: nudge.action as any, id: nudge.id, icon: nudge.icon as any, title: '', description: '', actionLabel: '' }); }}
                      disabled={!hasAction}
                      className="w-full flex items-center gap-3 rounded-xl p-3 text-left card-elevated disabled:cursor-default"
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${toneColor}`}>
                        <NudgeIcon className={`h-4 w-4 ${toneTextColor}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-foreground leading-snug">{nudge.text}</p>
                        {hasAction && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Acción rápida</p>
                        )}
                      </div>
                      {hasAction && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] font-medium text-primary">{nudge.actionLabel}</span>
                          <ChevronRight className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <div className="mb-3">
              <h3 className="font-semibold text-foreground text-sm">Pídele a ELLIE que actúe</h3>
              <p className="mt-1 text-xs text-muted-foreground">Sugerencias más directas, en contexto y listas para abrir en chat.</p>
            </div>
            <div className="space-y-2">
              {recommendations.map(rec => {
                const Icon = iconMap[rec.icon] || Sparkles;
                return (
                  <button
                    key={rec.id}
                    onClick={() => openChatWithPrompt(rec.prompt)}
                    className="card-elevated w-full p-3.5 text-left transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                        <p className="mt-2 text-[11px] font-medium text-primary">
                          {rec.prompt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground">
                        Abrir en chat
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekly summary */}
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Resumen semanal</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Entrenos</span>
                <span className="text-sm font-medium text-foreground">{weeklySummary.workoutsCompleted} / {weeklySummary.workoutsGoal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Adherencia nutricional</span>
                <span className="text-sm font-medium text-foreground">{weeklySummary.nutritionAdherence}%</span>
              </div>
              {weeklySummary.challengeProgress && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Reto</span>
                  <span className="text-sm font-medium text-foreground">{weeklySummary.challengeProgress}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Puntos ganados</span>
                <span className="text-sm font-medium text-foreground">{weeklySummary.pointsEarned}</span>
              </div>
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs text-primary font-medium">{weeklySummary.suggestion}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full rounded-full"
                onClick={() => openChatWithPrompt(`Analiza mi progreso de esta semana. ${weeklySummary.suggestion}`)}
              >
                Ver lectura semanal en chat
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EllieChatSection serializedContext={serialized} userName={user.name} prefillRequest={chatPrefill} />
      )}
    </div>
  );
}

// ─── Chat Section ─────────────────────────────────────────────────────────────

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'workout_preview' | 'nutrition_preview';
  workoutData?: EllieGeneratedWorkout;
  nutritionData?: EllieGeneratedNutritionPlan;
  saved?: boolean;
  discarded?: boolean;
  /** Messages context at the time of generation — used for regeneration */
  generationMessages?: ChatMessage[];
}

function EllieChatSection({ serializedContext, userName, prefillRequest }: { serializedContext: string; userName: string; prefillRequest: { id: number; prompt: string } | null }) {
  const { refreshWorkouts, setNutritionPlan } = useApp();
  const { awardPoints, unlockBadge } = useGamification();
  const { user: authUser } = useAuth();
  const userId = authUser?.id;

  const welcomeMessage: DisplayMessage = {
    role: 'assistant',
    content: `¡Hola${userName ? ` ${userName}` : ''}! Soy **ELLIE**, tu coach fitness con IA.\n\nPuedo ayudarte a:\n- 🏋️ Generar rutinas personalizadas\n- 🥗 Crear tu plan de nutrición\n- 📊 Analizar tu progreso\n- 💡 Darte recomendaciones basadas en tus datos\n\n¿En qué te ayudo hoy?`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([welcomeMessage]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef('');

  // Load chat history
  useEffect(() => {
    if (!userId) { setDbLoading(false); return; }
    const load = async () => {
      const { data, error } = await supabase.from('chat_messages').select('role, content').eq('user_id', userId).order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        const loaded = (data as any[]).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
        setMessages(loaded);
        setDisplayMessages([welcomeMessage, ...loaded.map(m => ({ ...m } as DisplayMessage))]);
      }
      setDbLoading(false);
    };
    load();
  }, [userId]);

  const saveMessageToDb = useCallback(async (msg: ChatMessage) => {
    if (!userId) return;
    await supabase.from('chat_messages').insert({ user_id: userId, role: msg.role, content: msg.content } as any);
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [displayMessages]);

  useEffect(() => {
    draftRef.current = newMessage;
  }, [newMessage]);

  const prefillMessage = useCallback((prompt: string) => {
    const currentDraft = draftRef.current.trim();
    if (currentDraft && currentDraft !== prompt) {
      setSavedDraft(currentDraft);
    }
    setNewMessage(prompt);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(prompt.length, prompt.length);
    });
  }, []);

  useEffect(() => {
    if (!prefillRequest?.prompt) return;
    prefillMessage(prefillRequest.prompt);
  }, [prefillMessage, prefillRequest?.id, prefillRequest?.prompt]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || newMessage.trim();
    if (!msg || isLoading || isGenerating) return;
    const userMsg: ChatMessage = { role: 'user', content: msg };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setDisplayMessages(prev => [...prev, { role: 'user', content: msg }]);
    setNewMessage('');
    saveMessageToDb(userMsg);

    // Let the AI decide whether to use tool-calling or respond with text
    setIsLoading(true);
    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setDisplayMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    await callEllieChat({
      messages: updatedMessages,
      userContext: serializedContext,
      onDelta: upsertAssistant,
      onDone: () => {
        setIsLoading(false);
        if (assistantSoFar) {
          const assistantMsg: ChatMessage = { role: 'assistant', content: assistantSoFar };
          setMessages(prev => [...prev, assistantMsg]);
          saveMessageToDb(assistantMsg);
        }
      },
      onToolResult: (result) => {
        setIsLoading(false);
        handleToolResult(result, updatedMessages);
      },
      onError: (error) => {
        setIsLoading(false);
        toast({ title: 'ELLIE no disponible', description: error, variant: 'destructive' });
        setDisplayMessages(prev => [...prev, { role: 'assistant', content: 'Estoy teniendo problemas de conexión. Intenta de nuevo en un momento.' }]);
      },
    });
  }, [newMessage, messages, isLoading, isGenerating, serializedContext]);

  const handleToolResult = (result: EllieGenerationResult, contextMessages?: ChatMessage[]) => {
    if (result.type === 'generate_workout_plan') {
      const d = result.data as any;
      const introMessage = d.intro_message || '';
      const mapped: EllieGeneratedWorkout = {
        title: d.title,
        description: d.description,
        type: d.type || 'strength',
        difficulty: d.difficulty || 'intermediate',
        duration: d.duration || 30,
        calories: d.calories || 200,
        targetMuscles: d.targetMuscles || d.target_muscles || [],
        exercises: (d.exercises || []).map((ex: any) => ({
          name: ex.name,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          rest_time: ex.rest_time || 60,
          notes: ex.notes,
        })),
      };

      setDisplayMessages(prev => {
        const newMessages = [...prev];
        const last = newMessages[newMessages.length - 1];
        if (last?.role === 'assistant' && (last.content.includes('Generando') || last.content === '')) {
          newMessages.pop();
        }
        if (introMessage) {
          newMessages.push({ role: 'assistant', content: introMessage });
        }
        newMessages.push({
          role: 'assistant',
          content: '',
          type: 'workout_preview',
          workoutData: mapped,
          saved: false,
          generationMessages: contextMessages,
        });
        return newMessages;
      });

      const summary = introMessage || `He generado la rutina "${mapped.title}" con ${mapped.exercises.length} ejercicios.`;
      const assistantMsg: ChatMessage = { role: 'assistant', content: summary };
      setMessages(prev => [...prev, assistantMsg]);
      saveMessageToDb(assistantMsg);
    } else if (result.type === 'generate_nutrition_plan') {
      const d = result.data as any;
      const introMessage = d.intro_message || '';
      const mapped: EllieGeneratedNutritionPlan = {
        targetCalories: d.target_calories || d.targetCalories || 2000,
        targetProtein: d.target_protein || d.targetProtein || 120,
        targetCarbs: d.target_carbs || d.targetCarbs || 250,
        targetFats: d.target_fats || d.targetFats || 65,
        notes: d.notes,
      };

      setDisplayMessages(prev => {
        const newMessages = [...prev];
        const last = newMessages[newMessages.length - 1];
        if (last?.role === 'assistant' && (last.content.includes('Generando') || last.content === '')) {
          newMessages.pop();
        }
        if (introMessage) {
          newMessages.push({ role: 'assistant', content: introMessage });
        }
        newMessages.push({
          role: 'assistant',
          content: '',
          type: 'nutrition_preview',
          nutritionData: mapped,
          saved: false,
          generationMessages: contextMessages,
        });
        return newMessages;
      });

      const summary = introMessage || `He generado tu plan de nutrición: ${mapped.targetCalories} kcal/día.`;
      const assistantMsg: ChatMessage = { role: 'assistant', content: summary };
      setMessages(prev => [...prev, assistantMsg]);
      saveMessageToDb(assistantMsg);
    } else {
      const text = (result.data as any).content || 'No pude generar el plan. Intenta de nuevo.';
      setDisplayMessages(prev => {
        const newMessages = [...prev];
        const last = newMessages[newMessages.length - 1];
        if (last?.role === 'assistant' && (last.content.includes('Generando') || last.content === '')) {
          newMessages.pop();
        }
        newMessages.push({ role: 'assistant', content: text });
        return newMessages;
      });
    }
  };

  const handleRegenerate = async (idx: number) => {
    const msg = displayMessages[idx];
    if (!msg?.generationMessages || isLoading || isGenerating) return;

    const isWorkout = msg.type === 'workout_preview';

    // Replace current preview card with loading state
    setDisplayMessages(prev => {
      const updated = [...prev];
      updated[idx] = {
        role: 'assistant',
          content: isWorkout ? '🏋️ Generando otra versión...' : '🥗 Generando otra versión...',
      };
      return updated;
    });

    // Add a regeneration hint so ELLIE varies the output
    const regenMessages: ChatMessage[] = [
      ...msg.generationMessages,
      { role: 'assistant', content: `Ya generé una versión anterior llamada "${isWorkout ? msg.workoutData?.title : 'plan anterior'}". El usuario quiere otra variante diferente.` },
      { role: 'user', content: 'Genérame otra versión diferente, con otros ejercicios o estructura.' },
    ];

    setIsGenerating(true);
    try {
      const result = await generateWithEllie({
        messages: regenMessages,
        userContext: serializedContext,
        mode: isWorkout ? 'generate_workout' : 'generate_nutrition',
      });

      // Replace the loading message at idx with the new card
      const d = result.data as any;
      const introMessage = d.intro_message || '';

      if (isWorkout && result.type === 'generate_workout_plan') {
        const mapped: EllieGeneratedWorkout = {
          title: d.title,
          description: d.description,
          type: d.type || 'strength',
          difficulty: d.difficulty || 'intermediate',
          duration: d.duration || 30,
          calories: d.calories || 200,
          targetMuscles: d.targetMuscles || d.target_muscles || [],
          exercises: (d.exercises || []).map((ex: any) => ({
            name: ex.name,
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            duration: ex.duration,
            rest_time: ex.rest_time || 60,
            notes: ex.notes,
          })),
        };
        setDisplayMessages(prev => {
          const updated = [...prev];
          if (introMessage) {
            updated[idx] = { role: 'assistant', content: introMessage };
            updated.splice(idx + 1, 0, {
              role: 'assistant',
              content: '',
              type: 'workout_preview',
              workoutData: mapped,
              saved: false,
              generationMessages: msg.generationMessages,
            });
          } else {
            updated[idx] = {
              role: 'assistant',
              content: '',
              type: 'workout_preview',
              workoutData: mapped,
              saved: false,
              generationMessages: msg.generationMessages,
            };
          }
          return updated;
        });
      } else if (!isWorkout && result.type === 'generate_nutrition_plan') {
        const mapped: EllieGeneratedNutritionPlan = {
          targetCalories: d.target_calories || d.targetCalories || 2000,
          targetProtein: d.target_protein || d.targetProtein || 120,
          targetCarbs: d.target_carbs || d.targetCarbs || 250,
          targetFats: d.target_fats || d.targetFats || 65,
          notes: d.notes,
        };
        setDisplayMessages(prev => {
          const updated = [...prev];
          if (introMessage) {
            updated[idx] = { role: 'assistant', content: introMessage };
            updated.splice(idx + 1, 0, {
              role: 'assistant',
              content: '',
              type: 'nutrition_preview',
              nutritionData: mapped,
              saved: false,
              generationMessages: msg.generationMessages,
            });
          } else {
            updated[idx] = {
              role: 'assistant',
              content: '',
              type: 'nutrition_preview',
              nutritionData: mapped,
              saved: false,
              generationMessages: msg.generationMessages,
            };
          }
          return updated;
        });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error al regenerar';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
      setDisplayMessages(prev => {
        const updated = [...prev];
        updated[idx] = { role: 'assistant', content: 'No pude generar otra versión. Intenta de nuevo.' };
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneration = async (msgs: ChatMessage[], mode: 'generate_workout' | 'generate_nutrition') => {
    setIsGenerating(true);
    setDisplayMessages(prev => [...prev, {
      role: 'assistant',
      content: mode === 'generate_workout' ? '🏋️ Generando tu rutina personalizada...' : '🥗 Generando tu plan de nutrición...',
    }]);

    try {
      const result = await generateWithEllie({ messages: msgs, userContext: serializedContext, mode });
      handleToolResult(result as EllieGenerationResult, msgs);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error al generar';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
      setDisplayMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'No pude generar el plan. Intenta de nuevo.' };
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveWorkout = async (idx: number) => {
    const msg = displayMessages[idx];
    if (!msg?.workoutData || !userId) return;
    const result = await saveEllieWorkout(userId, msg.workoutData);
    if (result.success) {
      toast({ title: '✅ Rutina guardada', description: `"${msg.workoutData.title}" se añadió a tus entrenos.` });
      setDisplayMessages(prev => prev.map((m, i) => i === idx ? { ...m, saved: true } : m));
      awardPoints('custom_workout_created');
      unlockBadge('first_custom_workout');
      // Refresh workouts list so the new routine appears immediately
      await refreshWorkouts();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleSaveNutrition = async (idx: number) => {
    const msg = displayMessages[idx];
    if (!msg?.nutritionData || !userId) return;
    const result = await saveEllieNutritionPlan(userId, msg.nutritionData);
    if (result.success) {
      toast({ title: '✅ Plan guardado', description: 'Tu plan de nutrición ha sido activado.' });
      setDisplayMessages(prev => prev.map((m, i) => i === idx ? { ...m, saved: true } : m));
      setNutritionPlan({
        id: result.planId!,
        userId,
        targetCalories: msg.nutritionData.targetCalories,
        targetProtein: msg.nutritionData.targetProtein,
        targetCarbs: msg.nutritionData.targetCarbs,
        targetFats: msg.nutritionData.targetFats,
        notes: msg.nutritionData.notes,
      });
      awardPoints('nutrition_plan_activated');
      unlockBadge('nutrition_started');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleDiscardWorkout = (idx: number) => {
    setDisplayMessages(prev => prev.map((m, i) => i === idx ? { ...m, discarded: true } : m));
    toast({ title: 'Rutina descartada', description: 'Puedo generar otra cuando quieras.' });
  };

  const handleDiscardNutrition = (idx: number) => {
    setDisplayMessages(prev => prev.map((m, i) => i === idx ? { ...m, discarded: true } : m));
    toast({ title: 'Plan descartado', description: 'Puedo crear otro cuando quieras.' });
  };

  const handleClearChat = useCallback(async () => {
    if (!userId) return;
    setMessages([]);
    setDisplayMessages([welcomeMessage]);
    await supabase.from('chat_messages').delete().eq('user_id', userId);
  }, [welcomeMessage, userId]);

  if (dbLoading) {
    return (
      <div className="flex items-center justify-center mt-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 hide-scrollbar">
        {messages.length > 0 && (
          <button onClick={handleClearChat} disabled={isLoading || isGenerating} className="flex-shrink-0 px-3 py-1.5 rounded-full bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center gap-1">
            <Trash2 className="h-3 w-3" />Borrar
          </button>
        )}
        {ellieQuickChips.map((chip) => (
          <button key={chip.label} onClick={() => prefillMessage(chip.prompt)} disabled={isLoading || isGenerating} className="flex-shrink-0 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50">
            {chip.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
        {displayMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'workout_preview' && msg.workoutData ? (
              msg.discarded ? (
                <div className="w-full max-w-[85%] bg-card rounded-2xl rounded-bl-md border border-border/60 px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">ELLIE</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Rutina descartada. Puedo generar otra si quieres. 💪</p>
                </div>
              ) : (
                <WorkoutPreviewCard workout={msg.workoutData} saved={!!msg.saved} onSave={() => handleSaveWorkout(idx)} onDiscard={() => handleDiscardWorkout(idx)} onRegenerate={() => handleRegenerate(idx)} isRegenerating={isGenerating} />
              )
            ) : msg.type === 'nutrition_preview' && msg.nutritionData ? (
              msg.discarded ? (
                <div className="w-full max-w-[85%] bg-card rounded-2xl rounded-bl-md border border-border/60 px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">ELLIE</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Plan descartado. Puedo crear otro si quieres. 🥗</p>
                </div>
              ) : (
                <NutritionPreviewCard plan={msg.nutritionData} saved={!!msg.saved} onSave={() => handleSaveNutrition(idx)} onDiscard={() => handleDiscardNutrition(idx)} onRegenerate={() => handleRegenerate(idx)} isRegenerating={isGenerating} />
              )
            ) : (
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-popover text-foreground rounded-br-md' : 'bg-card text-foreground rounded-bl-md border border-border/60'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">ELLIE</span>
                  </div>
                )}
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}
        {(isLoading || isGenerating) && displayMessages[displayMessages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-card rounded-2xl rounded-bl-md border border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{isGenerating ? 'ELLIE está generando...' : 'ELLIE está pensando...'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/95 px-3 pt-2 backdrop-blur-md safe-area-pb">
        {savedDraft && savedDraft !== newMessage && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground">Borrador anterior guardado</p>
              <p className="truncate text-[11px] text-muted-foreground">{savedDraft}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewMessage(savedDraft);
                  setSavedDraft(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="text-[11px] font-medium text-primary"
              >
                Restaurar
              </button>
              <button
                onClick={() => setSavedDraft(null)}
                className="text-[11px] text-muted-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input ref={inputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Pregúntale a ELLIE..." className="flex-1 bg-secondary border-0 rounded-full h-10 text-sm" disabled={isLoading || isGenerating} />
          <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isLoading || isGenerating} className="flex-shrink-0 rounded-full h-10 w-10">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Cards ────────────────────────────────────────────────────────────

function WorkoutPreviewCard({ workout, saved, onSave, onDiscard, onRegenerate, isRegenerating }: { workout: EllieGeneratedWorkout; saved: boolean; onSave: () => void; onDiscard: () => void; onRegenerate: () => void; isRegenerating: boolean }) {
  const thumbnail = getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title);
  return (
    <div className="w-full max-w-[90%] card-elevated border border-primary/20 rounded-2xl overflow-hidden">
      <div className="relative h-32 w-full">
        <WorkoutThumbnailImage
          src={thumbnail}
          title={workout.title}
          type={workout.type}
          targetMuscles={workout.targetMuscles}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold text-primary drop-shadow-sm">GENERADO POR ELLIE</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-bold text-foreground text-base">{workout.title}</h4>
          {workout.description && <p className="text-xs text-muted-foreground mt-0.5">{workout.description}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">{workout.type}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">{workout.difficulty}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">{workout.duration} min</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">~{workout.calories} kcal</span>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Ejercicios ({workout.exercises.length})</p>
          {workout.exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{ex.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration ? `${ex.duration}s` : ''}
                  {ex.rest_time ? ` · ${ex.rest_time}s descanso` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
        {saved ? (
          <div className="flex items-center gap-2 text-primary text-xs font-medium pt-1">
            <Check className="h-4 w-4" />
            Guardada en tus entrenos
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <Button onClick={onSave} size="sm" className="w-full rounded-full">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Guardar rutina
            </Button>
            <div className="flex gap-2">
              <Button onClick={onDiscard} size="sm" variant="outline" className="flex-1 rounded-full">
                <X className="mr-1 h-3.5 w-3.5" />
                Descartar
              </Button>
              <Button onClick={onRegenerate} size="sm" variant="outline" className="flex-1 rounded-full" disabled={isRegenerating}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Otra versión
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NutritionPreviewCard({ plan, saved, onSave, onDiscard, onRegenerate, isRegenerating }: { plan: EllieGeneratedNutritionPlan; saved: boolean; onSave: () => void; onDiscard: () => void; onRegenerate: () => void; isRegenerating: boolean }) {
  return (
    <div className="w-full max-w-[90%] card-elevated border border-primary/20 rounded-2xl overflow-hidden">
      <div className="bg-primary/10 px-4 py-3 flex items-center gap-2">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-primary">PLAN NUTRICIONAL POR ELLIE</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{plan.targetCalories}</p>
            <p className="text-[10px] text-muted-foreground">kcal/día</p>
          </div>
          <div className="bg-secondary/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">{plan.targetProtein}g</p>
            <p className="text-[10px] text-muted-foreground">Proteína</p>
          </div>
          <div className="bg-secondary/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{plan.targetCarbs}g</p>
            <p className="text-[10px] text-muted-foreground">Carbohidratos</p>
          </div>
          <div className="bg-secondary/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{plan.targetFats}g</p>
            <p className="text-[10px] text-muted-foreground">Grasas</p>
          </div>
        </div>
        {plan.notes && (
          <div className="bg-secondary/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{plan.notes}</p>
          </div>
        )}
        {saved ? (
          <div className="flex items-center gap-2 text-primary text-xs font-medium pt-1">
            <Check className="h-4 w-4" />
            Plan activado
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <Button onClick={onSave} size="sm" className="w-full rounded-full">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Activar plan
            </Button>
            <div className="flex gap-2">
              <Button onClick={onDiscard} size="sm" variant="outline" className="flex-1 rounded-full">
                <X className="mr-1 h-3.5 w-3.5" />
                Descartar
              </Button>
              <Button onClick={onRegenerate} size="sm" variant="outline" className="flex-1 rounded-full" disabled={isRegenerating}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Otra versión
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
