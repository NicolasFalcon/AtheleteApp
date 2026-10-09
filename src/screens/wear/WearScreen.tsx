import { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Bell, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconButton,
  PressableScale,
  StatusBarV2,
  TextV2,
  useToast,
} from '@app/components/v2';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

// Placeholder black and white photos (grayscale baked in; the darkening of
// the prototype's `brightness` is a layer on top). TODO(wear): real Wear
// photography.
// `aspect` = width / height of the file; `x`, `y` = the prototype's
// object-position (the crop is computed by hand: `cover` alone centres it).
const PHOTOS = {
  hero: require('@app/assets/v2/photos/wear/overhead.jpg'),
  men: { source: require('@app/assets/v2/photos/wear/culturismo.jpg'), aspect: 900 / 600, x: 0.5, y: 0.25 },
  women: { source: require('@app/assets/v2/photos/wear/barra-mujer.jpg'), aspect: 900 / 601, x: 0.5, y: 0.35 },
  accessories: { source: require('@app/assets/v2/photos/wear/mancuernas.jpg'), aspect: 900 / 582, x: 0.5, y: 0.5 },
};

type TilePhoto = (typeof PHOTOS)['men'];

const INK = '#0C0B0A';
const HERO_HEIGHT = 780;
const HERO_ASPECT = 900 / 601; // overhead.jpg
const SHEET = '#F7F6F3';

function Tile({ photo, label, height }: { photo: TilePhoto; label: string; height: number }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (event: LayoutChangeEvent) =>
    setBox({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height });

  // object-fit: cover + object-position, by hand.
  let frame = null;
  if (box) {
    const scale = Math.max(box.w / photo.aspect, box.h) ;
    const h = scale;
    const w = scale * photo.aspect;
    frame = { width: w, height: h, left: (box.w - w) * photo.x, top: (box.h - h) * photo.y };
  }

  return (
    <View onLayout={onLayout} style={[styles.tile, { height }]}>
      {frame ? (
        <Image source={photo.source} resizeMode="cover" style={[styles.tilePhoto, frame]} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.tileDim]} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12,11,10,0)', 'rgba(12,11,10,.8)']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TextV2 style={styles.tileLabel}>{label}</TextV2>
    </View>
  );
}

