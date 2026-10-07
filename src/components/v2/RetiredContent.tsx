import { StyleSheet, View } from 'react-native';
import { EyeOff } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// "Contenido retirado" / "en revisión": what a post or comment shows when
// moderation removed it or reports hid it (`removed_at`, `hidden_at`). It
// never shows the original text or photo.
export function RetiredContent({
  title,
  body,
  compact = false,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  const { colors } = useThemeV2();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${body}`}
      style={[
        styles.box,
        compact ? styles.compact : null,
        { backgroundColor: colors.surface.muted },
      ]}
    >
      <EyeOff size={compact ? 16 : 20} strokeWidth={1.8} color={colors.text.secondary} />
      <View style={styles.texts}>
        <TextV2 variant={compact ? 'metaStrong' : 'cta'}>{title}</TextV2>
        <TextV2 variant={compact ? 'caption' : 'meta'} tone="secondary">
          {body}
        </TextV2>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
  },
  compact: { padding: 12, borderRadius: 14, gap: 10 },
  texts: { flex: 1, gap: 2 },
});
