import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, OnboardingData } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Dumbbell, Flame, Heart, Scale, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 0 | 1 | 2 | 3;

const goals = [
  { value: 'lose_weight' as const, label: 'Perder peso', icon: Flame, emoji: '🔥' },
  { value: 'gain_muscle' as const, label: 'Ganar músculo', icon: Dumbbell, emoji: '💪' },
  { value: 'maintain' as const, label: 'Mantenerme', icon: Scale, emoji: '⚖️' },
  { value: 'improve_health' as const, label: 'Mejorar salud', icon: Heart, emoji: '❤️' },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const next = () => setStep(s => Math.min(s + 1, 3) as Step);
  const prev = () => setStep(s => Math.max(s - 1, 0) as Step);

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!data.birthDate) e.birthDate = 'Obligatorio';
    if (!data.weight || data.weight < 30 || data.weight > 300) e.weight = '30–300 kg';
    if (!data.height || data.height < 100 || data.height > 250) e.height = '100–250 cm';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFinish = async () => {
    if (!data.trainingDaysPerWeek) return;
    setSubmitting(true);
    try {
      await completeOnboarding(data as OnboardingData);
      navigate('/');
    } catch {
      setErrors({ form: 'No se pudo guardar el perfil' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i <= step ? 'bg-foreground' : 'bg-secondary'
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        {step === 0 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mx-auto">
              <Target className="w-10 h-10 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Configuremos tu perfil</h1>
            <p className="text-muted-foreground text-base max-w-xs mx-auto">
              Esto nos ayuda a personalizar tu experiencia de entrenamiento y nutrición.
            </p>
            <Button onClick={next} className="w-full h-12 rounded-xl text-base mt-4">
              Comenzar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-foreground">¿Cuál es tu objetivo principal?</h2>
              <p className="text-muted-foreground text-sm mt-1">Elige el que más te importa ahora.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {goals.map(g => (
                <button
                  key={g.value}
                  onClick={() => setData(d => ({ ...d, goal: g.value }))}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-2xl border transition-all text-left',
                    data.goal === g.value
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border bg-card hover:border-foreground/30'
                  )}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="text-foreground font-semibold text-base">{g.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={prev} className="h-12 rounded-xl px-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button onClick={next} disabled={!data.goal} className="flex-1 h-12 rounded-xl text-base">
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Tus datos corporales</h2>
              <p className="text-muted-foreground text-sm mt-1">Usamos esto para calcular tus objetivos.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Fecha de nacimiento</label>
                <Input type="date" value={data.birthDate || ''} onChange={e => setData(d => ({ ...d, birthDate: e.target.value }))} className="bg-card border-border h-12 rounded-xl" />
                {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Peso (kg)</label>
                  <Input type="number" placeholder="75" value={data.weight || ''} onChange={e => setData(d => ({ ...d, weight: Number(e.target.value) }))} className="bg-card border-border h-12 rounded-xl" />
                  {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Estatura (cm)</label>
                  <Input type="number" placeholder="175" value={data.height || ''} onChange={e => setData(d => ({ ...d, height: Number(e.target.value) }))} className="bg-card border-border h-12 rounded-xl" />
                  {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={prev} className="h-12 rounded-xl px-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button onClick={() => { if (validateStep2()) next(); }} className="flex-1 h-12 rounded-xl text-base">
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Frecuencia de entrenamiento</h2>
              <p className="text-muted-foreground text-sm mt-1">¿Cuántos días por semana quieres entrenar?</p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <button
                  key={d}
                  onClick={() => setData(prev => ({ ...prev, trainingDaysPerWeek: d }))}
                  className={cn(
                    'w-12 h-12 rounded-full text-base font-semibold transition-all',
                    data.trainingDaysPerWeek === d
                      ? 'bg-foreground text-background'
                      : 'bg-card border border-border text-foreground hover:border-foreground/30'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            {data.trainingDaysPerWeek && (
              <p className="text-center text-sm text-muted-foreground">
                {data.trainingDaysPerWeek} día{data.trainingDaysPerWeek > 1 ? 's' : ''} por semana
              </p>
            )}
            {errors.form && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                {errors.form}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={prev} className="h-12 rounded-xl px-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button onClick={handleFinish} disabled={!data.trainingDaysPerWeek || submitting} className="flex-1 h-12 rounded-xl text-base">
                {submitting ? 'Guardando...' : 'Completar configuración ✓'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}