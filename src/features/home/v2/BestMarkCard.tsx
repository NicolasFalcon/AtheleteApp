import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Plus } from 'lucide-react-native';
import {
  Button,
  SectionHeader,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';

export type BestMark = {
  exerciseName: string;
  value: string; // "140"
  unit: string; // "kg × 1 · 9 abr"
  isNew: boolean;
  curve: { points: string; last: [number, number] } | null;
};

type BestMarkCardProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  mark: BestMark | null;
  onOpenRecords: () => void;
  onRegister: () => void;
};

// "Tu mejor marca": best value of the latest recorded exercise + mini curve.
export function BestMarkCard({
  loading,
  error,
  onRetry,
  mark,
  onOpenRecords,
  onRegister,
}: BestMarkCardProps) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.block}>
      <SectionHeader
        title="Tu mejor marca"
        variant="eyebrow"
        action={{ label: 'Récords', onPress: onOpenRecords }}
      />
      {error ? (
        <BlockError
          message="No pudimos cargar tus récords."
          onRetry={onRetry}
        />
      ) : loading ? (
        <SkeletonGroup>
          <View style={styles.row}>
            <View style={styles.texts}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="45%" height={40} />
            </View>
            <Skeleton width={112} height={36} />
          </View>
        </SkeletonGroup>
      ) : (
        <View style={styles.row}>
          <View style={styles.texts}>
            <View style={styles.nameRow}>
              <TextV2
                variant="bodyStrong"
                tone="bodySoft"
                numberOfLines={1}
                style={styles.name}
              >
                {mark ? mark.exerciseName : 'Aún sin récords'}
              </TextV2>
              {mark?.isNew ? (
                <View
                  style={[
                    styles.newTag,
                    { backgroundColor: colors.ember.base },
                  ]}
                >
                  <TextV2
                    variant="micro"
                    color={colors.ember.onText}
                    style={styles.newText}
                  >
                    NUEVO
                  </TextV2>
                </View>
              ) : null}
            </View>
            {mark ? (
              <View style={styles.valueRow}>
                <TextV2 variant="displayS">{mark.value}</TextV2>
                <TextV2 variant="body" tone="secondary" numberOfLines={1}>
                  {mark.unit}
                </TextV2>
              </View>
            ) : (
              <TextV2 variant="meta" tone="secondary">
                Registra tu primera marca y verás aquí cómo progresa.
              </TextV2>
            )}
          </View>
          <View style={styles.side}>
            {mark?.curve ? (
              <Svg width={112} height={36} style={styles.curve}>
                <Polyline
                  points={mark.curve.points}
                  fill="none"
                  stroke={colors.chart.muted}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <Circle
                  cx={mark.curve.last[0]}
                  cy={mark.curve.last[1]}
                  r={9}
                  fill={colors.ember.base}
                  opacity={0.16}
                />
                <Circle
                  cx={mark.curve.last[0]}
                  cy={mark.curve.last[1]}
                  r={4}
                  fill={colors.ember.base}
                />
              </Svg>
            ) : null}
            <Button
              label="Registrar"
              variant="outline"
              size="sm"
              icon={Plus}
              onPress={onRegister}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontWeight: '500',
  },
  newTag: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    justifyContent: 'center',
  },
  newText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  side: {
    alignItems: 'flex-end',
    gap: 10,
    paddingBottom: 4,
  },
  curve: {
    overflow: 'visible',
  },
});
