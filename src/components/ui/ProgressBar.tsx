import {StyleSheet, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type ProgressBarProps = {
  value: number;
  max: number;
  color?: string;
};

export function ProgressBar({value, max, color}: ProgressBarProps) {
  const {theme} = useAppTheme();
  const progress = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const styles = StyleSheet.create({
    track: {
      height: 7,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
    },
    fill: {
      height: '100%',
      width: `${progress * 100}%`,
      borderRadius: 999,
      backgroundColor: color || theme.colors.accent,
    },
  });

  return (
    <View style={styles.track}>
      <View style={styles.fill} />
    </View>
  );
}
