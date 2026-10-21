import type { ComponentProps } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  ArrowRight,
  ArrowUp,
  Camera,
  ChartColumn,
  Clock,
  Dumbbell,
  Moon,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';
import {
  LivingHalo,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { SCAN_IMAGE } from '@app/features/workouts/workoutAssets';
import { CANNED_PROMPTS, type EllieMode } from '@app/features/ellie/chatModel';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

export type EllieAsk = { text: string; mode?: EllieMode };

// Cover surfaces (handoff 25.9): Light card #FFFFFF with a #E4E2DD border,
// Dark card #1C1B19 with a white 8 % border.
function useCoverColors() {
  const { colors } = useThemeV2();
  const { isDark } = useAppTheme();
  return {
    card: colors.surface.raised,
    border: isDark ? 'rgba(255,255,255,.08)' : colors.ellie.divider,
    ring: isDark ? 'rgba(255,255,255,.08)' : 'rgba(18,18,18,.08)',
    secondary: colors.ellie.textSecondary,
  };
}

// "También puedo ayudarte con": the prototype's four cards.
export const HELP_CARDS: {
  icon: LucideIcon;
  title: string;
  description: string;
  ask: EllieAsk;
}[] = [
  {
    icon: Dumbbell,
    title: 'Entrenamiento',
    description: 'Ajustar, planificar o modificar',
    ask: { text: 'Ajusta mi plan de entrenamiento', mode: 'generate_workout' },
  },
  {
    icon: Utensils,
    title: 'Nutrición',
    description: 'Revisar ingesta y objetivos',
    ask: { text: 'Revisar mi nutrición' },
  },
  {
    icon: Moon,
    title: 'Recuperación',
    description: 'Sueño, fatiga y bienestar',
    ask: { text: 'Mejorar mi recuperación' },
  },
  {
    icon: ChartColumn,
    title: 'Análisis',
    description: 'Ver progreso y tendencias',
    ask: { text: 'Analizar mi semana' },
  },
];

// Wordmark "ELLIE" over "ATHELETE INTELLIGENCE", and the history button
// (clock, 44 pt) on the right.
export function EllieHeader({ onHistory }: { onHistory: () => void }) {
  const { colors } = useThemeV2();
  const cover = useCoverColors();

  return (
    <View style={styles.header}>
      <View style={styles.headerSide} />
      <View style={styles.wordmark} accessibilityRole="header">
        <TextV2 style={styles.ellie}>ELLIE</TextV2>
        <TextV2 color={cover.secondary} style={styles.intelligence}>
          ATHELETE INTELLIGENCE
        </TextV2>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Conversaciones"
        onPress={onHistory}
        style={[styles.history, { boxShadow: `inset 0 0 0 1px ${cover.border}` }]}
      >
        <Clock size={18} color={colors.text.primary} strokeWidth={1.8} style={styles.historyIcon} />
      </PressableScale>
    </View>
  );
}

// The Living Halo (168 pt) inside a 236 pt ring with an Ember arc, and the
// "ELLIE EN LÍNEA" pill on the ring's lower edge.
export function EllieOrbStage({
  orbState,
  haloStyle,
  onLayout,
}: {
  orbState: 'idle' | 'offline';
  // Entry animation: the halo grows from the tab.
  haloStyle?: AnimatedViewStyle;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useThemeV2();
  const cover = useCoverColors();
  const online = orbState !== 'offline';

  return (
    <View style={styles.stage} onLayout={onLayout}>
      <View style={[styles.ring, { borderColor: cover.ring }]} />
      <View style={[styles.ring, styles.arc, { borderRightColor: colors.ember.base }]} />
      <Animated.View style={haloStyle}>
        <LivingHalo size="cover" state={orbState} shadow />
      </Animated.View>
      <View
        style={[
          styles.status,
          { backgroundColor: cover.card, boxShadow: `inset 0 0 0 1px ${cover.border}` },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: online ? colors.ember.base : colors.text.tertiary },
          ]}
        />
        <TextV2 style={styles.statusText}>
          {online ? 'ELLIE EN LÍNEA' : 'ELLIE SIN CONEXIÓN'}
        </TextV2>
      </View>
    </View>
  );
}

// Centred message (28/500 + 16 secondary) and the two answers in a 1.3 : 1
// grid: Ember with the mini Halo and an arrow, and an outlined one.
export function EllieMessage({
  headline,
  subtitle,
  onAsk,
  blockStyle,
}: {
  headline: string;
  subtitle: string;
  onAsk: (ask: EllieAsk) => void;
  blockStyle?: AnimatedViewStyle;
}) {
  const { colors } = useThemeV2();
  const cover = useCoverColors();
  const [primary, secondary] = CANNED_PROMPTS;

  return (
    <View>
      <Animated.View style={[styles.message, blockStyle]}>
        <TextV2 align="center" style={styles.headline}>
          {headline}
        </TextV2>
        <TextV2 align="center" color={cover.secondary} style={styles.subtitle}>
          {subtitle}
        </TextV2>
      </Animated.View>
      <View style={styles.answers}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => onAsk(primary)}
          style={[styles.primary, { backgroundColor: colors.ember.strong }]}
        >
          <LivingHalo size={22} />
          <TextV2 variant="bodyStrong" color="#FFFFFF" numberOfLines={2} style={styles.primaryText}>
            {primary.text}
          </TextV2>
          <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => onAsk(secondary)}
          style={[styles.secondary, { boxShadow: `inset 0 0 0 1px ${cover.border}` }]}
        >
          <TextV2 variant="bodyStrong" align="center" numberOfLines={2} style={styles.secondaryText}>
            {secondary.text}
          </TextV2>
        </PressableScale>
      </View>
    </View>
  );
}

