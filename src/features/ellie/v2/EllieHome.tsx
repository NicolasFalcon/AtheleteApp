import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  ArrowRight,
  BedDouble,
  Camera,
  ChartColumn,
  RefreshCw,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';
import {
  EllieOrb,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import { SCAN_IMAGE } from '@app/features/workouts/workoutAssets';
import { CANNED_PROMPTS, type EllieMode } from '@app/features/ellie/chatModel';

export type EllieAsk = { text: string; mode?: EllieMode };

// "También puedo": three fixed asks (the prototype's, not tied to a mode).
export const ALSO_CAN: { icon: LucideIcon; text: string }[] = [
  { icon: Utensils, text: 'Revisar mi nutrición' },
  { icon: BedDouble, text: 'Mejorar mi recuperación' },
  { icon: ChartColumn, text: 'Analizar mi semana' },
];

// "Para leer con ELLIE": three topics; tapping one asks ELLIE about it.
// PLACEHOLDER photos of the handoff package.
export const READ_WITH_ELLIE = [
  {
    title: 'Duerme mejor, rinde más',
    subtitle: 'Recuperación · 4 min',
    photo: HOME_PHOTOS.mobility,
    ask: 'Quiero mejorar mi recuperación',
  },
  {
    title: 'Proteína sin complicarte',
    subtitle: 'Nutrición · 3 min',
    photo: HOME_PHOTOS.overhead,
    ask: 'Quiero un plan nutricional',
    mode: 'generate_nutrition' as EllieMode,
  },
  {
    title: 'Tres claves de sentadilla',
    subtitle: 'Técnica · 5 min',
    photo: HOME_PHOTOS.effort,
    ask: 'Ajusta mi rutina con mejor técnica de sentadilla',
  },
];

export function EllieOpening({
  eyebrow,
  voice,
  orbState,
  onAsk,
  showAnswers,
}: {
  eyebrow: string;
  voice: string;
  orbState: 'breathing' | 'thinking' | 'offline';
  onAsk: (ask: EllieAsk) => void;
  showAnswers: boolean;
}) {
  const { colors } = useThemeV2();
  const [primary, secondary] = CANNED_PROMPTS;

  return (
    <View style={styles.opening}>
      <View style={styles.orb}>
        <EllieOrb size={116} state={orbState} />
      </View>
      <View style={styles.voiceBlock}>
        <TextV2
          variant="eyebrow"
          color={colors.ellie.textSecondary}
          align="center"
          style={styles.tracked}
        >
          {eyebrow}
        </TextV2>
        <TextV2 variant="title22" align="center" style={styles.voice}>
          {voice}
        </TextV2>
        {showAnswers ? (
          <View style={styles.answers}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => onAsk(primary)}
              style={[styles.pill, { backgroundColor: colors.cta.primary }]}
            >
              <TextV2 variant="bodyStrong" color={colors.cta.primaryText}>
                {primary.text}
              </TextV2>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              onPress={() => onAsk(secondary)}
              style={[
                styles.pill,
                {
                  backgroundColor: colors.ellie.input,
                  boxShadow: `inset 0 0 0 1px ${colors.outline.strong}`,
                },
              ]}
            >
              <TextV2 variant="bodyStrong">{secondary.text}</TextV2>
            </PressableScale>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function AlsoCanList({ onAsk }: { onAsk: (ask: EllieAsk) => void }) {
  const { colors } = useThemeV2();

  return (
    <View>
      <TextV2
        variant="eyebrow"
        color={colors.ellie.textSecondary}
        style={styles.sectionTitle}
      >
        También puedo
      </TextV2>
      {ALSO_CAN.map(item => (
        <PressableScale
          key={item.text}
          accessibilityRole="button"
          onPress={() => onAsk({ text: item.text })}
          style={[styles.row, { borderBottomColor: colors.divider }]}
        >
          <item.icon
            size={20}
            color={colors.text.primary}
            strokeWidth={1.8}
            style={styles.rowIcon}
          />
          <TextV2 variant="cta" style={styles.rowText}>
            {item.text}
          </TextV2>
          <ArrowRight
            size={17}
            color={colors.text.primary}
            strokeWidth={2}
            style={styles.rowArrow}
          />
        </PressableScale>
      ))}
    </View>
  );
}

// "¿No sabes cómo usar una máquina? Escanéala con ELLIE." (Scan: sin acción
// todavía, como en Entrenos).
export function ScanCard({ onPress }: { onPress: () => void }) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Escanear una máquina con ELLIE"
      onPress={onPress}
      style={[
        styles.scan,
        {
          backgroundColor: colors.ellie.input,
          boxShadow: `inset 0 0 0 1px ${colors.divider}`,
        },
      ]}
    >
      <TextV2 variant="bodyL" style={styles.scanText}>
        ¿No sabes cómo usar una máquina?{' '}
        <TextV2 variant="cta">Escanéala con ELLIE.</TextV2>
      </TextV2>
      <View style={styles.scanPhoto}>
        <Image source={SCAN_IMAGE} resizeMode="cover" style={styles.fill} />
        <View style={styles.scanIconWrap}>
          <View style={styles.scanIcon}>
            <Camera size={17} color="#121212" strokeWidth={2} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

export function ReadWithEllie({ onAsk }: { onAsk: (ask: EllieAsk) => void }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.readBlock}>
      <TextV2 variant="eyebrow" color={colors.ellie.textSecondary}>
        Para leer con ELLIE
      </TextV2>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.cards}
      >
        {READ_WITH_ELLIE.map(item => (
          <PressableScale
            key={item.title}
            accessibilityRole="button"
            onPress={() => onAsk({ text: item.ask, mode: item.mode })}
            style={styles.card}
          >
            <Image
              source={item.photo}
              resizeMode="cover"
              style={[
                styles.cardPhoto,
                { backgroundColor: colors.surface.muted },
              ]}
            />
            <TextV2 variant="bodyStrong" style={styles.cardTitle}>
              {item.title}
            </TextV2>
            <TextV2
              variant="meta"
              color={colors.text.secondary}
              style={styles.cardSub}
            >
              {item.subtitle}
            </TextV2>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

export function ResumeRow({
  text,
  when,
  onPress,
}: {
  text: string;
  when: string;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={styles.resume}
    >
      <RefreshCw
        size={17}
        color={colors.text.primary}
        strokeWidth={2}
        style={styles.rowIcon}
      />
      <View style={styles.resumeTexts}>
        <TextV2 variant="bodyStrong">Retomar conversación</TextV2>
        <TextV2 variant="meta" color={colors.text.secondary} numberOfLines={1}>
          {text}
        </TextV2>
      </View>
      <TextV2 variant="caption" color={colors.ellie.textSecondary}>
        {when}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  opening: { gap: 30 },
  orb: { alignItems: 'center', paddingTop: 24 },
  voiceBlock: { gap: 18, alignItems: 'center' },
  tracked: { letterSpacing: 1.1 },
  voice: { fontWeight: '400', lineHeight: 30, maxWidth: 330 },
  answers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowIcon: { opacity: 0.7 },
  rowText: { flex: 1, fontWeight: '500' },
  rowArrow: { opacity: 0.5 },
  scan: {
    borderRadius: 24,
    paddingVertical: 8,
    paddingLeft: 18,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanText: { flex: 1, lineHeight: 23 },
  scanPhoto: {
    width: 84,
    height: 84,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#141312',
  },
  scanIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readBlock: { gap: 12 },
  bleed: { marginHorizontal: -24 },
  cards: { gap: 12, paddingHorizontal: 24, paddingBottom: 8 },
  card: { width: 200, gap: 10 },
  cardPhoto: { height: 140, width: '100%', borderRadius: 20 },
  cardTitle: { fontSize: 16 },
  cardSub: { marginTop: -6 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resumeTexts: { flex: 1, gap: 2, minWidth: 0 },
});
