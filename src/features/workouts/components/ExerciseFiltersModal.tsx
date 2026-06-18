import { useEffect, useState } from 'react';
import { Dumbbell, Gauge, Heart, Target, X } from 'lucide-react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseFilterGroup } from '@app/features/workouts/components/ExerciseFilterGroup';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { bodyPartLabels, equipmentLabels, levelLabels } from '@app/shared';

const equipmentFilterKeys = [
  'all',
  'bodyweight',
  'dumbbells',
  'barbell',
  'machines',
  'cable',
  'bands',
  'kettlebells',
  'trx',
] as const;

const bodyPartFilterKeys = [
  'all',
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'glutes',
  'fullbody',
  'mobility',
  'cardio',
] as const;

const levelFilterKeys = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
] as const;

type ExerciseFiltersModalProps = {
  visible: boolean;
  viewMode: 'all' | 'favorites';
  equipment: string;
  bodyPart: string;
  level: string;
  onClose: () => void;
  onApply: (filters: {
    viewMode: 'all' | 'favorites';
    equipment: string;
    bodyPart: string;
    level: string;
  }) => void;
};

export function ExerciseFiltersModal({
  visible,
  viewMode,
  equipment,
  bodyPart,
  level,
  onClose,
  onApply,
}: ExerciseFiltersModalProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draftViewMode, setDraftViewMode] = useState(viewMode);
  const [draftEquipment, setDraftEquipment] = useState(equipment);
  const [draftBodyPart, setDraftBodyPart] = useState(bodyPart);
  const [draftLevel, setDraftLevel] = useState(level);

  useEffect(() => {
    if (visible) {
      setDraftViewMode(viewMode);
      setDraftEquipment(equipment);
      setDraftBodyPart(bodyPart);
      setDraftLevel(level);
    }
  }, [bodyPart, equipment, level, viewMode, visible]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(17,17,17,0.5)',
    },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: theme.radii.xl,
      borderTopRightRadius: theme.radii.xl,
      backgroundColor: theme.colors.background,
      paddingBottom: Math.max(insets.bottom, theme.spacing.md),
      overflow: 'hidden',
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginTop: 9,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      marginTop: 2,
    },
    close: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: 10,
    },
    favoriteRow: {
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    favoriteRowActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    favoriteIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    favoriteCopy: {
      flex: 1,
    },
    favoriteTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    favoriteTitleActive: {
      color: theme.colors.accentContrast,
    },
    favoriteSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      marginTop: 1,
    },
    favoriteSubtitleActive: {
      color: theme.colors.accentContrast,
      opacity: 0.7,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 10,
    },
    action: {
      flex: 1,
      minHeight: 48,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clear: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    apply: {
      backgroundColor: theme.colors.accent,
    },
    clearLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    applyLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  const clear = () => {
    setDraftViewMode('all');
    setDraftEquipment('all');
    setDraftBodyPart('all');
    setDraftLevel('all');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Filtros</Text>
              <Text style={styles.subtitle}>
                Ajusta la biblioteca a lo que necesitas.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.close}>
              <X color={theme.colors.textPrimary} size={18} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() =>
                setDraftViewMode(current =>
                  current === 'favorites' ? 'all' : 'favorites',
                )
              }
              style={[
                styles.favoriteRow,
                draftViewMode === 'favorites' ? styles.favoriteRowActive : null,
              ]}
            >
              <View style={styles.favoriteIcon}>
                <Heart
                  color={
                    draftViewMode === 'favorites'
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary
                  }
                  fill={
                    draftViewMode === 'favorites'
                      ? theme.colors.textPrimary
                      : 'transparent'
                  }
                  size={17}
                />
              </View>
              <View style={styles.favoriteCopy}>
                <Text
                  style={[
                    styles.favoriteTitle,
                    draftViewMode === 'favorites'
                      ? styles.favoriteTitleActive
                      : null,
                  ]}
                >
                  Solo favoritos
                </Text>
                <Text
                  style={[
                    styles.favoriteSubtitle,
                    draftViewMode === 'favorites'
                      ? styles.favoriteSubtitleActive
                      : null,
                  ]}
                >
                  Muestra únicamente tus ejercicios guardados.
                </Text>
              </View>
            </Pressable>
            <ExerciseFilterGroup
              title="Equipamiento"
              subtitle={
                draftEquipment === 'all'
                  ? 'Todas las opciones'
                  : equipmentLabels[draftEquipment] || draftEquipment
              }
              icon={Dumbbell}
              activeKey={draftEquipment}
              filters={equipmentFilterKeys.map(key => ({
                key,
                label: key === 'all' ? 'Todos' : equipmentLabels[key] || key,
              }))}
              onChange={setDraftEquipment}
            />
            <ExerciseFilterGroup
              title="Zona del cuerpo"
              subtitle={
                draftBodyPart === 'all'
                  ? 'Todas las opciones'
                  : bodyPartLabels[draftBodyPart] || draftBodyPart
              }
              icon={Target}
              activeKey={draftBodyPart}
              filters={bodyPartFilterKeys.map(key => ({
                key,
                label: key === 'all' ? 'Todos' : bodyPartLabels[key] || key,
              }))}
              onChange={setDraftBodyPart}
            />
            <ExerciseFilterGroup
              title="Nivel"
              subtitle={
                draftLevel === 'all'
                  ? 'Todas las opciones'
                  : levelLabels[draftLevel] || draftLevel
              }
              icon={Gauge}
              activeKey={draftLevel}
              filters={levelFilterKeys.map(key => ({
                key,
                label: key === 'all' ? 'Todos' : levelLabels[key] || key,
              }))}
              onChange={setDraftLevel}
            />
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={clear} style={[styles.action, styles.clear]}>
              <Text style={styles.clearLabel}>Limpiar</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                onApply({
                  viewMode: draftViewMode,
                  equipment: draftEquipment,
                  bodyPart: draftBodyPart,
                  level: draftLevel,
                })
              }
              style={[styles.action, styles.apply]}
            >
              <Text style={styles.applyLabel}>Aplicar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
