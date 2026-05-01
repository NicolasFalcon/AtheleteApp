import { useState } from 'react';
import { Search, Heart, Star, Loader2, Dumbbell, Target, Gauge, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/Chip';
import { useExercises, equipmentLabels, bodyPartLabels, levelLabels, LibraryExercise } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';

interface ExerciseLibraryProps {
  onSelectExercise: (exercise: LibraryExercise) => void;
  isExerciseFavorite: (id: string) => boolean;
  toggleExerciseFavorite: (id: string) => void;
  favoriteExerciseIds: string[];
}

const equipmentFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'bodyweight', label: 'Peso corporal' },
  { key: 'dumbbells', label: 'Mancuernas' },
  { key: 'barbell', label: 'Barra' },
  { key: 'machines', label: 'Máquinas' },
  { key: 'cable', label: 'Cable' },
  { key: 'bands', label: 'Bandas' },
  { key: 'kettlebells', label: 'Kettlebells' },
  { key: 'trx', label: 'TRX' },
];
const bodyPartFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'chest', label: 'Pecho' },
  { key: 'back', label: 'Espalda' },
  { key: 'legs', label: 'Piernas' },
  { key: 'shoulders', label: 'Hombros' },
  { key: 'arms', label: 'Brazos' },
  { key: 'core', label: 'Core' },
  { key: 'fullbody', label: 'Cuerpo completo' },
  { key: 'mobility', label: 'Movilidad' },
  { key: 'cardio', label: 'Cardio' },
];
const levelFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'beginner', label: 'Principiante' },
  { key: 'intermediate', label: 'Intermedio' },
  { key: 'advanced', label: 'Avanzado' },
];

type ViewMode = 'all' | 'favorites';

export function ExerciseLibrary({ onSelectExercise, isExerciseFavorite, toggleExerciseFavorite, favoriteExerciseIds }: ExerciseLibraryProps) {
  const { exercises, isLoading } = useExercises();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEquipment, setActiveEquipment] = useState('all');
  const [activeBodyPart, setActiveBodyPart] = useState('all');
  const [activeLevel, setActiveLevel] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const filteredExercises = exercises.filter((exercise) => {
    if (viewMode === 'favorites' && !favoriteExerciseIds.includes(exercise.id)) {
      return false;
    }

    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment = activeEquipment === 'all' || exercise.equipment === activeEquipment;
    const matchesBodyPart = activeBodyPart === 'all' || exercise.bodyPart === activeBodyPart;
    const matchesLevel = activeLevel === 'all' || exercise.level === activeLevel;
    
    return matchesSearch && matchesEquipment && matchesBodyPart && matchesLevel;
  });

  const activeFiltersCount = [activeEquipment, activeBodyPart, activeLevel].filter((value) => value !== 'all').length;
  const resultsLabel = viewMode === 'favorites'
    ? `${filteredExercises.length} favoritos`
    : `${filteredExercises.length} ejercicios`;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-4">
        <div className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="page-title !mb-0">Biblioteca de ejercicios</h1>
              <p className="text-sm text-muted-foreground">
                Explora por equipo, zona y nivel para encontrar el ejercicio preciso.
              </p>
            </div>
            <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {resultsLabel}
            </div>
          </div>

          <div className="mt-4 flex rounded-2xl bg-secondary/80 p-1">
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                'flex-1 rounded-[14px] py-2.5 text-sm font-medium transition-all',
                viewMode === 'all'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todos ({exercises.length})
            </button>
            <button
              onClick={() => setViewMode('favorites')}
              className={cn(
                'flex-1 rounded-[14px] py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                viewMode === 'favorites'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Star className="h-3.5 w-3.5" />
              Favoritos
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar ejercicios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-2xl border-border/60 bg-background/90 pl-10"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                {viewMode === 'favorites'
                  ? 'Tus ejercicios guardados'
                  : activeFiltersCount > 0
                    ? `${activeFiltersCount} filtro${activeFiltersCount === 1 ? '' : 's'} activo${activeFiltersCount === 1 ? '' : 's'}`
                    : 'Sin filtros activos'}
              </span>
            </div>
            <span>{resultsLabel}</span>
          </div>
        </div>

        {viewMode === 'all' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtra tu búsqueda</span>
            </div>

            <FilterGroup
              title="Equipamiento"
              icon={Dumbbell}
              activeKey={activeEquipment}
              filters={equipmentFilters}
              onChange={setActiveEquipment}
            />

            <FilterGroup
              title="Zona del cuerpo"
              icon={Target}
              activeKey={activeBodyPart}
              filters={bodyPartFilters}
              onChange={setActiveBodyPart}
            />

            <FilterGroup
              title="Nivel"
              icon={Gauge}
              activeKey={activeLevel}
              filters={levelFilters}
              onChange={setActiveLevel}
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <div className="mt-5 space-y-3 px-4">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              isFavorite={isExerciseFavorite(exercise.id)}
              onToggleFavorite={() => toggleExerciseFavorite(exercise.id)}
              onClick={() => onSelectExercise(exercise)}
            />
          ))}

          {filteredExercises.length === 0 && viewMode === 'favorites' && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <Star className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">Sin ejercicios favoritos aún</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
                Explora ejercicios y toca el ícono <Heart className="inline h-3.5 w-3.5 text-primary" /> para guardar tus favoritos.
              </p>
              <button
                onClick={() => setViewMode('all')}
                className="mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Ver todos los ejercicios
              </button>
            </div>
          )}

          {filteredExercises.length === 0 && viewMode === 'all' && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No se encontraron ejercicios</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ExerciseCardProps {
  exercise: LibraryExercise;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

interface FilterGroupProps {
  title: string;
  icon: typeof Dumbbell;
  activeKey: string;
  filters: { key: string; label: string }[];
  onChange: (key: string) => void;
}

function FilterGroup({ title, icon: Icon, activeKey, filters, onChange }: FilterGroupProps) {
  const activeFilter = filters.find((filter) => filter.key === activeKey);

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/70 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/90 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {activeFilter?.key === 'all' ? 'Todas las opciones' : activeFilter?.label}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-1 px-1">
        {filters.map((filter) => {
          const isActive = activeKey === filter.key;

          return (
            <Chip
              key={filter.key}
              variant={isActive ? 'selected' : 'outline'}
              onClick={() => onChange(filter.key)}
              size="sm"
              className={cn(
                'whitespace-nowrap',
                isActive
                  ? 'shadow-[0_8px_20px_rgba(15,23,42,0.14)]'
                  : 'border-border/60 bg-background/80 hover:bg-background hover:text-foreground'
              )}
            >
              {filter.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, isFavorite, onToggleFavorite, onClick }: ExerciseCardProps) {
  return (
    <button
      onClick={onClick}
      className="card-interactive group relative flex w-full items-stretch gap-3 overflow-hidden rounded-[28px] border border-border/60 bg-card/90 p-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
    >
      <div className="relative h-[88px] w-[84px] shrink-0 overflow-hidden rounded-[22px] bg-secondary">
        <img
          src={exercise.thumbnailUrl}
          alt={exercise.name}
          className="h-full w-full object-cover grayscale transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pr-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {levelLabels[exercise.level] || exercise.level}
          </p>
          <h3 className="mt-1 text-[17px] font-semibold leading-tight text-foreground">
            {exercise.name}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5" />
              {equipmentLabels[exercise.equipment] || exercise.equipment}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Ver técnica y detalles
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onToggleFavorite();
          }
        }}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 transition-colors hover:bg-background"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
          )}
        />
      </div>
    </button>
  );
}
