import { useState } from 'react';
import { ArrowLeft, Star, Check, MessageCircle, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Specialist } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

interface SpecialistProfileScreenProps {
  specialist: Specialist;
  onBack: () => void;
  onOpenChat: () => void;
}

const mockTimeSlots = [
  { label: 'Esta semana', slots: ['Mié 10:00 AM', 'Jue 3:00 PM', 'Vie 11:00 AM'] },
  { label: 'Próxima semana', slots: ['Lun 9:00 AM', 'Mar 2:00 PM', 'Mié 4:00 PM', 'Vie 10:00 AM'] },
];

export function SpecialistProfileScreen({ specialist, onBack, onOpenChat }: SpecialistProfileScreenProps) {
  const { assignedSpecialist, assignSpecialist } = useApp();
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const hasAssigned = assignedSpecialist?.id === specialist.id;

  const handleBook = () => {
    if (selectedSlot) {
      assignSpecialist(specialist);
      setBooked(true);
      setShowBooking(false);
    }
  };

  const handleMessageSpecialist = () => {
    if (!hasAssigned) assignSpecialist(specialist);
    onOpenChat();
  };

  return (
    <div className="animate-fade-in pb-32">
      <div className="relative h-64">
        <img src={specialist.avatar} alt={specialist.name} className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border/60">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="px-4 -mt-16 relative z-10">
        <div className="card-elevated p-4">
          <h1 className="text-2xl font-bold text-foreground">{specialist.name}</h1>
          <p className="text-muted-foreground font-medium">{specialist.role}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-foreground text-foreground" />
              <span className="font-semibold text-foreground">{specialist.rating}</span>
              <span className="text-sm text-muted-foreground">({specialist.reviewCount})</span>
            </div>
            <div className="text-sm text-muted-foreground">{specialist.yearsExperience} años de experiencia</div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{specialist.location}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {specialist.tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">{tag}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{specialist.bio}</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="card-elevated p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Cómo puedo ayudarte</h2>
          <div className="space-y-3">
            {specialist.helpsWith.map((item, index) => (
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
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Formato de sesión</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Duración:</span>
              <span className="text-sm text-foreground">{specialist.sessionFormat.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Modalidad:</span>
              <span className="text-sm text-foreground">{specialist.sessionFormat.mode}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">{specialist.sessionFormat.description}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="card-elevated p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Áreas de enfoque</h2>
          <div className="flex flex-wrap gap-2">
            {specialist.areasOfFocus.map(area => (
              <span key={area} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border">{area}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="rounded-xl bg-secondary border border-border p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta información no reemplaza una evaluación médica presencial. Si tu dolor es severo, empeora o se asocia a síntomas graves, busca atención médica de urgencia.
          </p>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border space-y-2">
        <div className="flex gap-2">
          <Button onClick={() => setShowBooking(true)} className="flex-1 rounded-full" size="lg">
            <Calendar className="mr-2 h-5 w-5" />
            Reservar sesión
          </Button>
          <Button onClick={handleMessageSpecialist} variant="outline" className="flex-1 rounded-full" size="lg">
            <MessageCircle className="mr-2 h-5 w-5" />
            Mensaje
          </Button>
        </div>
      </div>

      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-fade-in border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Reservar sesión</h3>
              <button onClick={() => { setShowBooking(false); setSelectedSlot(null); }} className="text-muted-foreground text-sm">
                Cancelar
              </button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {mockTimeSlots.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.slots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'px-3 py-2 rounded-full text-sm font-medium transition-all border',
                          selectedSlot === slot ? 'bg-foreground text-background border-foreground' : 'bg-secondary text-foreground border-border'
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleBook} disabled={!selectedSlot} className="w-full mt-4 rounded-full" size="lg">
              Confirmar reserva
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}