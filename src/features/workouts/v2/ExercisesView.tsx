import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Camera, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import {
  EllieOrb,
  EquipmentBubble,
  PressableScale,
  SearchField,
  Skeleton,
  SkeletonGroup,
  TextV2,
  ZoneMosaic,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  EQUIPMENT_IMAGES,
  SCAN_IMAGE,
  MUSCLE_IMAGES,
} from '@app/features/workouts/workoutAssets';
import {
  countBy,
  EQUIPMENT,
  ZONES,
  type EquipmentKey,
  type ZoneKey,
} from '@app/features/workouts/workoutsModel';
import { EQUIPMENT_ICONS } from '@app/features/workouts/v2/workoutIcons';
import type { LibraryExercise } from '@app/shared';

export type ExercisesViewProps = {
  exercises: LibraryExercise[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSearch: () => void;
  onOpenFilters: () => void;
  onOpenZone: (zone: ZoneKey) => void;
  onOpenEquipment: (equipment: EquipmentKey) => void;
  onOpenAll: () => void;
};

const ZONE_KEYS = ZONES.map(zone => zone.key);
const EQUIPMENT_KEYS = EQUIPMENT.map(item => item.key);

// Entrenos · Ejercicios (WORKOUTS_03): search + filters, Escanear máquina,
// Por zona (handoff §16) and Por equipamiento.
export function ExercisesView({
  exercises,
  loading,
  error,
  onRetry,
  onSearch,
  onOpenFilters,
  onOpenZone,
  onOpenEquipment,
  onOpenAll,
}: ExercisesViewProps) {
  const { colors, layout } = useThemeV2();
  const zoneCounts = countBy(exercises, 'bodyPart', ZONE_KEYS);
  const equipmentCounts = countBy(exercises, 'equipment', EQUIPMENT_KEYS);

  return (
    <>
      <View style={styles.searchRow}>
        <SearchField
          radius={14}
          placeholder={
            loading
              ? 'Buscar ejercicios'
              : `Buscar entre ${exercises.length} ejercicios`
          }
          onPress={onSearch}
          style={styles.flex}
        />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Filtros"
          onPress={onOpenFilters}
          style={[styles.filters, { backgroundColor: colors.cta.primary }]}
        >
          <SlidersHorizontal
            size={18}
            color={colors.cta.primaryText}
            strokeWidth={2}
          />
        </PressableScale>
      </View>

      <ScanCard />

      {error ? (
        <BlockError
          message="No pudimos cargar los ejercicios."
          onRetry={onRetry}
        />
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TextV2 variant="section">Por zona</TextV2>
              <TextV2 variant="meta" tone="secondary">
                {`${ZONES.length} grupos`}
              </TextV2>
            </View>
            {loading ? (
              <SkeletonGroup>
                <View style={styles.mosaicSkeleton}>
                  <View style={styles.flexGap}>
                    <Skeleton height={246} radius={22} />
                    <Skeleton height={118} radius={22} />
                  </View>
                  <View style={styles.flexGap}>
                    <Skeleton height={118} radius={22} />
                    <Skeleton height={118} radius={22} />
                    <Skeleton height={118} radius={22} />
                  </View>
                </View>
              </SkeletonGroup>
            ) : (
              <ZoneMosaic
                items={ZONES.map(zone => ({
                  ...zone,
                  count: zoneCounts[zone.key],
                  image: MUSCLE_IMAGES[zone.key],
                  onPress: () => onOpenZone(zone.key),
                }))}
              />
            )}
          </View>

          <View style={styles.equipmentSection}>
            <TextV2 variant="section">Por equipamiento</TextV2>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -layout.gutter }}
              contentContainerStyle={[
                styles.equipmentRow,
                { paddingHorizontal: layout.gutter },
              ]}
            >
              {EQUIPMENT.map(item => (
                <EquipmentBubble
                  key={item.key}
                  label={item.label}
                  count={equipmentCounts[item.key]}
                  icon={EQUIPMENT_ICONS[item.key]}
                  image={EQUIPMENT_IMAGES[item.key]}
                  onPress={() => onOpenEquipment(item.key)}
                />
              ))}
            </ScrollView>
          </View>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Ver todos los ejercicios, ${exercises.length}`}
            onPress={onOpenAll}
            style={[
              styles.allRow,
              {
                borderTopColor: colors.divider,
                borderBottomColor: colors.divider,
              },
            ]}
          >
            <TextV2 variant="bodyL" style={styles.allLabel}>
              Ver todos los ejercicios
            </TextV2>
            <View style={styles.allCount}>
              <TextV2
                variant="label"
                tone="secondary"
                style={styles.allCountText}
              >
                {loading ? '' : String(exercises.length)}
              </TextV2>
              <ChevronRight
                size={16}
                color={colors.text.secondary}
                strokeWidth={2}
              />
            </View>
          </PressableScale>
        </>
      )}
    </>
  );
}

// "Escanear máquina · Con ELLIE". Shown without action: the Scan feature is
// pending (TODO(scan): open the camera flow, handoff §10).
function ScanCard() {
  const { scene } = useThemeV2();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Escanear máquina con ELLIE. Próximamente."
      style={[styles.scan, { backgroundColor: scene.plate }]}
    >
      <View style={styles.scanPhoto}>
        <Image
          source={SCAN_IMAGE}
          resizeMode="cover"
          style={styles.fillImage}
        />
        <LinearGradient
          colors={[scene.plate, 'rgba(20,19,18,0)']}
          locations={[0, 0.55]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.brackets}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>
      <View style={styles.scanTexts}>
        <View style={styles.scanEyebrow}>
          <EllieOrb size={18} />
          <TextV2 variant="eyebrow" color="#A8A6A1">
            Con ELLIE
          </TextV2>
        </View>
        <View style={styles.scanBody}>
          <View style={styles.scanTitle}>
            <Camera size={18} color="#FFFFFF" strokeWidth={2} />
            <TextV2 variant="sub" color="#FFFFFF" style={styles.scanTitleText}>
              Escanear máquina
            </TextV2>
          </View>
          <TextV2 variant="meta" color="#A8A6A1" style={styles.scanSub}>
            Hazle una foto y te explico cómo usarla.
          </TextV2>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  flexGap: {
    flex: 1,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filters: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  mosaicSkeleton: {
    flexDirection: 'row',
    gap: 10,
  },
  equipmentSection: {
    gap: 14,
  },
  equipmentRow: {
    gap: 16,
    paddingBottom: 4,
  },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  allLabel: {
    fontWeight: '600',
  },
  allCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allCountText: {
    fontWeight: '500',
  },
  scan: {
    height: 132,
    borderRadius: 24,
    overflow: 'hidden',
  },
  scanPhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '62%',
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  brackets: {
    position: 'absolute',
    right: 26,
    top: 24,
    width: 84,
    height: 84,
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#FF5B1F',
  },
  cornerTL: {
    left: 0,
    top: 0,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 9,
  },
  cornerTR: {
    right: 0,
    top: 0,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderTopRightRadius: 9,
  },
  cornerBL: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 9,
  },
  cornerBR: {
    right: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 9,
  },
  scanTexts: {
    position: 'absolute',
    left: 18,
    top: 18,
    bottom: 18,
    maxWidth: 240,
    justifyContent: 'space-between',
  },
  scanEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBody: {
    gap: 3,
  },
  scanTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanTitleText: {
    fontSize: 19,
  },
  scanSub: {
    lineHeight: 17,
  },
});
