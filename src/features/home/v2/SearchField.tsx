import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type SearchFieldProps = {
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
  // Without onChangeText the field is a button (opens a search screen).
  onPress?: () => void;
  autoFocus?: boolean;
  radius?: 12 | 14;
  style?: StyleProp<ViewStyle>;
};

// Search pill (handoff §5 "Search"): 48 pt, muted surface, magnifier at the
// left, 17 pt text.
export const SearchField = forwardRef<TextInput, SearchFieldProps>(
  function SearchField(
    {
      placeholder,
      value = '',
      onChangeText,
      onPress,
      autoFocus,
      radius = 12,
      style,
    },
    ref,
  ) {
    const { colors } = useThemeV2();
    const content = (
      <>
        <Search
          size={18}
          color={colors.text.primary}
          strokeWidth={2}
          style={styles.icon}
        />
        {onChangeText ? (
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            autoFocus={autoFocus}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            style={[styles.input, { color: colors.text.primary }]}
          />
        ) : (
          <TextV2
            variant="bodyL"
            tone="tertiary"
            numberOfLines={1}
            style={[styles.flex, styles.placeholder]}
          >
            {placeholder}
          </TextV2>
        )}
        {onChangeText && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            hitSlop={10}
            onPress={() => onChangeText('')}
          >
            <X size={16} color={colors.text.secondary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </>
    );

    const boxStyle = [
      styles.box,
      { borderRadius: radius, backgroundColor: colors.surface.muted },
      style,
    ];

    return onChangeText ? (
      <View style={boxStyle}>{content}</View>
    ) : (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        onPress={onPress}
        style={boxStyle}
      >
        {content}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  box: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  icon: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  flex: {
    flex: 1,
  },
  placeholder: {
    fontSize: 17,
  },
});
