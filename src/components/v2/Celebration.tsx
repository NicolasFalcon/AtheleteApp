import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Svg, { Polygon } from 'react-native-svg';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { haptics } from '@app/components/v2/haptics';

export type CelebrationProps = {
  visible: boolean;
  icon: LucideIcon;
  // "Reto completado" · "Nuevo récord"
  eyebrow: string;
  // The figure: "33" · "205"
  value: string;
  // Next to the figure: "de 33 días" · "kg × 1"
  unit?: string;
  subtitle?: string;
  hint?: string;
  onClose: () => void;
};

// Celebration, level 3 (OVERLAY_01 / handoff): full-screen dark with two
// expanding Ember rings, the medal with a pop and a phrase. A tap closes it.
export function Celebration({
  visible,
  icon: Icon,
  eyebrow,
  value,
  unit,
  subtitle,
  hint = 'Toca para continuar',
  onClose,
}: CelebrationProps) {
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    haptics.success();
    ringA.setValue(0);
    ringB.setValue(0);
    pop.setValue(0);
    Animated.parallel([
      Animated.timing(ringA, {
        toValue: 1,
        duration: 1400,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(ringB, {
        toValue: 1,
        duration: 1400,
        delay: 450,
        useNativeDriver: true,
      }),
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [pop, ringA, ringB, visible]);

  const ring = (value: Animated.Value, width: number) => ({
    opacity: value.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.9, 0],
    }),
    transform: [
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 2.2],
        }),
      },
    ],
    borderWidth: width,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        onPress={onClose}
        style={styles.screen}
      >
        <View style={styles.center}>
          <Animated.View style={[styles.ring, ring(ringA, 2)]} />
          <Animated.View style={[styles.ring, ring(ringB, 1)]} />
          <Animated.View style={[styles.hex, { transform: [{ scale: pop }] }]}>
            <Svg width={92} height={102} style={StyleSheet.absoluteFill}>
              <Polygon
                points="46,0 87.4,25.5 87.4,76.5 46,102 4.6,76.5 4.6,25.5"
                fill="#FF5B1F"
              />
            </Svg>
            <Icon size={36} color="#121212" strokeWidth={2} />
          </Animated.View>
        </View>
        <TextV2 variant="eyebrow" color="#A8A6A1">
          {eyebrow}
        </TextV2>
        <View style={styles.figure}>
          <TextV2 variant="displayM" color="#FFFFFF" style={styles.value}>
            {value}
          </TextV2>
          {unit ? (
            <TextV2 variant="sub" color="#A8A6A1" style={styles.unit}>
              {unit}
            </TextV2>
          ) : null}
        </View>
        {subtitle ? (
          <TextV2
            variant="bodyL"
            color="#E8E6E1"
            align="center"
            style={styles.subtitle}
          >
            {subtitle}
          </TextV2>
        ) : null}
        <TextV2
          variant="meta"
          color="#8C8A85"
          style={[styles.hint, { bottom: 48 }]}
        >
          {hint}
        </TextV2>
      </PressableScale>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  center: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderColor: '#FF5B1F',
  },
  hex: {
    width: 92,
    height: 102,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figure: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { fontSize: 56, fontWeight: '600' },
  unit: { fontWeight: '400' },
  subtitle: { maxWidth: 280 },
  hint: { position: 'absolute' },
});
