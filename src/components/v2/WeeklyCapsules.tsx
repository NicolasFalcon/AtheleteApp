import { StyleSheet, View } from 'react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type CapsuleDay = {
  letter: string;
  value: number | null; // null: still to come
  isToday: boolean;
};

export type WeeklyCapsulesProps = {
  days: CapsuleDay[];
  // The value that fills a capsule (prototype: 45 min).
  fullAt: number;
  // Hides the values and fills (usuario nuevo).
  empty?: boolean;
};

// Seven tall capsules (handoff · Weekly Capsules): the fill grows from the
// bottom, today is Ember, past days are ink, future days only an outline.
export function WeeklyCapsules({
  days,
  fullAt,
  empty = false,
}: WeeklyCapsulesProps) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.row}>
      {days.map((day, index) => {
        const future = day.value === null;
        const ratio =
          empty || future ? 0 : Math.min(1, (day.value ?? 0) / fullAt);
        const showValue = !empty && !future && (day.value ?? 0) > 0;
        return (
          <View key={index} style={styles.column}>
            <TextV2
              variant="captionStrong"
              color={day.isToday ? colors.ember.base : colors.text.primary}
              style={styles.value}
            >
              {showValue ? String(day.value) : ' '}
            </TextV2>
            <View
              style={[
                styles.track,
                {
                  backgroundColor: future
                    ? 'transparent'
                    : colors.surface.muted,
                  boxShadow:
                    future || empty
                      ? `inset 0 0 0 1.5px ${colors.divider}`
                      : undefined,
                },
              ]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    height: `${ratio * 100}%`,
                    backgroundColor: day.isToday
                      ? colors.ember.base
                      : colors.text.primary,
                  },
                ]}
              />
            </View>
            <TextV2
              variant="caption"
              color={day.isToday ? colors.text.primary : colors.text.secondary}
              style={day.isToday ? styles.today : undefined}
            >
              {day.letter}
            </TextV2>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    height: 176,
  },
  column: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  value: { fontWeight: '600' },
  track: {
    width: '100%',
    height: 140,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%', borderRadius: 999 },
  today: { fontWeight: '700' },
});
