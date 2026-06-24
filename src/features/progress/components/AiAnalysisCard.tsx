import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowRight, Sparkles, X } from 'lucide-react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AiAnalysisCardProps = {
  insights: string[];
};

function splitInsights(insights: string[]) {
  const fallback = [
    'Aún no hay suficiente información para generar un análisis completo.',
    'Registra entrenos, nutrición e hidratación para recibir mejores insights.',
  ];
  const source = insights.length > 0 ? insights : fallback;

  return {
    summary: source.slice(0, 2),
    insights: source.slice(2, 4),
    recommendations: [
      'Completa una sesión más esta semana para sostener el ritmo.',
      'Registra tu hidratación hoy para mejorar la lectura del progreso.',
      'Mantén tu racha activa con una acción breve.',
    ],
  };
}

export function AiAnalysisCard({ insights }: AiAnalysisCardProps) {
  const { theme } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(420)).current;
  const sections = useMemo(() => splitInsights(insights), [insights]);

  const close = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(420);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 8 && gesture.dy > 0,
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 86 || gesture.vy > 1.1) {
          close();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 240,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const styles = StyleSheet.create({
    trigger: {
      padding: 14,
      borderRadius: theme.radii.md,
      gap: 0,
    },
    triggerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    triggerCopy: {
      flex: 1,
      gap: 3,
    },
    triggerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 19,
    },
    triggerSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
    },
    chevron: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      maxHeight: '86%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: theme.colors.background,
      paddingTop: 8,
      overflow: 'hidden',
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginVertical: 8,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 22,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 27,
      marginTop: 2,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    section: {
      padding: 14,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 18,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.textPrimary,
      marginTop: 7,
      opacity: 0.78,
    },
    itemText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
  });

  const renderSection = (title: string, items: string[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(item => (
        <View key={item} style={styles.item}>
          <View style={styles.dot} />
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [pressed ? { opacity: 0.9 } : null]}
      >
        <Card style={styles.trigger}>
          <View style={styles.triggerContent}>
            <View style={styles.iconWrap}>
              <Sparkles
                color={theme.colors.textPrimary}
                size={17}
                strokeWidth={2}
              />
            </View>
            <View style={styles.triggerCopy}>
              <Text style={styles.triggerTitle}>Análisis IA</Text>
              <Text style={styles.triggerSubtitle}>
                Ver insights y próximos pasos
              </Text>
            </View>
            <View style={styles.chevron}>
              <ArrowRight
                color={theme.colors.textPrimary}
                size={17}
                strokeWidth={2}
              />
            </View>
          </View>
        </Card>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={close}
      >
        <Pressable style={styles.overlay} onPress={close}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <Pressable onPress={() => undefined}>
              <View style={styles.handle} />
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.header}>
                  <View>
                    <Text style={styles.eyebrow}>Resumen inteligente</Text>
                    <Text style={styles.title}>Análisis IA</Text>
                  </View>
                  <Pressable
                    onPress={close}
                    style={({ pressed }) => [
                      styles.closeButton,
                      pressed ? { opacity: 0.86 } : null,
                    ]}
                  >
                    <X
                      color={theme.colors.textPrimary}
                      size={18}
                      strokeWidth={2.1}
                    />
                  </Pressable>
                </View>

                {renderSection('Resumen', sections.summary)}
                {renderSection('Insights', sections.insights)}
                {renderSection('Recomendaciones', sections.recommendations)}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
