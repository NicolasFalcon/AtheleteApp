import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { DarkThumb } from '@app/components/v2/ExerciseRow';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type RoutinePathStep = {
  key: string;
  title: string;
  subtitle?: string;
  thumbnail?: ImageSourcePropType;
  trailing?: ReactNode;
  onPress?: () => void;
};

export type RoutinePathProps = {
  steps: RoutinePathStep[];
  // 'detail': 32 pt nodes + 56 pt thumbnails (Detalle de rutina);
  // 'compact': 28 pt nodes, no thumbnail (Nueva rutina · Revisión).
  variant?: 'detail' | 'compact';
  style?: StyleProp<ViewStyle>;
};

// Routine Path (handoff §5): exercises as a route of numbered nodes joined by
// a line, not as loose rows.
export function RoutinePath({
  steps,
  variant = 'detail',
  style,
}: RoutinePathProps) {
  const { colors } = useThemeV2();
  const compact = variant === 'compact';
  const node = compact ? 28 : 32;

  return (
    <View style={[styles.path, style]}>
      {steps.length > 1 ? (
        <View
          style={[
            styles.line,
            {
              left: node / 2 - 1,
              top: compact ? 22 : 30,
              bottom: compact ? 22 : 30,
              backgroundColor: colors.divider,
            },
          ]}
        />
      ) : null}
      {steps.map((step, index) => {
        const content = (
          <>
            <View
              style={[
                styles.node,
                {
                  width: node,
                  height: node,
                  borderRadius: node / 2,
                  backgroundColor: colors.bg,
                  borderColor: colors.text.primary,
                },
              ]}
            >
              <TextV2
                variant={compact ? 'captionStrong' : 'metaStrong'}
                style={styles.nodeText}
              >
                {String(index + 1)}
              </TextV2>
            </View>
            {!compact && step.thumbnail ? (
              <DarkThumb
                source={step.thumbnail}
                size={56}
                radius={14}
                ring="none"
              />
            ) : null}
            <View style={styles.texts}>
              <TextV2
                variant={compact ? 'body' : 'bodyStrong'}
                style={compact ? styles.compactTitle : styles.title}
                numberOfLines={2}
              >
                {step.title}
              </TextV2>
              {step.subtitle ? (
                <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
                  {step.subtitle}
                </TextV2>
              ) : null}
            </View>
            {step.trailing}
          </>
        );

        return step.onPress ? (
          <PressableScale
            key={step.key}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1}. ${step.title}${
              step.subtitle ? `, ${step.subtitle}` : ''
            }`}
            onPress={step.onPress}
            style={styles.step}
          >
            {content}
          </PressableScale>
        ) : (
          <View key={step.key} style={styles.step}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  path: {
    position: 'relative',
  },
  line: {
    position: 'absolute',
    width: 2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  node: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: {
    fontWeight: '700',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    lineHeight: 20,
  },
  compactTitle: {
    fontWeight: '500',
  },
});
