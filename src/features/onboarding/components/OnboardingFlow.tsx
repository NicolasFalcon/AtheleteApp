import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import {
  EllieWelcome,
  type WelcomeSaveStatus,
} from '@app/features/onboarding/components/EllieWelcome';
import { OnboardingWizard } from '@app/features/onboarding/components/OnboardingWizard';
import {
  STEPS,
  initialAnswers,
  type OnboardingAnswers,
} from '@app/features/onboarding/onboardingModel';

export type OnboardingFinishTarget = 'home' | 'ellie';

export type OnboardingFlowProps = {
  initialName?: string;
  // Runs in the background as soon as the ELLIE welcome appears.
  // Real flow: writes the profile. Dev walkthrough: resolves without saving.
  onSave: (answers: OnboardingAnswers) => Promise<void>;
  // Leaving the welcome only navigates (the profile is already saved).
  onFinish: (target: OnboardingFinishTarget) => Promise<void> | void;
  // Back from the first question (dev walkthrough → back to the intro).
  onExit?: () => void;
  // Prefilled answers for the dev walkthrough.
  seed?: Partial<OnboardingAnswers>;
  // Dev walkthrough deep links: start on a given question or on the welcome.
  initialStep?: number;
  startOnWelcome?: boolean;
};

const SAVE_ERROR =
  'No pudimos guardar tu perfil. Revisa tu conexión y reintenta.';
const CONTINUE_ERROR = 'No pudimos abrir tu inicio. Inténtalo de nuevo.';

// 9 questions → ELLIE welcome. Answers stay local until the welcome; the
// welcome saves them while it is shown (with retry) and its buttons only
// navigate once the save has succeeded.
export function OnboardingFlow({
  initialName = '',
  onSave,
  onFinish,
  onExit,
  seed,
  initialStep = 0,
  startOnWelcome = false,
}: OnboardingFlowProps) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => ({
    ...initialAnswers(initialName),
    ...seed,
  }));
  const [step, setStep] = useState(() =>
    Math.min(Math.max(initialStep, 0), STEPS.length - 1),
  );
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [phase, setPhase] = useState<'wizard' | 'welcome'>(
    startOnWelcome ? 'welcome' : 'wizard',
  );
  const [saveStatus, setSaveStatus] = useState<WelcomeSaveStatus>('saving');
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const update = useCallback((patch: Partial<OnboardingAnswers>) => {
    setAnswers(current => ({ ...current, ...patch }));
  }, []);

  const save = useCallback(async () => {
    setError('');
    setSaveStatus('saving');
    try {
      await onSave(answers);
      if (mounted.current) {
        setSaveStatus('saved');
      }
    } catch {
      if (mounted.current) {
        setSaveStatus('error');
        setError(SAVE_ERROR);
      }
    }
  }, [answers, onSave]);

  // Save once, when the welcome appears.
  useEffect(() => {
    if (phase === 'welcome') {
      save();
    }
    // Only on entering the welcome; retries call save() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const next = useCallback(() => {
    Keyboard.dismiss();
    setDirection('forward');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setPhase('welcome');
    }
  }, [step]);

  const back = useCallback(() => {
    Keyboard.dismiss();
    setDirection('back');
    if (step > 0) {
      setStep(step - 1);
    } else {
      onExit?.();
    }
  }, [onExit, step]);

  const finish = async (target: OnboardingFinishTarget) => {
    if (saveStatus !== 'saved' || continuing) {
      return;
    }
    setError('');
    setContinuing(true);
    try {
      await onFinish(target);
    } catch {
      if (mounted.current) {
        setError(CONTINUE_ERROR);
      }
    } finally {
      if (mounted.current) {
        setContinuing(false);
      }
    }
  };

  if (phase === 'welcome') {
    return (
      <EllieWelcome
        answers={answers}
        saveStatus={saveStatus}
        continuing={continuing}
        error={error}
        onRetrySave={save}
        onGoHome={() => finish('home')}
        onTalkToEllie={() => finish('ellie')}
      />
    );
  }

  return (
    <OnboardingWizard
      step={step}
      direction={direction}
      answers={answers}
      update={update}
      onNext={next}
      onBack={back}
      canExit={Boolean(onExit)}
    />
  );
}
