import { useState } from 'react';
import { Dumbbell, Target, UtensilsCrossed, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'workout' | 'challenge' | 'nutrition';
  title: string;
  description: string;
  date: string;
}

export function RegistryTab() {
  const { workoutSessions, dailyNutritionLogs } = useApp();

  const activityItems: ActivityItem[] = [
    ...workoutSessions.map(s => ({
      id: `ws-${s.id}`,
      type: 'workout' as const,
      title: s.completed ? 'Entreno completado' : 'Entreno registrado',
      description: `${s.duration} min · ${s.caloriesBurned} kcal`,
      date: new Date(s.date).toISOString(),
    })),
    ...dailyNutritionLogs.map(l => ({
      id: `nl-${l.id}`,
      type: 'nutrition' as const,
      title: 'Nutrición registrada',
      description: `${l.calories} kcal · ${l.protein}g proteínas`,
      date: new Date(l.date).toISOString(),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const typeIcons = {
    workout: Dumbbell,
    challenge: Target,
    nutrition: UtensilsCrossed,
  };

  const typeColors = {
    workout: 'bg-primary/10 text-primary',
    challenge: 'bg-secondary text-foreground',
    nutrition: 'bg-secondary text-foreground',
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between px-4 page-safe-top">
        <h1 className="text-2xl font-bold text-foreground">Registro</h1>
      </div>

      <div className="mt-4 space-y-3 px-4">
        {activityItems.map((log) => {
          const Icon = typeIcons[log.type];
          let dateFormatted = '';
          try {
            dateFormatted = format(new Date(log.date), "d MMM · HH:mm", { locale: es });
          } catch {
            dateFormatted = log.date;
          }

          return (
            <div
              key={log.id}
              className="card-elevated flex items-center gap-4 p-4"
            >
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                typeColors[log.type]
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{log.title}</h3>
                <p className="text-sm text-muted-foreground">{log.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">{dateFormatted}</span>
            </div>
          );
        })}

        {activityItems.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Dumbbell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">Sin actividad aún</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tus sesiones de entrenamiento y registros de nutrición aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
