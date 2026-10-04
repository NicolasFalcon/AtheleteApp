import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextV2, useThemeV2 } from '@app/components/v2';

// Group of Ajustes: a 11/600 uppercase title over flat rows.
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { colors } = useThemeV2();
  return (
    <View>
      <TextV2 variant="eyebrow" color={colors.text.secondary} style={styles.title}>
        {title}
      </TextV2>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ title: { paddingBottom: 4 } });
