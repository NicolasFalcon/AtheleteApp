import { useState } from 'react';
import { ArrowLeft, Star, Check, MessageCircle, Calendar, Dumbbell, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Coach } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';

interface CoachProfileScreenProps {
  coach: Coach;
  onBack: () => void;
  onOpenChat: () => void;
}

export function CoachProfileScreen({ coach, onBack, onOpenChat }: CoachProfileScreenProps) {
  const { assignedCoach, assignCoach } = useApp();
  const [hasAssigned, setHasAssigned] = useState(assignedCoach?.id === coach.id);

  const handleWorkWithCoach = () => {
    assignCoach(coach);
    setHasAssigned(true);
  };

  return (
    <div className="animate-fade-in pb-32">
      <div className="relative h-64">
        <img src={coach.avatar} alt={coach.name} className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border/60">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="px-4 -mt-16 relative z-10">
        <div className="card-elevated p-4">
          <h1 className="text-2xl font-bold text-foreground">{coach.name}</h1>
          <p className="text-muted-foreground">{coach.specialty}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-foreground text-foreground" />
              <span className="font-semibold text-foreground">{coach.rating}</span>
              <span className="text-sm text-muted-foreground">({coach.reviewCount})</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {coach.yearsExperience} años de experiencia
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {coach.tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">{tag}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{coach.bio}</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="card-elevated p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Lo que obtienes</h2>
          <div className="space-y-3">
            {coach.whatYouGet.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary flex-shrink-0">
                  <Check className="h-4 w-4 text-foreground" />
                </div>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell className="h-5 w-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Plan de entreno de ejemplo</h2>
          </div>
          <div className="space-y-2">
            {coach.sampleWorkoutPlan.map((day, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{day.day}</p>
                  <p className="text-xs text-muted-foreground">{day.workout}</p>
                </div>
                <span className="text-xs text-muted-foreground">{day.focus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Ejemplo de día de comidas</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Desayuno</p>
              <p className="text-sm text-foreground">{coach.sampleMealPlan.breakfast}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Almuerzo</p>
              <p className="text-sm text-foreground">{coach.sampleMealPlan.lunch}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Cena</p>
              <p className="text-sm text-foreground">{coach.sampleMealPlan.dinner}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Snacks</p>
              <p className="text-sm text-foreground">{coach.sampleMealPlan.snacks}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
        {hasAssigned ? (
          <Button onClick={onOpenChat} className="w-full rounded-full" size="lg">
            <MessageCircle className="mr-2 h-5 w-5" />
            Abrir chat
          </Button>
        ) : (
          <Button onClick={handleWorkWithCoach} className="w-full rounded-full" size="lg">
            Entrenar con este coach
          </Button>
        )}
      </div>
    </div>
  );
}