// "TAMBIÉN PUEDO AYUDARTE CON": 2 × 2 cards and the wide "Escanear máquina".
export function EllieHelpGrid({
  onAsk,
  onScan,
}: {
  onAsk: (ask: EllieAsk) => void;
  onScan: () => void;
}) {
  const { colors } = useThemeV2();
  const cover = useCoverColors();
  const cardStyle = {
    backgroundColor: cover.card,
    boxShadow: `inset 0 0 0 1px ${cover.border}`,
  };

  return (
    <View>
      <TextV2 color={cover.secondary} style={styles.sectionTitle}>
        TAMBIÉN PUEDO AYUDARTE CON
      </TextV2>
      <View style={styles.grid}>
        {HELP_CARDS.map(item => (
          <PressableScale
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.description}`}
            onPress={() => onAsk(item.ask)}
            style={[styles.card, cardStyle]}
          >
            <View style={styles.cardTop}>
              <item.icon size={22} color={colors.text.primary} strokeWidth={1.8} />
              <ArrowRight size={15} color={colors.text.primary} strokeWidth={2} style={styles.faint} />
            </View>
            <View style={styles.cardTexts}>
              <TextV2 style={styles.cardTitle}>{item.title}</TextV2>
              <TextV2 color={cover.secondary} style={styles.cardDescription}>
                {item.description}
              </TextV2>
            </View>
          </PressableScale>
        ))}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Escanear máquina. Te digo qué es y cómo usarla"
        onPress={onScan}
        style={[styles.scan, cardStyle]}
      >
        <View style={styles.scanThumb}>
          <Image source={SCAN_IMAGE} resizeMode="cover" style={styles.fill} />
          <View style={styles.scanShade} />
          <Camera size={18} color="#FFFFFF" strokeWidth={2} style={styles.scanIcon} />
        </View>
        <View style={styles.scanTexts}>
          <TextV2 style={styles.cardTitle}>Escanear máquina</TextV2>
          <TextV2 color={cover.secondary} style={styles.cardDescription}>
            Te digo qué es y cómo usarla
          </TextV2>
        </View>
        <ArrowRight size={15} color={colors.text.primary} strokeWidth={2} style={styles.faint} />
      </PressableScale>
    </View>
  );
}

// "CONVERSA CON ELLIE": the in-flow field (60 pt) that opens the chat.
export function EllieAskField({ onPress }: { onPress: () => void }) {
  const { colors } = useThemeV2();
  const cover = useCoverColors();
  const placeholder = 'Pregúntale algo a ELLIE…';

  return (
    <View>
      <View style={[styles.divider, { backgroundColor: cover.border }]} />
      <TextV2 color={cover.secondary} style={[styles.sectionTitle, styles.askTitle]}>
        CONVERSA CON ELLIE
      </TextV2>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        onPress={onPress}
        style={[
          styles.ask,
          {
            backgroundColor: cover.card,
            boxShadow: `inset 0 0 0 1px ${cover.border}, 0 8px 24px rgba(18,18,18,.06)`,
          },
        ]}
      >
        <LivingHalo size={36} />
        <TextV2 variant="bodyL" color={cover.secondary} style={styles.askText}>
          {placeholder}
        </TextV2>
        <View style={[styles.askSend, { backgroundColor: colors.cta.primary }]}>
          <ArrowUp size={17} color={colors.cta.primaryText} strokeWidth={2.2} />
        </View>
      </PressableScale>
    </View>
  );
}

const RING = 236;

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  faint: { opacity: 0.45 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  headerSide: { width: 44 },
  wordmark: { flex: 1, alignItems: 'center', gap: 6 },
  // 20/500, tracking .42em (the trailing space is balanced by the margin).
  ellie: { fontSize: 20, lineHeight: 22, fontWeight: '500', letterSpacing: 8.4, marginRight: -8.4 },
  // 9/600, tracking .32em.
  intelligence: { fontSize: 9, lineHeight: 11, fontWeight: '600', letterSpacing: 2.88, marginRight: -2.88 },
  history: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: { opacity: 0.8 },
  stage: { height: 268, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    top: 16,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
  },
  arc: {
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.9,
    transform: [{ rotate: '-28deg' }],
  },
  status: {
    position: 'absolute',
    bottom: 0,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.66 },
  message: { gap: 12, marginTop: 26, paddingHorizontal: 4 },
  // 28/500, tracking -.02em.
  headline: { fontSize: 28, lineHeight: 32, fontWeight: '500', letterSpacing: -0.56 },
  subtitle: { fontSize: 16, lineHeight: 23 },
  answers: { flexDirection: 'row', gap: 10, marginTop: 22 },
  primary: {
    flex: 1.3,
    boxShadow: '0 10px 24px rgba(255,91,31,.28)',
    height: 54,
    borderRadius: 27,
    paddingLeft: 14,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryText: { flex: 1, fontSize: 16, lineHeight: 19 },
  secondary: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, lineHeight: 18 },
  // 11/600, tracking .16em.
  sectionTitle: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 1.76,
    marginTop: 34,
    paddingHorizontal: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  // Two per row (the gap takes the rest).
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 14,
    gap: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTexts: { gap: 3 },
  cardTitle: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  cardDescription: { fontSize: 13, lineHeight: 17.5 },
  scan: {
    marginTop: 10,
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#141312',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stands in for the reference's saturate(.4) brightness(.7).
  scanShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,19,18,.45)' },
  scanIcon: { position: 'absolute' },
  scanTexts: { flex: 1, gap: 2 },
  divider: { height: 1, marginTop: 30, marginHorizontal: 4 },
  askTitle: { marginTop: 24 },
  ask: {
    marginTop: 14,
    height: 60,
    borderRadius: 30,
    paddingLeft: 10,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  askText: { flex: 1 },
  askSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
