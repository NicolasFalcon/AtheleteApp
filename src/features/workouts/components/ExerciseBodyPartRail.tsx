import type { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArmsBodyPartIcon,
  BackBodyPartIcon,
  ChestBodyPartIcon,
  CoreBodyPartIcon,
  GlutesBodyPartIcon,
  LegsBodyPartIcon,
  ShouldersBodyPartIcon,
} from '@app/assets/icons/body-parts';
import { useAppTheme } from '@app/hooks/useAppTheme';

const bodyParts: Array<{
  key: string;
  label: string;
  Icon: ComponentType<{
    color?: string;
    width?: number;
    height?: number;
  }>;
}> = [
  { key: 'chest', label: 'Pecho', Icon: ChestBodyPartIcon },
  { key: 'back', label: 'Espalda', Icon: BackBodyPartIcon },
  { key: 'legs', label: 'Piernas', Icon: LegsBodyPartIcon },
  { key: 'shoulders', label: 'Hombros', Icon: ShouldersBodyPartIcon },
  { key: 'arms', label: 'Brazos', Icon: ArmsBodyPartIcon },
  { key: 'core', label: 'Core', Icon: CoreBodyPartIcon },
  { key: 'glutes', label: 'Glúteos', Icon: GlutesBodyPartIcon },
];

type ExerciseBodyPartRailProps = {
  activeKey: string;
  onSelect: (key: string) => void;
};

export function ExerciseBodyPartRail({
  activeKey,
  onSelect,
}: ExerciseBodyPartRailProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    section: {
      gap: 9,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      marginTop: 2,
    },
    content: {
      gap: 9,
      paddingRight: theme.spacing.md,
      paddingBottom: 2,
    },
    item: {
      width: 84,
      minHeight: 82,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 9,
    },
    itemActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconActive: {
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    labelActive: {
      color: theme.colors.accentContrast,
    },
  });

  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.title}>Explora por zona del cuerpo</Text>
        <Text style={styles.subtitle}>
          Llega más rápido al movimiento que necesitas.
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {bodyParts.map(({ key, label, Icon }) => {
          const active = activeKey === key;

          return (
            <Pressable
              key={key}
              onPress={() => onSelect(active ? 'all' : key)}
              style={[styles.item, active ? styles.itemActive : null]}
            >
              <View style={[styles.icon, active ? styles.iconActive : null]}>
                <Icon
                  color={
                    active
                      ? theme.colors.accentContrast
                      : theme.colors.textSecondary
                  }
                  width={19}
                  height={19}
                />
              </View>
              <Text style={[styles.label, active ? styles.labelActive : null]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
