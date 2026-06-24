import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { EllieUiMessage } from '@app/hooks/useEllieChat';
import { EllieRichTextMessage } from '@app/features/ellie/components/EllieRichTextMessage';

type EllieMessageBubbleProps = {
  message: EllieUiMessage;
};

export function EllieMessageBubble({ message }: EllieMessageBubbleProps) {
  const { theme } = useAppTheme();
  const isAssistant = message.role === 'assistant';

  const styles = StyleSheet.create({
    row: {
      alignItems: isAssistant ? 'flex-start' : 'flex-end',
    },
    bubble: {
      maxWidth: isAssistant ? '90%' : '76%',
      borderRadius: isAssistant ? 18 : 18,
      paddingHorizontal: isAssistant ? 14 : 13,
      paddingVertical: isAssistant ? 13 : 10,
      backgroundColor: isAssistant
        ? theme.colors.surfaceMuted
        : theme.colors.accent,
      borderWidth: isAssistant ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
    },
    bubbleAssistant: {
      borderTopLeftRadius: 6,
    },
    bubbleUser: {
      borderBottomRightRadius: 6,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 7,
    },
    brandLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  });

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          isAssistant ? styles.bubbleAssistant : styles.bubbleUser,
        ]}
      >
        {isAssistant ? (
          <View style={styles.brandRow}>
            <Sparkles
              color={theme.colors.textPrimary}
              size={13}
              strokeWidth={2}
            />
            <Text style={styles.brandLabel}>ELLIE</Text>
          </View>
        ) : null}
        <EllieRichTextMessage
          content={message.content}
          tone={isAssistant ? 'assistant' : 'user'}
        />
      </View>
    </View>
  );
}
