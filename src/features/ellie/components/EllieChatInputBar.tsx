import {Send} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '@app/hooks/useAppTheme';

type EllieChatInputBarProps = {
  draft: string;
  savedDraft: string | null;
  disabled?: boolean;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  onRestoreSavedDraft: () => void;
  onDismissSavedDraft: () => void;
};

export function EllieChatInputBar({
  draft,
  savedDraft,
  disabled = false,
  onChangeDraft,
  onSend,
  onRestoreSavedDraft,
  onDismissSavedDraft,
}: EllieChatInputBarProps) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const canSend = draft.trim().length > 0 && !disabled;

  const styles = StyleSheet.create({
    container: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 10),
      gap: 8,
    },
    draftCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    draftLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    draftPreview: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      marginTop: 4,
    },
    draftActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    draftContent: {
      flex: 1,
    },
    draftActionText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    inputWrap: {
      flex: 1,
      minHeight: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    input: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      lineHeight: 21,
      minHeight: 22,
      maxHeight: 96,
      paddingVertical: 0,
      textAlignVertical: 'top',
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: canSend ? theme.colors.accent : theme.colors.surfaceMuted,
    },
    draftActionMuted: {
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      {savedDraft ? (
        <View style={styles.draftCard}>
          <View style={styles.draftContent}>
            <Text style={styles.draftLabel}>Borrador anterior guardado</Text>
            <Text numberOfLines={1} style={styles.draftPreview}>
              {savedDraft}
            </Text>
          </View>
          <View style={styles.draftActions}>
            <Pressable onPress={onRestoreSavedDraft}>
              <Text style={styles.draftActionText}>Restaurar</Text>
            </Pressable>
            <Pressable onPress={onDismissSavedDraft}>
              <Text style={[styles.draftActionText, styles.draftActionMuted]}>
                Cerrar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.composerRow}>
        <View style={styles.inputWrap}>
          <TextInput
            value={draft}
            onChangeText={onChangeDraft}
            placeholder="Pregúntale a ELLIE..."
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            editable={!disabled}
            multiline
            scrollEnabled
            autoCapitalize="sentences"
            autoCorrect={false}
            blurOnSubmit={false}
          />
        </View>
        <Pressable
          disabled={!canSend}
          onPress={onSend}
          style={({pressed}) => [
            styles.sendButton,
            pressed && canSend ? {opacity: 0.88} : null,
          ]}>
          <Send
            color={canSend ? theme.colors.accentContrast : theme.colors.textSecondary}
            size={18}
            strokeWidth={2}
          />
        </Pressable>
      </View>
    </View>
  );
}
