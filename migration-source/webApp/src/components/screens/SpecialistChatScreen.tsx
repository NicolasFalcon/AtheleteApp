import { useState } from 'react';
import { ArrowLeft, Send, Paperclip, AlertTriangle, ClipboardList, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Specialist, SpecialistChatMessage } from '@/lib/types';
import { mockSpecialistChatMessages } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface SpecialistChatScreenProps {
  specialist: Specialist;
  onBack: () => void;
}

export function SpecialistChatScreen({ specialist, onBack }: SpecialistChatScreenProps) {
  const [messages, setMessages] = useState<SpecialistChatMessage[]>(mockSpecialistChatMessages);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: SpecialistChatMessage = {
      id: `sm${Date.now()}`,
      senderId: 'user',
      type: 'text',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
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
        <img src={specialist.avatar} alt={specialist.name} className="h-10 w-10 rounded-full object-cover grayscale" />
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{specialist.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Salud y rehabilitación</span>
            <span className="text-muted-foreground">·</span>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent-green" />
              <span className="text-xs text-muted-foreground">En línea</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <SpecialistMessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="px-4 py-2 bg-card/50 border-t border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Este chat no reemplaza una evaluación médica. Busca atención urgente si tienes síntomas graves.
          </p>
        </div>
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
            placeholder="Describe tus síntomas..."
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

function SpecialistMessageBubble({ message }: { message: SpecialistChatMessage }) {
  const isUser = message.senderId === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5', isUser ? 'bg-foreground text-background rounded-br-md' : 'bg-card text-foreground rounded-bl-md border border-border/60')}>
        {message.type === 'text' && <p className="text-sm">{message.content}</p>}

        {message.type === 'questions' && message.questionsData && (
          <div className="space-y-2">
            <p className="text-sm">{message.content}</p>
            <div className="bg-secondary rounded-xl p-3 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/50">
                  <ClipboardList className="h-4 w-4 text-foreground" />
                </div>
                <p className="font-medium text-sm">Preguntas pre-sesión</p>
              </div>
              <div className="space-y-1.5">
                {message.questionsData.map((q, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{i + 1}. {q}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {message.type === 'warmup' && message.warmupData && (
          <div className="space-y-2">
            <p className="text-sm">{message.content}</p>
            <div className="bg-secondary rounded-xl p-3 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/50">
                  <Activity className="h-4 w-4 text-foreground" />
                </div>
                <p className="font-medium text-sm">{message.warmupData.name}</p>
              </div>
              <div className="space-y-1">
                {message.warmupData.movements.map((m, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {m}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}