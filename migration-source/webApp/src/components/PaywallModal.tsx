import { Crown, X, Dumbbell, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

const benefits = [
  { icon: Dumbbell, text: 'Acceso a rutinas premium de entrenamiento' },
  { icon: Sparkles, text: 'Análisis avanzados y recomendaciones de ELLIE IA' },
  { icon: Target, text: 'Análisis de progreso más profundo y personalizado' },
];

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const handleUpgrade = () => {
    toast({
      title: 'Próximamente',
      description: 'Los pagos aún no están habilitados en esta versión.',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-border bg-card p-0 overflow-hidden">
        <div className="relative px-6 pt-8 pb-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Crown className="h-7 w-7 text-foreground" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground text-center tracking-tight">
            Desbloquea Athelete Premium
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Lleva tu entrenamiento al siguiente nivel con guía impulsada por IA
          </p>
        </div>

        <div className="px-6 pb-2 space-y-3">
          {benefits.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <span className="text-sm text-foreground">{text}</span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-4 space-y-2">
          <Button onClick={handleUpgrade} className="w-full rounded-full" size="lg">
            <Crown className="mr-2 h-4 w-4" />
            Mejorar plan (próximamente)
          </Button>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Quizás después
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}