import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Check, RefreshCw, X} from 'lucide-react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type EllieCardActionsProps = {
  saved: boolean;
  savedLabel: string;
  primaryLabel: string;
  onPrimary: () => void;
  onDiscard: () => void;
  onRegenerate: () => void;
  isPrimaryBusy?: boolean;
  isRegenerating?: boolean;
};

export function EllieCardActions({
  saved,
  savedLabel,
  primaryLabel,
  onPrimary,
  onDiscard,
  onRegenerate,
  isPrimaryBusy = false,
  isRegenerating = false,
}: EllieCardActionsProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    successRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 2,
    },
    successLabel: {
      color: theme.colors.success,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
  });

  if (saved) {
    return (
      <View style={styles.successRow}>
        <Check color={theme.colors.success} size={15} strokeWidth={2.2} />
        <Text style={styles.successLabel}>{savedLabel}</Text>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        disabled={isPrimaryBusy || isRegenerating}
        onPress={onPrimary}
        style={({pressed}) => [
          styles.primaryButton,
          pressed && !isPrimaryBusy && !isRegenerating ? {opacity: 0.92} : null,
          isPrimaryBusy || isRegenerating ? {opacity: 0.7} : null,
        ]}>
        {isPrimaryBusy ? (
          <ActivityIndicator color={theme.colors.accentContrast} />
        ) : (
          <>
            <Check color={theme.colors.accentContrast} size={16} strokeWidth={2.2} />
            <Text style={styles.primaryLabel}>{primaryLabel}</Text>
          </>
        )}
      </Pressable>

      <View style={styles.secondaryRow}>
        <Pressable
          disabled={isPrimaryBusy || isRegenerating}
          onPress={onDiscard}
          style={({pressed}) => [
            styles.secondaryButton,
            pressed && !isPrimaryBusy && !isRegenerating ? {opacity: 0.84} : null,
          ]}>
          <X color={theme.colors.textPrimary} size={15} strokeWidth={2.1} />
          <Text style={styles.secondaryLabel}>Descartar</Text>
        </Pressable>

        <Pressable
          disabled={isPrimaryBusy || isRegenerating}
          onPress={onRegenerate}
          style={({pressed}) => [
            styles.secondaryButton,
            pressed && !isPrimaryBusy && !isRegenerating ? {opacity: 0.84} : null,
          ]}>
          {isRegenerating ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <RefreshCw
                color={theme.colors.textPrimary}
                size={15}
                strokeWidth={2.1}
              />
              <Text style={styles.secondaryLabel}>Otra versión</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
