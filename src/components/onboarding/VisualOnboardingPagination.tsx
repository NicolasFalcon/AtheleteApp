import { StyleSheet, View } from 'react-native';

type VisualOnboardingPaginationProps = {
  activeIndex: number;
  activeColor: string;
  count: number;
};

export function VisualOnboardingPagination({
  activeIndex,
  activeColor,
  count,
}: VisualOnboardingPaginationProps) {
  return (
    <View
      accessibilityLabel={`Pantalla ${activeIndex + 1} de ${count}`}
      style={styles.row}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === activeIndex
              ? [styles.dotActive, { backgroundColor: activeColor }]
              : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dotActive: {
    width: 32,
  },
});
