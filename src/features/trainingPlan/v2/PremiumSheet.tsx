import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Button, Sheet, TextV2, useThemeV2, useToast } from '@app/components/v2';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';

// Versión gratis (handoff v2.21 §31.12), designed but off: the Premium sheet
// that "Crear plan" opens when it carries the lock, and the "Probar Premium"
// action both it and the locked view of Mes / Plan share.

// "Probar Premium": there is no subscription yet.
// TODO(premium): start the purchase flow here when the subscription exists.
export function useTryPremium(onDone?: () => void) {
  const toast = useToast();
  const { t } = useTrainingPlanText();
  return useCallback(() => {
    toast.show(t('lock.soon'));
    onDone?.();
  }, [onDone, t, toast]);
}

// Three benefits, "La versión gratis sigue planificando tu semana.",
// "Probar Premium" / "Ahora no".
export function PremiumSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors } = useThemeV2();
  const { t } = useTrainingPlanText();
  const tryPremium = useTryPremium(onClose);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={t('lock.eyebrow')}
      title={t('premium.title')}
      footer={
        <View style={styles.footer}>
          <Button label={t('lock.try')} variant="commit" onPress={tryPremium} />
          <Button label={t('premium.later')} variant="secondary" onPress={onClose} />
        </View>
      }
    >
      <View style={styles.benefits}>
        {(['premium.b1', 'premium.b2', 'premium.b3'] as const).map(key => (
          <View key={key} style={styles.benefit}>
            <View style={[styles.check, { backgroundColor: colors.plan.emS }]}>
              <Check size={14} color={colors.plan.emT} strokeWidth={2.6} />
            </View>
            <TextV2 variant="body" style={styles.benefitText}>
              {t(key)}
            </TextV2>
          </View>
        ))}
        <TextV2 variant="label" tone="secondary" style={styles.free}>
          {t('premium.free')}
        </TextV2>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 10 },
  benefits: { gap: 14, paddingBottom: 8 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  benefitText: { flex: 1 },
  free: { marginTop: 4, fontWeight: '400' },
});
