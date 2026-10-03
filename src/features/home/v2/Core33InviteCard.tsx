import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import {
  Button,
  DayCapsules,
  Eyebrow,
  PressableScale,
  TextV2,
  useThemeV2,
  type DayCapsuleState,
} from '@app/components/v2';
import type { Core33InviteVariant } from '@app/features/core33/core33Invite';
import { SceneScope } from '@app/providers/ThemeProvider';

type Core33InviteCardProps = {
  variant: Core33InviteVariant;
  completedCount: number;
  onPress: () => void;
  onDismiss: () => void;
};

const INVITE_DAYS: DayCapsuleState[] = Array.from({ length: 33 }, (_, index) =>
  index === 0 ? 'full' : 'empty',
);
const AGAIN_DAYS: DayCapsuleState[] = Array.from({ length: 33 }, (_, index) =>
  index === 32 ? 'full' : 'soft',
);

// Core 33 discovery card under "Tu día" (HOME_10 invitation, HOME_11 start
// another). Dark in both modes: plate + shadow in Light, #1B1917 with an inner
// border in Dark (HomeDark.dc.html).
export function Core33InviteCard(props: Core33InviteCardProps) {
  const { mode, radius } = useThemeV2();
  const dark = mode === 'dark';

  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius.card },
        dark ? styles.cardDark : styles.cardLight,
      ]}
    >
      <SceneScope>
        <CardContent {...props} />
      </SceneScope>
    </View>
  );
}

function CardContent({
  variant,
  completedCount,
  onPress,
  onDismiss,
}: Core33InviteCardProps) {
  const { scene } = useThemeV2();
  const again = variant === 'again';

  return (
    <>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="core33InviteGlow"
            cx="100%"
            cy="0%"
            rx="90%"
            ry="70%"
            fx="100%"
            fy="0%"
          >
            <Stop offset="0" stopColor="rgb(255,91,31)" stopOpacity={0.12} />
            <Stop offset="0.6" stopColor="rgb(255,91,31)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#core33InviteGlow)"
        />
      </Svg>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.eyebrow}>
            <Eyebrow tone="tertiary">Core 33</Eyebrow>
            {again ? (
              <>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: scene.onDark.tertiary },
                  ]}
                />
                <Eyebrow tone="tertiary">
                  {`${completedCount} ${
                    completedCount === 1 ? 'completado' : 'completados'
                  }`}
                </Eyebrow>
              </>
            ) : null}
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Ahora no"
            onPress={onDismiss}
            style={styles.later}
          >
            <TextV2 variant="metaStrong" tone="tertiary">
              Ahora no
            </TextV2>
          </PressableScale>
        </View>
        <View style={styles.texts}>
          <TextV2 variant="title22">
            {again
              ? 'Elige tu siguiente intención.'
              : '33 días. Una intención.'}
          </TextV2>
          <TextV2 variant="label" tone="secondary" style={styles.sub}>
            {again
              ? 'Cerraste tus 33 días. El siguiente reto empieza cuando tú decidas.'
              : 'Tres hábitos pequeños cada día, ligados al reto que elijas.'}
          </TextV2>
        </View>
        <DayCapsules
          days={again ? AGAIN_DAYS : INVITE_DAYS}
          breathingIndex={again ? undefined : 0}
          showEnds
        />
        <Button
          label={again ? 'Empieza otro Core 33' : 'Descubrir Core 33'}
          variant="secondary"
          size="md"
          icon={ArrowRight}
          iconPosition="end"
          onPress={onPress}
          style={styles.cta}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  cardLight: {
    backgroundColor: '#141312',
    boxShadow: '0 12px 28px rgba(0,0,0,.12)',
  },
  cardDark: {
    backgroundColor: '#1B1917',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
  },
  content: {
    paddingTop: 8,
    paddingRight: 18,
    paddingBottom: 20,
    paddingLeft: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginRight: -6,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  later: {
    height: 44,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  texts: {
    gap: 6,
    marginTop: -8,
  },
  sub: {
    fontWeight: '400',
  },
  cta: {
    alignSelf: 'flex-start',
  },
});
