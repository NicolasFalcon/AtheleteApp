import { forwardRef, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon?: LucideIcon;
  // Sentence below the field. By default it also shows the ring and shakes.
  error?: string;
  // Overrides the ring: true without a sentence, false for a neutral note.
  invalid?: boolean;
  secure?: boolean;
  style?: StyleProp<ViewStyle>;
};

// 54 pt field from the prototype (Auth, Onboarding): label 13 secondary,
// filled box radius 14, icon 18 at .5, text 17. Error: Ember-deep ring
// (Ember light on dark), short shake and one sentence (handoff §5, §13).
export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    { label, icon: Icon, error, invalid, secure = false, style, ...inputProps },
    ref,
  ) {
    const { colors, mode, motion, type } = useThemeV2();
    const [hidden, setHidden] = useState(secure);
    const shake = useSharedValue(0);
    const hasError = invalid ?? Boolean(error);
    const errorColor =
      mode === 'light' ? colors.ember.deep : colors.ember.textOnDark;

    useEffect(() => {
      if (!hasError) {
        return;
      }
      const step = motion.shake.duration / 5;
      const [a, b, c, d] = motion.shake.offsets;
      shake.value = withSequence(
        withTiming(a, { duration: step }),
        withTiming(b, { duration: step }),
        withTiming(c, { duration: step }),
        withTiming(d, { duration: step }),
        withTiming(0, { duration: step }),
      );
    }, [error, hasError, motion.shake, shake]);

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shake.value }],
    }));

    return (
      <View style={[styles.wrapper, style]}>
        <TextV2 variant="meta" tone="secondary">
          {label}
        </TextV2>
        <Animated.View
          style={[
            styles.box,
            {
              backgroundColor: colors.surface.field,
              boxShadow: hasError
                ? `inset 0 0 0 1.5px ${errorColor}`
                : undefined,
              paddingRight: secure ? 8 : 16,
            },
            shakeStyle,
          ]}
        >
          {Icon ? (
            <Icon
              color={colors.text.primary}
              size={18}
              strokeWidth={2}
              opacity={0.5}
            />
          ) : null}
          <TextInput
            ref={ref}
            {...inputProps}
            accessibilityLabel={inputProps.accessibilityLabel ?? label}
            placeholderTextColor={colors.text.tertiary}
            secureTextEntry={secure && hidden}
            selectionColor={colors.text.primary}
            style={[
              styles.input,
              {
                color: colors.text.primary,
                fontSize: type.cta.fontSize,
              },
            ]}
          />
          {secure ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'
              }
              hitSlop={6}
              onPress={() => setHidden(value => !value)}
              style={styles.eye}
            >
              {hidden ? (
                <Eye color={colors.text.primary} size={18} opacity={0.5} />
              ) : (
                <EyeOff color={colors.text.primary} size={18} opacity={0.5} />
              )}
            </Pressable>
          ) : null}
        </Animated.View>
        {error ? (
          <TextV2
            variant="meta"
            color={errorColor}
            accessibilityLiveRegion="polite"
          >
            {error}
          </TextV2>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  box: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
  eye: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
