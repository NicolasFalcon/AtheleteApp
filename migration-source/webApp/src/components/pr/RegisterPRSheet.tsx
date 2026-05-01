import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PRType, PRInsert, prTypeLabels } from '@/hooks/usePersonalRecords';
import { useExercises } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { Trophy, Weight, Repeat, Timer, Ruler, Loader2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RegisterPRSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: string;
  exerciseName: string;
  onSave: (pr: PRInsert) => Promise<boolean>;
  /** When true, show an exercise picker step first */
  showExercisePicker?: boolean;
}

const prTypeOptions: { type: PRType; label: string; icon: typeof Weight }[] = [
  { type: 'max_weight', label: 'Peso máximo', icon: Weight },
  { type: 'weight_reps', label: 'Peso + reps', icon: Repeat },
  { type: 'max_reps', label: 'Repeticiones máx.', icon: Repeat },
  { type: 'duration', label: 'Tiempo', icon: Timer },
  { type: 'distance', label: 'Distancia', icon: Ruler },
];

export function RegisterPRSheet({ open, onOpenChange, exerciseId, exerciseName, onSave, showExercisePicker }: RegisterPRSheetProps) {
  const { exercises } = useExercises();
  const [selectedExId, setSelectedExId] = useState(exerciseId);
  const [selectedExName, setSelectedExName] = useState(exerciseName);
  const [searchQuery, setSearchQuery] = useState('');
  const [prType, setPrType] = useState<PRType | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return exercises.filter(e => e.name.toLowerCase().includes(q)).slice(0, 20);
  }, [exercises, searchQuery]);

  const activeExId = showExercisePicker ? selectedExId : exerciseId;
  const activeExName = showExercisePicker ? selectedExName : exerciseName;

  const reset = () => {
    setPrType(null);
    setWeight(''); setReps(''); setDurationMin(''); setDurationSec(''); setDistance(''); setNotes('');
    setSelectedExId(''); setSelectedExName(''); setSearchQuery('');
  };

  const isValid = (): boolean => {
    if (!prType) return false;
    switch (prType) {
      case 'max_weight': return !!weight && parseFloat(weight) > 0;
      case 'weight_reps': return !!weight && parseFloat(weight) > 0 && !!reps && parseInt(reps) > 0;
      case 'max_reps': return !!reps && parseInt(reps) > 0;
      case 'duration': return (!!durationMin && parseInt(durationMin) > 0) || (!!durationSec && parseInt(durationSec) > 0);
      case 'distance': return !!distance && parseFloat(distance) > 0;
    }
  };

  const handleSave = async () => {
    if (!prType || !isValid() || !activeExId) return;
    setSaving(true);

    const pr: PRInsert = {
      exerciseId: activeExId,
      prType,
      valueWeight: prType === 'max_weight' || prType === 'weight_reps' ? parseFloat(weight) : null,
      valueReps: prType === 'weight_reps' || prType === 'max_reps' ? parseInt(reps) : null,
      valueDurationSec: prType === 'duration' ? (parseInt(durationMin || '0') * 60 + parseInt(durationSec || '0')) : null,
      valueDistanceM: prType === 'distance' ? parseFloat(distance) : null,
      notes: notes.trim() || undefined,
    };

    const ok = await onSave(pr);
    setSaving(false);
    if (ok) {
      toast({ title: '🏆 PR registrado', description: `Nuevo récord para ${activeExName}` });
      reset();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar el PR', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60 bg-card px-4 pb-8 pt-6 max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Registrar PR
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left mt-1">{activeExName || 'Selecciona un ejercicio'}</p>
        </SheetHeader>

        {/* Exercise picker */}
        {showExercisePicker && !activeExId && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ejercicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredExercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => { setSelectedExId(ex.id); setSelectedExName(ex.name); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PR type selection */}
        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de récord</p>
          <div className="grid grid-cols-2 gap-2">
            {prTypeOptions.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setPrType(type)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all text-left",
                  prType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-secondary/50 text-muted-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic fields */}
        {prType && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</p>

            {(prType === 'max_weight' || prType === 'weight_reps') && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Peso (kg)</label>
                  <Input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0" className="h-12 text-lg tabular-nums" />
                </div>
                {prType === 'weight_reps' && (
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Repeticiones</label>
                    <Input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} placeholder="0" className="h-12 text-lg tabular-nums" />
                  </div>
                )}
              </div>
            )}

            {prType === 'max_reps' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Repeticiones</label>
                <Input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} placeholder="0" className="h-12 text-lg tabular-nums" />
              </div>
            )}

            {prType === 'duration' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Minutos</label>
                  <Input type="number" inputMode="numeric" value={durationMin} onChange={e => setDurationMin(e.target.value)} placeholder="0" className="h-12 text-lg tabular-nums" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Segundos</label>
                  <Input type="number" inputMode="numeric" value={durationSec} onChange={e => setDurationSec(e.target.value)} placeholder="0" className="h-12 text-lg tabular-nums" />
                </div>
              </div>
            )}

            {prType === 'distance' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Distancia (metros)</label>
                <Input type="number" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0" className="h-12 text-lg tabular-nums" />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas (opcional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Buena técnica, después de descanso..." className="resize-none" rows={2} />
            </div>

            {/* Save */}
            <Button onClick={handleSave} disabled={!isValid() || saving} className="w-full h-12 rounded-full text-sm font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
              Guardar récord
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
