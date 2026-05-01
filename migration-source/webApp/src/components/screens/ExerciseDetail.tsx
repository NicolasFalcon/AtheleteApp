import { ArrowLeft, Play, Plus, RefreshCw, ChevronRight, Heart, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { LibraryExercise, equipmentLabels, bodyPartLabels, levelLabels } from '@/hooks/useExercises';
import { useState } from 'react';
import { ExerciseVideoModal } from './ExerciseVideoModal';
import { bodyScienceArticles } from '@/lib/bodyScienceData';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { PRSummaryCard } from '@/components/pr/PRSummaryCard';
import { RegisterPRSheet } from '@/components/pr/RegisterPRSheet';

interface ExerciseDetailProps {
  exercise: LibraryExercise;
  onBack: () => void;
  onNavigateToRoutine?: (routineName: string) => void;
  onNavigateToArticle?: (articleId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onViewPRHistory?: (exerciseId: string) => void;
}

const mockRoutines = [
  { id: 'r1', name: 'Full Body Power' },
  { id: 'r2', name: 'Fuerza tren superior' },
  { id: 'r3', name: 'Día de piernas' },
  { id: 'r4', name: 'HIIT Cardio' },
  { id: 'r5', name: 'Core y movilidad' },
];

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5", className)}>
      <h2 className="text-base font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

export function ExerciseDetail({ exercise, onBack, onNavigateToRoutine, onNavigateToArticle, isFavorite, onToggleFavorite, onViewPRHistory }: ExerciseDetailProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPRSheet, setShowPRSheet] = useState(false);
  const { records, addRecord } = usePersonalRecords(exercise.id);

  const hasVideo = !!exercise.videoUrl;

  return (
    <div className="animate-fade-in page-safe-bottom pb-40">
      {/* Hero image */}
      <div className="relative h-64">
        <img src={exercise.thumbnailUrl} alt={exercise.name} className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <button onClick={onBack} className="absolute left-4 top-safe-offset flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 backdrop-blur-sm">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        {onToggleFavorite && (
          <button onClick={onToggleFavorite} className="absolute right-4 top-safe-offset flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 backdrop-blur-sm transition-colors" aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
            <Heart className={cn('h-5 w-5 transition-colors', isFavorite ? 'fill-foreground text-foreground' : 'text-foreground')} />
          </button>
        )}

        {hasVideo ? (
          <button onClick={() => setShowVideoModal(true)} className="absolute bottom-6 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-foreground shadow-lg transition-transform active:scale-95" aria-label="Reproducir video de técnica">
            <Play className="h-5 w-5 text-background ml-0.5" />
          </button>
        ) : (
          <span className="absolute left-5 bottom-6 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Video próximamente
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 -mt-10 relative z-10 flex flex-col gap-3">
        {/* Summary card */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h1 className="text-2xl font-bold text-foreground leading-tight">{exercise.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip variant="default" size="sm">{equipmentLabels[exercise.equipment]}</Chip>
            <Chip variant="default" size="sm">{bodyPartLabels[exercise.bodyPart]}</Chip>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-muted-foreground">{levelLabels[exercise.level]}</span>
          </div>
        </div>

        {/* How to perform */}
        <SectionCard title="Cómo realizarlo">
          <ol className="space-y-3">
            {exercise.howToPerform.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground mt-0.5">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        {/* Coaching cues */}
        <SectionCard title="Puntos clave de técnica">
          <ul className="space-y-2.5">
            {exercise.coachingCues.map((cue, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="text-foreground mt-0.5 shrink-0">•</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Common mistakes */}
        <SectionCard title="Errores comunes">
          <ul className="space-y-2.5">
            {exercise.commonMistakes.map((mistake, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="text-destructive mt-0.5 shrink-0 text-xs">✕</span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Muscles worked */}
        <SectionCard title="Músculos trabajados">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Principales</p>
              <div className="flex flex-wrap gap-2">
                {exercise.musclesWorked.primary.map((muscle) => (
                  <span key={muscle} className="px-3 py-1.5 text-xs font-medium rounded-full bg-foreground text-background">{muscle}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Secundarios</p>
              <div className="flex flex-wrap gap-2">
                {exercise.musclesWorked.secondary.map((muscle) => (
                  <span key={muscle} className="px-3 py-1.5 text-xs font-medium rounded-full bg-secondary text-muted-foreground">{muscle}</span>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Recommended sets & reps */}
        <SectionCard title="Series y repeticiones recomendadas">
          <div className="space-y-0">
            {[
              { label: 'Fuerza', sub: 'Potencia máxima', data: exercise.recommendations.strength },
              { label: 'Hipertrofia', sub: 'Tamaño muscular', data: exercise.recommendations.hypertrophy },
              { label: 'Resistencia', sub: 'Aguante muscular', data: exercise.recommendations.endurance },
            ].map((item, i, arr) => (
              <div key={item.label} className={cn("flex items-center justify-between py-3", i < arr.length - 1 && "border-b border-border/40")}>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
                <p className="text-sm font-medium text-foreground tabular-nums">
                  {item.data.sets} series × {item.data.reps}
                </p>
              </div>
            ))}
          </div>

          {onNavigateToArticle && (
            <button onClick={() => onNavigateToArticle('progressive-overload')} className="mt-4 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Aprende sobre sobrecarga progresiva →
            </button>
          )}
        </SectionCard>

        {/* Personal Records */}
        <PRSummaryCard
          records={records}
          onRegisterPR={() => setShowPRSheet(true)}
          onViewHistory={() => onViewPRHistory?.(exercise.id)}
        />

        {/* Used in routines */}
        {exercise.usedInRoutines.length > 0 && (
          <SectionCard title="Usado en estas rutinas">
            <div className="space-y-1">
              {exercise.usedInRoutines.map((routine) => (
                <button key={routine} onClick={() => onNavigateToRoutine?.(routine)} className="flex w-full items-center justify-between py-2.5 px-1 text-left hover:bg-secondary/50 rounded-lg transition-colors">
                  <span className="text-sm text-foreground">{routine}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 safe-area-pb">
        <div className="flex gap-3">
          <Button onClick={() => setShowReplaceModal(true)} variant="outline" className="flex-1 h-12 rounded-full text-sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reemplazar en rutina
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="flex-1 h-12 rounded-full text-sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar a rutina
          </Button>
        </div>
      </div>

      {/* Add to routine dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar a rutina</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {mockRoutines.map((routine) => (
              <button key={routine.id} onClick={() => setShowAddModal(false)} className="flex w-full items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                <span className="text-sm font-medium text-foreground">{routine.name}</span>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          <Button className="w-full mt-4 rounded-full" onClick={() => setShowAddModal(false)}>Listo</Button>
        </DialogContent>
      </Dialog>

      {/* Replace in routine dialog */}
      <Dialog open={showReplaceModal} onOpenChange={setShowReplaceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reemplazar en rutina</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {mockRoutines.map((routine) => (
              <button key={routine.id} onClick={() => setShowReplaceModal(false)} className="flex w-full items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                <span className="text-sm font-medium text-foreground">{routine.name}</span>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          <Button className="w-full mt-4 rounded-full" onClick={() => setShowReplaceModal(false)}>Listo</Button>
        </DialogContent>
      </Dialog>

      {showVideoModal && exercise.videoUrl && (
        <ExerciseVideoModal videoUrl={exercise.videoUrl} orientation={exercise.orientation} onClose={() => setShowVideoModal(false)} />
      )}

      <RegisterPRSheet
        open={showPRSheet}
        onOpenChange={setShowPRSheet}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        onSave={addRecord}
      />
    </div>
  );
}
