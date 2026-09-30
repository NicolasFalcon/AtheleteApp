import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type RowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: string | ReactNode;
  trailing?: 'chevron' | ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  divider?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Flat row separated by a 1 pt divider (Ajustes, Perfil, Apple Health…).
export function Row({
  title,
  subtitle,
  leading,
  value,
  trailing,
  onPress,
  destructive = false,
  divider = true,
  disabled = false,
  accessibilityLabel,
  style,
}: RowProps) {
  const { colors, layout } = useThemeV2();
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.texts}>
        <TextV2
          variant="body"
          tone={destructive ? 'ember' : disabled ? 'disabled' : 'primary'}
          numberOfLines={1}
        >
          {title}
        </TextV2>
        {subtitle ? (
          <TextV2 variant="meta" tone="secondary" numberOfLines={2}>
            {subtitle}
          </TextV2>
        ) : null}
      </View>
      {typeof value === 'string' ? (
        <TextV2 variant="body" tone="secondary" numberOfLines={1}>
          {value}
        </TextV2>
      ) : (
        value ?? null
      )}
      {trailing === 'chevron' ? (
        <ChevronRight color={colors.text.tertiary} size={18} strokeWidth={2} />
      ) : (
        trailing ?? null
      )}
    </>
  );
  const rowStyle = [
    styles.row,
    {
      minHeight: subtitle ? layout.rowTwoLineHeight : layout.rowMinHeight,
      borderBottomWidth: divider ? 1 : 0,
      borderBottomColor: colors.divider,
    },
    style,
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={rowStyle}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
