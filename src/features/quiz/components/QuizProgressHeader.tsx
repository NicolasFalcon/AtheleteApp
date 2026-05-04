import {ArrowLeft} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type QuizProgressHeaderProps = {
  title: string;
  current: number;
  total: number;
  progressPct: number;
  onBack: () => void;
};

export function QuizProgressHeader({
  title,
  current,
  total,
  progressPct,
  onBack,
}: QuizProgressHeaderProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    shell: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    counter: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    barTrack: {
      height: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
    },
  });

  return (
    <View style={styles.shell}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={18} strokeWidth={2.2} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text style={styles.counter}>
          {current} de {total}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, {width: `${progressPct}%`}]} />
      </View>
    </View>
  );
}
