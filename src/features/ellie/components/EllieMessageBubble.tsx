import {Sparkles} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {EllieUiMessage} from '@app/hooks/useEllieChat';
import {EllieRichTextMessage} from '@app/features/ellie/components/EllieRichTextMessage';

type EllieMessageBubbleProps = {
  message: EllieUiMessage;
};

export function EllieMessageBubble({message}: EllieMessageBubbleProps) {
  const {theme} = useAppTheme();
  const isAssistant = message.role === 'assistant';

  const styles = StyleSheet.create({
    row: {
      alignItems: isAssistant ? 'flex-start' : 'flex-end',
    },
    bubble: {
      maxWidth: isAssistant ? '86%' : '80%',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: isAssistant
        ? theme.colors.surface
        : theme.colors.accent,
      borderWidth: isAssistant ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
      shadowColor: isAssistant ? '#000000' : 'transparent',
      shadowOpacity: isAssistant ? 0.04 : 0,
      shadowRadius: isAssistant ? 12 : 0,
      shadowOffset: isAssistant ? {width: 0, height: 6} : {width: 0, height: 0},
      elevation: isAssistant ? 1 : 0,
    },
    bubbleAssistant: {
      borderBottomLeftRadius: 14,
    },
    bubbleUser: {
      borderBottomRightRadius: 14,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    brandLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.2,
    },
  });

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          isAssistant ? styles.bubbleAssistant : styles.bubbleUser,
        ]}>
        {isAssistant ? (
          <View style={styles.brandRow}>
            <Sparkles color={theme.colors.textPrimary} size={13} strokeWidth={2} />
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