// ATHELETE Wear · Presentación (v2.12, Wear.dc.html `wear`). The brand before
// launch: no products, prices or sizes, and nothing to tap but "Avísame".
// Entry: the hero photo settles (8 s, 1.08 → 1) and the title block rises
// (0.7 s, after 0.2 s). "Reducir movimiento" shows everything at rest.
export function WearScreen({ navigation, route }: AppScreenProps<'Wear'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [notify, setNotify] = useState(false);

  const kenBurns = useSharedValue(reduceMotion ? 1 : 1.08);
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      kenBurns.value = 1;
      rise.value = 1;
      return;
    }
    kenBurns.value = withTiming(1, { duration: 8000, easing: Easing.out(Easing.quad) });
    rise.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [kenBurns, reduceMotion, rise]);

  const heroPhoto = useAnimatedStyle(() => ({ transform: [{ scale: kenBurns.value }] }));
  const heroTitle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 10 }],
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  // TODO(wear): a real waiting list (BT-53). Visual only: nothing is stored or
  // sent, and it is forgotten when leaving the screen.
  const toggleNotify = () => {
    const next = !notify;
    setNotify(next);
    toast.show(next ? 'Te avisaremos del lanzamiento' : 'Aviso desactivado');
    if (next && !reduceMotion) {
      pop.value = withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(1.12, { duration: 240 }),
        withTiming(1, { duration: 160 }),
      );
    }
  };

  // Development only: open already scrolled, for captures.
  const [scroller, setScroller] = useState<ScrollView | null>(null);
  const devScroll = __DEV__ ? route.params?.devScroll ?? 0 : 0;
  useEffect(() => {
    if (devScroll > 0 && scroller) {
      const id = setTimeout(() => scroller.scrollTo({ y: devScroll, animated: false }), 600);
      return () => clearTimeout(id);
    }
  }, [devScroll, scroller]);

  return (
    <View style={styles.fill}>
      <StatusBarV2 style="light" />
      <ScrollView ref={setScroller} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.hero}>
          <Animated.View style={[StyleSheet.absoluteFill, heroPhoto]}>
            {/* object-position 50 % 25 %: sized by height and centred. */}
            <Image
              source={PHOTOS.hero}
              resizeMode="cover"
              style={{
                position: 'absolute',
                top: 0,
                height: HERO_HEIGHT,
                width: HERO_HEIGHT * HERO_ASPECT,
                left: (width - HERO_HEIGHT * HERO_ASPECT) / 2,
              }}
            />
          </Animated.View>
          <View style={[StyleSheet.absoluteFill, styles.heroDim]} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(12,11,10,.5)', 'rgba(12,11,10,0)', 'rgba(12,11,10,.25)', INK]}
            locations={[0, 0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.heroTexts, heroTitle]}>
            <TextV2 style={styles.soon}>PRÓXIMAMENTE</TextV2>
            <View style={styles.wordmark}>
              <TextV2 accessibilityRole="header" style={styles.athelete}>
                ATHELETE
              </TextV2>
              <TextV2 style={styles.wear}>WEAR</TextV2>
            </View>
            <TextV2 variant="body" color="#A8A6A1">
              Ropa y accesorios para entrenar.
            </TextV2>
          </Animated.View>
        </View>

        <View style={styles.mosaic}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Tile photo={PHOTOS.men} label="HOMBRE" height={420} />
            </View>
            <View style={styles.half}>
              <Tile photo={PHOTOS.women} label="MUJER" height={420} />
            </View>
          </View>
          <Tile photo={PHOTOS.accessories} label="ACCESORIOS" height={220} />
        </View>

        <View style={styles.phrase}>
          <TextV2 accessibilityRole="header" style={styles.phraseLine}>
            MENOS RUIDO.
          </TextV2>
          <TextV2 style={[styles.phraseLine, styles.phraseMuted]}>MÁS ENTRENAMIENTO.</TextV2>
        </View>

        <View style={[styles.sheet, { paddingBottom: 56 + Math.max(insets.bottom - 20, 0) }]}>
          <TextV2 style={styles.sheetTitle}>SÉ DE LOS PRIMEROS</TextV2>
          <Animated.View style={notify ? popStyle : undefined}>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: notify }}
              accessibilityLabel={
                notify ? 'Te avisaremos. Tocar para desactivar' : 'Avísame del lanzamiento'
              }
              onPress={toggleNotify}
              style={[styles.notify, notify ? styles.notifyOn : styles.notifyOff]}
            >
              {notify ? (
                <Check size={17} color="#121212" strokeWidth={2.2} />
              ) : (
                <Bell size={17} color="#FFFFFF" strokeWidth={2} />
              )}
              <TextV2 variant="cta" color={notify ? '#121212' : '#FFFFFF'}>
                {notify ? 'Te avisaremos' : 'Avísame del lanzamiento'}
              </TextV2>
            </PressableScale>
          </Animated.View>
          <TextV2 variant="meta" color="#6B6964" align="center">
            Tienda online · Hombre, mujer y accesorios
          </TextV2>
        </View>
      </ScrollView>

      <View style={[styles.back, { top: insets.top + 8 }]}>
        <IconButton
          icon={ArrowLeft}
          variant="glass"
          accessibilityLabel="Volver"
          onPress={() => safeGoBack(navigation, [tabFallback('Home')])}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: INK },
  back: { position: 'absolute', left: 16, zIndex: 6 },
  hero: { height: HERO_HEIGHT, overflow: 'hidden' },
  heroDim: { backgroundColor: 'rgba(12,11,10,.28)' },
  heroTexts: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 44,
    alignItems: 'center',
    gap: 18,
  },
  soon: { fontSize: 11, fontWeight: '600', letterSpacing: 3.3, color: '#A8A6A1' },
  wordmark: { alignItems: 'center', gap: 6 },
  athelete: {
    fontSize: 64,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -2.56,
    color: '#FFFFFF',
  },
  wear: {
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 12,
    paddingLeft: 12,
    color: '#D8D6D1',
  },
  mosaic: { padding: 8, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  tile: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#141312' },
  tilePhoto: { position: 'absolute' },
  tileDim: { backgroundColor: 'rgba(12,11,10,.12)' },
  tileLabel: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  phrase: { paddingVertical: 96, paddingHorizontal: 20, alignItems: 'center' },
  phraseLine: {
    fontSize: 38,
    lineHeight: 44,
    marginBottom: -8,
    fontWeight: '800',
    letterSpacing: -1.33,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  phraseMuted: { color: '#6B6964' },
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 36,
    paddingHorizontal: 20,
    gap: 14,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.22,
    color: '#121212',
    textAlign: 'center',
  },
  notify: {
    height: 56,
    borderRadius: 28,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notifyOff: { backgroundColor: '#121212' },
  notifyOn: { boxShadow: 'inset 0 0 0 1px #D9D6CF' },
});
