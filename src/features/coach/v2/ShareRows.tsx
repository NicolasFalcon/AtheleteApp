import { StyleSheet, View } from 'react-native';
import { Dumbbell, Scale, Utensils, type LucideIcon } from 'lucide-react-native';
import { SwitchV2, TextV2, useThemeV2 } from '@app/components/v2';
import { useCoachText } from '@app/features/coach/coachCopy';

// The three consent categories (§30.4): Entrenamientos (required, on and
// locked), Nutrición and Peso y sueño (optional, off by default). Same rows
// in Consentimiento and in Mi coach › Qué compartes.
export function ShareRows({
  nutrition,
  body,
  onChange,
  disabled = false,
}: {
  nutrition: boolean;
  body: boolean;
  onChange: (next: { nutrition: boolean; body: boolean }) => void;
  disabled?: boolean;
}) {
  const { colors } = useThemeV2();
  const { t } = useCoachText();
  const rows: {
    key: 'training' | 'nutrition' | 'body';
    icon: LucideIcon;
    title: string;
    body: string;
    value: boolean;
    required: boolean;
  }[] = [
    {
      key: 'training',
      icon: Dumbbell,
      title: t('coach.share.training'),
      body: t('coach.share.training.body'),
      value: true,
      required: true,
    },
    {
      key: 'nutrition',
      icon: Utensils,
      title: t('coach.share.nutrition'),
      body: t('coach.share.nutrition.body'),
      value: nutrition,
      required: false,
    },
    {
      key: 'body',
      icon: Scale,
      title: t('coach.share.body'),
      body: t('coach.share.body.body'),
      value: body,
      required: false,
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.raised, borderColor: colors.border.card }]}>
      {rows.map((row, index) => {
        const Icon = row.icon;
        return (
          <View
            key={row.key}
            style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
          >
            <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}>
              <Icon size={20} color={colors.text.primary} strokeWidth={1.8} />
            </View>
            <View style={styles.texts}>
              <View style={styles.titleRow}>
                <TextV2 variant="sub">{row.title}</TextV2>
                <TextV2 variant="captionStrong" tone="secondary">
                  {row.required ? t('coach.required') : t('coach.optional')}
                </TextV2>
              </View>
              <TextV2 variant="body" tone="secondary">
                {row.body}
              </TextV2>
            </View>
            <SwitchV2
              value={row.value}
              disabled={row.required || disabled}
              accessibilityLabel={row.title}
              onValueChange={value =>
                onChange({
                  nutrition: row.key === 'nutrition' ? value : nutrition,
                  body: row.key === 'body' ? value : body,
                })
              }
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
});
