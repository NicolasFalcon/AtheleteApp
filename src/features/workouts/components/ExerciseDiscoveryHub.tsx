import type { ComponentType, ReactNode } from 'react';
import {
  Activity,
  Cable,
  ChevronRight,
  Dumbbell,
  Settings2,
  SlidersHorizontal,
  Weight,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  ArmsBodyPartIcon,
  BackBodyPartIcon,
  ChestBodyPartIcon,
  CoreBodyPartIcon,
  GlutesBodyPartIcon,
  LegsBodyPartIcon,
  ShouldersBodyPartIcon,
} from '@app/assets/icons/body-parts';
import { ExerciseFiltersModal } from '@app/features/workouts/components/ExerciseFiltersModal';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useState } from 'react';

type CategoryIcon = ComponentType<{
  color?: string;
  width?: number;
  height?: number;
  size?: number;
  strokeWidth?: number;
}>;

const bodyParts: Array<{
  key: string;
  label: string;
  Icon: CategoryIcon;
}> = [
  { key: 'chest', label: 'Pecho', Icon: ChestBodyPartIcon },
  { key: 'back', label: 'Espalda', Icon: BackBodyPartIcon },
  { key: 'legs', label: 'Piernas', Icon: LegsBodyPartIcon },
  { key: 'shoulders', label: 'Hombros', Icon: ShouldersBodyPartIcon },
  { key: 'arms', label: 'Brazos', Icon: ArmsBodyPartIcon },
  { key: 'core', label: 'Core', Icon: CoreBodyPartIcon },
  { key: 'glutes', label: 'Glúteos', Icon: GlutesBodyPartIcon },
];

const equipment: Array<{
  key: string;
  label: string;
  Icon: CategoryIcon;
}> = [
  { key: 'bodyweight', label: 'Peso corporal', Icon: Activity },
  { key: 'dumbbells', label: 'Mancuernas', Icon: Dumbbell },
  { key: 'barbell', label: 'Barra', Icon: Weight },
  { key: 'machines', label: 'Máquinas', Icon: Settings2 },
  { key: 'cable', label: 'Cable', Icon: Cable },
  { key: 'kettlebells', label: 'Kettlebell', Icon: Dumbbell },
];

type ExerciseDiscoveryHubProps = {
  modeControl: ReactNode;
  bottomInset: number;
  viewMode: 'all' | 'favorites';
  equipmentFilter: string;
  bodyPartFilter: string;
  levelFilter: string;
  onOpenResults: () => void;
  onSelectBodyPart: (key: string) => void;
  onSelectEquipment: (key: string) => void;
  onApplyFilters: (filters: {
    viewMode: 'all' | 'favorites';
    equipment: string;
    bodyPart: string;
    level: string;
  }) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export function ExerciseDiscoveryHub({
  modeControl,
  bottomInset,
  viewMode,
  equipmentFilter,
  bodyPartFilter,
  levelFilter,
  onOpenResults,
  onSelectBodyPart,
  onSelectEquipment,
  onApplyFilters,
  onScroll,
}: ExerciseDiscoveryHubProps) {
  const { theme } = useAppTheme();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const appliedCount =
    [equipmentFilter, bodyPartFilter, levelFilter].filter(
      value => value !== 'all',
    ).length + (viewMode === 'favorites' ? 1 : 0);

  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: bottomInset + theme.spacing.lg,
      gap: 25,
    },
    intro: {
      gap: 16,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 27,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.9,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 3,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterButton: {
      minHeight: 42,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.colors.accent,
    },
    filterLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    filterCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    filterCountLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
    },
    filterHint: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 19,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: -0.35,
    },
    sectionSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      marginTop: 3,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    category: {
      width: '22.7%',
      minHeight: 94,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      paddingHorizontal: 5,
      ...theme.elevations.card,
    },
    categoryIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    categoryLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'center',
    },
    equipmentRail: {
      gap: 10,
      paddingRight: theme.spacing.md,
      paddingBottom: 3,
    },
    equipmentCard: {
      width: 116,
      minHeight: 108,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 13,
      justifyContent: 'space-between',
      ...theme.elevations.card,
    },
    equipmentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    equipmentLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    viewAll: {
      minHeight: 58,
      borderRadius: theme.radii.md,
      paddingHorizontal: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.accent,
    },
    viewAllTitle: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    viewAllSubtitle: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      opacity: 0.68,
      marginTop: 2,
    },
  });

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {modeControl}

        <View style={styles.intro}>
          <View>
            <Text style={styles.title}>Encuentra tu próximo ejercicio</Text>
            <Text style={styles.subtitle}>
              Explora por zona o equipamiento y entra directo a los movimientos
              que necesitas.
            </Text>
          </View>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setFiltersVisible(true)}
              style={styles.filterButton}
            >
              <SlidersHorizontal
                color={theme.colors.accentContrast}
                size={15}
                strokeWidth={2}
              />
              <Text style={styles.filterLabel}>Filtros</Text>
              {appliedCount > 0 ? (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountLabel}>{appliedCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Text style={styles.filterHint}>
              {appliedCount > 0
                ? `${appliedCount} filtro${
                    appliedCount === 1 ? '' : 's'
                  } activo${appliedCount === 1 ? '' : 's'}`
                : 'Refina por nivel, favoritos y más'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View>
            <Text style={styles.sectionTitle}>Por zona del cuerpo</Text>
            <Text style={styles.sectionSubtitle}>
              Empieza por el área que quieres trabajar.
            </Text>
          </View>
          <View style={styles.categoryGrid}>
            {bodyParts.map(({ key, label, Icon }) => (
              <Pressable
                key={key}
                onPress={() => onSelectBodyPart(key)}
                style={styles.category}
              >
                <View style={styles.categoryIcon}>
                  <Icon
                    color={theme.colors.textPrimary}
                    width={23}
                    height={23}
                  />
                </View>
                <Text style={styles.categoryLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View>
            <Text style={styles.sectionTitle}>Por equipamiento</Text>
            <Text style={styles.sectionSubtitle}>
              Ve directo a lo que tienes disponible.
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.equipmentRail}
          >
            {equipment.map(({ key, label, Icon }) => (
              <Pressable
                key={key}
                onPress={() => onSelectEquipment(key)}
                style={styles.equipmentCard}
              >
                <View style={styles.equipmentIcon}>
                  <Icon
                    color={theme.colors.textPrimary}
                    size={20}
                    strokeWidth={1.8}
                  />
                </View>
                <Text style={styles.equipmentLabel}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable onPress={onOpenResults} style={styles.viewAll}>
          <View>
            <Text style={styles.viewAllTitle}>Ver todos los ejercicios</Text>
            <Text style={styles.viewAllSubtitle}>
              Biblioteca completa con carga progresiva
            </Text>
          </View>
          <ChevronRight
            color={theme.colors.accentContrast}
            size={20}
            strokeWidth={2}
          />
        </Pressable>
      </ScrollView>

      <ExerciseFiltersModal
        visible={filtersVisible}
        viewMode={viewMode}
        equipment={equipmentFilter}
        bodyPart={bodyPartFilter}
        level={levelFilter}
        onClose={() => setFiltersVisible(false)}
        onApply={filters => {
          onApplyFilters(filters);
          setFiltersVisible(false);
        }}
      />
    </>
  );
}
