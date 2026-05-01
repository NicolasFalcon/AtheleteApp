import { useState } from 'react';
import { ArrowLeft, Star, ChevronRight, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coach, Specialist } from '@/lib/types';
import { mockCoaches, mockSpecialists } from '@/lib/mockData';
import { cn } from '@/lib/utils';

type Segment = 'trainers' | 'health';

interface CoachesScreenProps {
  onBack: () => void;
  onSelectCoach: (coach: Coach) => void;
  onSelectSpecialist: (specialist: Specialist) => void;
  initialSegment?: Segment;
}

const goalFilters = ['Pérdida de grasa', 'Ganancia muscular', 'Rendimiento'];
const levelFilters = ['Principiante', 'Intermedio', 'Avanzado'];

export function CoachesScreen({ onBack, onSelectCoach, onSelectSpecialist, initialSegment = 'trainers' }: CoachesScreenProps) {
  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  const toggleFilter = (filter: string, type: 'goal' | 'level') => {
    if (type === 'goal') {
      setSelectedGoals(prev => 
        prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
      );
    } else {
      setSelectedLevels(prev => 
        prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
      );
    }
  };

  return (
    <div className="animate-fade-in page-safe-bottom">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 pb-3 pt-3 safe-area-pt">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border/60"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Coaches</h1>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1 rounded-xl bg-secondary p-1">
            <button
              onClick={() => setSegment('trainers')}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
                segment === 'trainers'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground'
              )}
            >
              Entrenadores
            </button>
            <button
              onClick={() => setSegment('health')}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
                segment === 'health'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground'
              )}
            >
              Salud y rehabilitación
            </button>
          </div>
        </div>
      </div>

      {segment === 'trainers' ? (
        <TrainersView
          selectedGoals={selectedGoals}
          selectedLevels={selectedLevels}
          toggleFilter={toggleFilter}
          onSelectCoach={onSelectCoach}
        />
      ) : (
        <SpecialistsView onSelectSpecialist={onSelectSpecialist} />
      )}
    </div>
  );
}

interface TrainersViewProps {
  selectedGoals: string[];
  selectedLevels: string[];
  toggleFilter: (filter: string, type: 'goal' | 'level') => void;
  onSelectCoach: (coach: Coach) => void;
}

function TrainersView({ selectedGoals, selectedLevels, toggleFilter, onSelectCoach }: TrainersViewProps) {
  return (
    <>
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar coaches..." className="pl-10 bg-card border-border" />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">OBJETIVOS</p>
          <div className="flex flex-wrap gap-2">
            {goalFilters.map(filter => (
              <button
                key={filter}
                onClick={() => toggleFilter(filter, 'goal')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-all border',
                  selectedGoals.includes(filter) 
                    ? 'bg-foreground text-background border-foreground' 
                    : 'bg-transparent text-muted-foreground border-border'
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">NIVEL</p>
          <div className="flex flex-wrap gap-2">
            {levelFilters.map(filter => (
              <button
                key={filter}
                onClick={() => toggleFilter(filter, 'level')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-all border',
                  selectedLevels.includes(filter) 
                    ? 'bg-foreground text-background border-foreground' 
                    : 'bg-transparent text-muted-foreground border-border'
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-3">
        {mockCoaches.map(coach => (
          <button
            key={coach.id}
            onClick={() => onSelectCoach(coach)}
            className="card-interactive w-full p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <img src={coach.avatar} alt={coach.name} className="h-14 w-14 rounded-full object-cover grayscale flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{coach.name}</h3>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground">{coach.specialty}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-foreground text-foreground" />
                  <span className="text-sm font-medium text-foreground">{coach.rating}</span>
                  <span className="text-xs text-muted-foreground">({coach.reviewCount} reseñas)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {coach.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

interface SpecialistsViewProps {
  onSelectSpecialist: (specialist: Specialist) => void;
}

function SpecialistsView({ onSelectSpecialist }: SpecialistsViewProps) {
  return (
    <>
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar especialistas..." className="pl-10 bg-card border-border" />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {mockSpecialists.map(specialist => (
          <button
            key={specialist.id}
            onClick={() => onSelectSpecialist(specialist)}
            className="card-interactive w-full p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <img src={specialist.avatar} alt={specialist.name} className="h-14 w-14 rounded-full object-cover grayscale flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{specialist.name}</h3>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-sm text-info font-medium">{specialist.role}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {specialist.specialties.join(' · ')}
                </p>

                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                    <span className="text-sm font-medium text-foreground">{specialist.rating}</span>
                    <span className="text-xs text-muted-foreground">({specialist.reviewCount})</span>
                  </div>
                  <span className="text-muted-foreground">·</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{specialist.location}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {specialist.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
