import { useState } from 'react';
import { ArrowLeft, Send, Paperclip, Play, Dumbbell, Utensils, Apple, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coach, ChatMessage } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useGamification } from '@/contexts/GamificationContext';
import { cn } from '@/lib/utils';

interface CoachChatScreenProps {
  coach: Coach;
  onBack: () => void;
}

export function CoachChatScreen({ coach, onBack }: CoachChatScreenProps) {
  const { chatMessages, addChatMessage, acceptNutritionPlanFromChat } = useApp();
  const { awardPoints, unlockBadge } = useGamification();
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    addChatMessage({ senderId: 'user', type: 'text', content: newMessage.trim() });
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <img src={coach.avatar} alt={coach.name} className="h-10 w-10 rounded-full object-cover grayscale" />
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{coach.name}</h2>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            <span className="text-xs text-muted-foreground">En línea</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onAcceptNutritionPlan={(msgId) => {
              acceptNutritionPlanFromChat(msgId);
              awardPoints('nutrition_plan_activated');
              unlockBadge('nutrition_started');
            }}
          />
        ))}
      </div>

      <div className="p-4 border-t border-border bg-card safe-area-pb">
        <div className="flex items-center gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary flex-shrink-0">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-secondary border-0 rounded-full"
          />
          <Button onClick={handleSend} size="icon" disabled={!newMessage.trim()} className="flex-shrink-0 rounded-full">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onAcceptNutritionPlan: (messageId: string) => void;
}

function MessageBubble({ message, onAcceptNutritionPlan }: MessageBubbleProps) {
  const isUser = message.senderId === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5', isUser ? 'bg-foreground text-background rounded-br-md' : 'bg-card text-foreground rounded-bl-md border border-border/60')}>
        {message.type === 'text' && <p className="text-sm">{message.content}</p>}

        {message.type === 'workout' && message.workoutData && (
          <div className="space-y-2">
            <p className="text-sm">{message.content}</p>
            <div className="bg-secondary rounded-xl p-3 mt-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
                  <Dumbbell className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{message.workoutData.name}</p>
                  <p className="text-xs text-muted-foreground">{message.workoutData.duration} min</p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {message.type === 'meal' && message.mealData && (
          <div className="space-y-2">
            <p className="text-sm">{message.content}</p>
            <div className="bg-secondary rounded-xl p-3 mt-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
                  <Utensils className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{message.mealData.name}</p>
                  <p className="text-xs text-muted-foreground">{message.mealData.macros}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {message.type === 'nutrition_plan' && message.nutritionPlanData && (
          <NutritionPlanCard message={message} onAccept={() => onAcceptNutritionPlan(message.id)} />
        )}
      </div>
    </div>
  );
}

function NutritionPlanCard({ message, onAccept }: { message: ChatMessage; onAccept: () => void }) {
  const data = message.nutritionPlanData!;
  const accepted = message.nutritionPlanAccepted === true;

  const macros = [
    { label: 'Proteína', value: `${data.targetProtein}g` },
    ...(data.targetCarbs ? [{ label: 'Carbos', value: `${data.targetCarbs}g` }] : []),
    ...(data.targetFats ? [{ label: 'Grasas', value: `${data.targetFats}g` }] : []),
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm">{message.content}</p>
      <div className="bg-secondary rounded-xl p-3 mt-2 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
            <Apple className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Plan de nutrición</p>
            <p className="text-xs text-muted-foreground">{data.targetCalories} kcal / día</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {macros.map((m) => (
            <div key={m.label} className="bg-background/40 rounded-lg px-2 py-1.5 text-center">
              <p className="text-sm font-semibold text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        {data.notes && <p className="text-xs text-muted-foreground italic">"{data.notes}"</p>}
        {accepted ? (
          <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent-green/10">
            <Check className="h-4 w-4 text-accent-green" />
            <span className="text-xs font-medium text-accent-green">Plan activado</span>
          </div>
        ) : (
          <Button onClick={onAccept} size="sm" className="w-full rounded-lg">Aceptar plan</Button>
        )}
      </div>
    </div>
  );
}