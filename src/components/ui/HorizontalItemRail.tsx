import type {PropsWithChildren} from 'react';
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type HorizontalItemRailProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  gap?: number;
  paddingRight?: number;
}>;

export function HorizontalItemRail({
  children,
  contentStyle,
  gap,
  paddingRight,
}: HorizontalItemRailProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: gap ?? theme.spacing.sm,
      paddingRight: paddingRight ?? theme.spacing.sm,
    },
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentStyle]}>
      {children}
    </ScrollView>
  );
}
