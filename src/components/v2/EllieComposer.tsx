import { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ArrowUp, Mic } from 'lucide-react-native';
import { LivingHalo, type LivingHaloState } from '@app/components/v2/LivingHalo';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type EllieComposerProps = {
  placeholder: string;
  // 'button': the portada's "Pregúntale algo a ELLIE" (56 pt, with the orb);
  // 'input': the chat field (54 pt).
  variant?: 'button' | 'input';
  value?: string;
  onChangeText?: (value: string) => void;
  onSend?: () => void;
  onPress?: () => void;
  canSend?: boolean;
  // Voice mode entry (neutral mic chip, left of send). Hidden when absent.
  onVoice?: () => void;
  haloState?: LivingHaloState;
  // Inactive field (no connection, limit): dimmed and not editable.
  disabled?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Writing bar of ELLIE: a white (Dark: charcoal) pill with a soft warm shadow
// and a round send button (ink when there is something to send).
export const EllieComposer = forwardRef<TextInput, EllieComposerProps>(
  function EllieComposer(
    {
      placeholder,
      variant = 'input',
      value,
      onChangeText,
      onSend,
      onPress,
      canSend = false,
      onVoice,
      haloState = 'idle',
      disabled = false,
      autoFocus,
      style,
    },
    ref,
  ) {
    const { colors, shadow } = useThemeV2();
    const button = variant === 'button';
    const active = button || canSend;

    const mic = onVoice ? (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Modo voz"
        disabled={disabled}
        onPress={onVoice}
        style={[styles.send, { backgroundColor: colors.ellie.chip }]}
      >
        <Mic size={19} strokeWidth={2} color={colors.text.primary} />
      </PressableScale>
    ) : null;

    const send = (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Enviar"
        accessibilityState={{ disabled: !active || disabled }}
        disabled={!active || disabled}
        onPress={button ? onPress : onSend}
        style={[
          styles.send,
          {
            backgroundColor: active ? colors.cta.primary : colors.surface.track,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <ArrowUp
          size={18}
          strokeWidth={2.2}
          color={active ? colors.cta.primaryText : colors.text.tertiary}
        />
      </PressableScale>
    );

    const body = (
      <>
        <LivingHalo size="input" state={haloState} />
        {button ? (
          <TextV2
            variant="bodyL"
            color={colors.text.secondary}
            style={styles.flex}
          >
            {placeholder}
          </TextV2>
        ) : (
          <TextInput
            ref={ref}
            accessibilityLabel={placeholder}
            editable={!disabled}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            multiline
            autoFocus={autoFocus}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={onSend}
            style={[styles.input, { color: colors.text.primary }]}
          />
        )}
        {mic}
        {send}
      </>
    );

    const containerStyle = [
      styles.bar,
      button ? styles.buttonBar : styles.inputBar,
      { backgroundColor: colors.ellie.input, boxShadow: shadow.ellie },
      disabled ? styles.dim : null,
      style,
    ];

    return button ? (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        onPress={onPress}
        style={containerStyle}
      >
        {body}
      </PressableScale>
    ) : (
      <View style={containerStyle}>{body}</View>
    );
  },
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonBar: { height: 56, borderRadius: 28, paddingLeft: 10, paddingRight: 6, gap: 8 },
  inputBar: {
    minHeight: 54,
    borderRadius: 27,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.85 },
});
