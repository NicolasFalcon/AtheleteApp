import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { IconButton, useToast } from '@app/components/v2';
import { OnboardingFlow } from '@app/features/onboarding/components/OnboardingFlow';
import type { OnboardingAnswers } from '@app/features/onboarding/onboardingModel';
import { VisualOnboardingScreen } from '@app/screens/onboarding/VisualOnboardingScreen';

// Sample answers (the prototype's defaults). Nothing is saved.
const SAMPLE: Partial<OnboardingAnswers> = {
  name: 'Nicolas',
  birthDate: '1989-08-30',
  weight: 76,
  height: 170,
  goal: 0,
  level: 1,
  days: 6,
  equipment: ['Peso corporal', 'Mancuernas'],
  duration: 2,
};

// Development-only walkthrough: Intro → 8 questions → ELLIE welcome, with
// sample data. It never calls Supabase, never creates users and never saves
// the profile ("Ir a Inicio" / "Hablar con ELLIE" just close it).
export function DevOnboardingWalkthrough({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [phase, setPhase] = useState<'intro' | 'flow'>('intro');

  return (
    <View style={StyleSheet.absoluteFill}>
      {phase === 'intro' ? (
        <VisualOnboardingScreen onComplete={() => setPhase('flow')} />
      ) : (
        <OnboardingFlow
          seed={SAMPLE}
          onExit={() => setPhase('intro')}
          // Nothing is saved: the welcome just shows a short "saving" state.
          onSave={() => new Promise(resolve => setTimeout(resolve, 600))}
          onFinish={target => {
            onClose();
            toast.show(
              target === 'ellie'
                ? 'Recorrido terminado · iría a ELLIE (sin guardar)'
                : 'Recorrido terminado · iría a Inicio (sin guardar)',
            );
          }}
        />
      )}
      <View style={[styles.close, { top: insets.top + 4 }]}>
        <IconButton
          icon={X}
          size={36}
          variant="glass"
          accessibilityLabel="Salir del recorrido"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  close: {
    position: 'absolute',
    right: 16,
  },
});
