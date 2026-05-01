import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Habit } from '@/lib/types';
import { Core33StepIndicator } from '@/components/challenge/Core33StepIndicator';
import { Core33Intro } from '@/components/challenge/Core33Intro';
import { Core33ChooseHabits, Core33HabitSelection } from '@/components/challenge/Core33ChooseHabits';
import { Core33Summary } from '@/components/challenge/Core33Summary';
import { Core33Tracker } from '@/components/challenge/Core33Tracker';

type Step = 'intro' | 'habits' | 'summary' | 'tracker';

function getInitialStep(challengeStatus: string | null): Step {
  if (challengeStatus === 'active') return 'tracker';
  if (challengeStatus === 'completed') return 'tracker';
  return 'intro';
}

const STEP_NUMBER: Record<Step, number> = {
  intro: 1,
  habits: 2,
  summary: 3,
  tracker: 4,
};

export default function Core33Challenge() {
  const navigate = useNavigate();
  const { challenge, startChallenge, restartChallenge } = useApp();

  const [step, setStep] = useState<Step>(() => getInitialStep(challenge?.status ?? null));
  const [selectedHabits, setSelectedHabits] = useState<Core33HabitSelection>({
    training: '',
    health: '',
    mind: '',
  });

  const handleBack = () => navigate('/');

  const handleHabitsSelected = (habits: Core33HabitSelection) => {
    setSelectedHabits(habits);
    setStep('summary');
  };

  const handleStartChallenge = () => {
    const habits: Habit[] = [
      { id: 'h1', challengeId: 'new', category: 'training', name: selectedHabits.training },
      { id: 'h2', challengeId: 'new', category: 'health', name: selectedHabits.health },
      { id: 'h3', challengeId: 'new', category: 'mind', name: selectedHabits.mind },
    ];
    startChallenge(habits);
    setStep('tracker');
  };

  const handleRestart = () => {
    restartChallenge();
    setSelectedHabits({ training: '', health: '', mind: '' });
    setStep('intro');
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in app-shell">
      {/* App-style sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
          </button>
          {step !== 'tracker' && <Core33StepIndicator currentStep={STEP_NUMBER[step]} />}
          {step === 'tracker' && challenge?.status === 'completed' ? (
            <button
              onClick={handleRestart}
              className="text-xs font-semibold text-primary active:opacity-70 transition-opacity px-3 py-1.5 rounded-full bg-primary/10"
            >
              Reiniciar
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {step === 'intro' && <Core33Intro onNext={() => setStep('habits')} />}

      {step === 'habits' && (
        <Core33ChooseHabits
          onNext={handleHabitsSelected}
          onBack={() => setStep('intro')}
          initialHabits={selectedHabits}
        />
      )}

      {step === 'summary' && (
        <Core33Summary
          habits={selectedHabits}
          onConfirm={handleStartChallenge}
          onBack={() => setStep('habits')}
        />
      )}

      {step === 'tracker' && <Core33Tracker onDevReset={handleRestart} />}
    </div>
  );
}
