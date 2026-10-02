import { StyleSheet, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';

type BlockErrorProps = {
  message: string;
  onRetry: () => void;
};

// Inline error for one Inicio block: the rest of the screen keeps working.
export function BlockError({ message, onRetry }: BlockErrorProps) {
  const { colors, radius } = useThemeV2();

  return (
    <View
      style={[
        styles.row,
        { borderRadius: radius.cardCompact, borderColor: colors.divider },
      ]}
    >
      <TextV2 variant="meta" tone="secondary" style={styles.text}>
        {message}
      </TextV2>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        hitSlop={10}
        onPress={onRetry}
        style={styles.action}
      >
        <RefreshCw size={14} color={colors.text.primary} strokeWidth={2} />
        <TextV2 variant="metaStrong">Reintentar</TextV2>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
