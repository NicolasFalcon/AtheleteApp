import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {useAppTheme} from '@app/hooks/useAppTheme';

type CircularProgressProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
};

export function CircularProgress({
  value,
  max = 100,
  size = 72,
  strokeWidth = 6,
  label,
  sublabel,
}: CircularProgressProps) {
  const {theme} = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const strokeDashoffset = circumference * (1 - ratio);

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: size >= 72 ? theme.typography.sizes.titleSm : theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    sublabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  return (
    <View style={styles.container}>
      <Svg height={size} width={size} style={{transform: [{rotate: '-90deg'}]}}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.accent}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {(label || sublabel) ? (
        <View style={styles.center}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
