import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassSurface,
  IconButton,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  WEAR_STORE_OPEN,
  findWearProduct,
} from '@app/features/wear/wearCatalog';
import { toggleSize, wearProductState } from '@app/features/wear/wearProductModel';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

const GALLERY_HEIGHT = 540;
// The prototype shows the same photo three times with a different crop
// (object-position). Here, scale + shift. TODO(wear): real gallery photos.
const CROPS = [
  { scale: 1, y: 0 },
  { scale: 1.28, y: -0.1 },
  { scale: 1.28, y: 0.1 },
] as const;

// ATHELETE Wear · producto (WEAR_02 / WEAR_03, v2.12). Gallery, name and
// price, size pills and three facts. There is no purchase: the final CTA is
// "Próximamente" until the store exists (`WEAR_STORE_OPEN`, TODO(wear)).
export function WearProductScreen({
  navigation,
  route,
}: AppScreenProps<'WearProduct'>) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const product = useMemo(
    () => findWearProduct(route.params?.productId),
    [route.params?.productId],
  );
  const [chosen, setChosen] = useState<string | null>(
    __DEV__ ? route.params?.devSize ?? null : null,
  );
  const [page, setPage] = useState(0);
  // Development only: open already scrolled (captures of the size pills).
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const y = __DEV__ ? route.params?.devScroll ?? 0 : 0;
    if (y > 0) {
      const id = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 600);
      return () => clearTimeout(id);
    }
  }, [route.params?.devScroll]);
  const state = wearProductState(product, chosen, WEAR_STORE_OPEN);
  const cta = state.cta;

  const onGallery = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== page) {
      setPage(index);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 190 + insets.bottom }}
      >
        <View style={[styles.gallery, { backgroundColor: colors.surface.skeleton }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onGallery}
            scrollEventThrottle={16}
          >
            {CROPS.map((crop, index) => (
              <View key={index} style={[styles.page, { width }]}>
                <Image
                  source={product.photo}
                  resizeMode="cover"
                  style={[
                    styles.photo,
                    {
                      transform: [
                        { scale: crop.scale },
                        { translateY: crop.y * GALLERY_HEIGHT },
                      ],
                    },
                  ]}
                />
              </View>
            ))}
          </ScrollView>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(12,11,10,.4)', 'rgba(12,11,10,0)']}
            style={styles.topScrim}
          />
          <View pointerEvents="none" style={styles.dots}>
            {CROPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: index === page ? 18 : 6,
                    backgroundColor: index === page ? '#FFFFFF' : 'rgba(255,255,255,.5)',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={[styles.back, { top: insets.top + 8, left: layout.gutter - 4 }]}>
          <IconButton
            icon={ArrowLeft}
            variant="glass"
            accessibilityLabel="Volver"
            onPress={() => safeGoBack(navigation, ['WearCollection'])}
          />
        </View>

        <View style={[styles.info, { paddingHorizontal: layout.gutter }]}>
          <View style={styles.head}>
            <TextV2 variant="eyebrow" color={colors.text.secondary}>
              {`ATHELETE Wear · ${product.category}`}
            </TextV2>
            <View style={styles.titleRow}>
              <TextV2 accessibilityRole="header" style={styles.name}>
                {product.name}
              </TextV2>
              <TextV2 style={styles.price}>{product.price}</TextV2>
            </View>
            <TextV2 variant="bodyL" color={colors.text.secondary}>
              {product.description}
            </TextV2>
          </View>

          <View style={styles.sizeBlock}>
            <View style={styles.sizeHead}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                Talla
              </TextV2>
              <TextV2 variant="meta" color={colors.text.secondary}>
                {state.sizeLine}
              </TextV2>
            </View>
            <View style={styles.sizes}>
              {state.sizes.map(size => (
                <PressableScale
                  key={size.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Talla ${size.label}${size.soldOut ? ', agotada' : ''}`}
                  accessibilityState={{ selected: size.selected, disabled: size.disabled }}
                  disabled={size.disabled}
                  onPress={() => setChosen(toggleSize(product, chosen, size.label))}
                  style={[
                    styles.pill,
                    size.selected
                      ? { backgroundColor: colors.cta.primary }
                      : {
                          boxShadow: `inset 0 0 0 1px ${
                            size.soldOut ? colors.divider : colors.outline.strong
                          }`,
                        },
                  ]}
                >
                  <TextV2
                    variant="cta"
                    color={
                      size.selected
                        ? colors.cta.primaryText
                        : size.soldOut || size.disabled
                        ? colors.text.tertiary
                        : colors.text.primary
                    }
                    style={size.soldOut ? styles.struck : undefined}
                  >
                    {size.label}
                  </TextV2>
                </PressableScale>
              ))}
            </View>
          </View>

          <View>
            {product.facts.map(([label, value]) => (
              <View key={label} style={[styles.fact, { borderBottomColor: colors.divider }]}>
                <TextV2 variant="bodyL">{label}</TextV2>
                <TextV2 variant="bodyL" color={colors.text.secondary} style={styles.factValue}>
                  {value}
                </TextV2>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: layout.gutter }]}
      >
        {/* TODO(wear): when WEAR_STORE_OPEN is true and a size is chosen this
            button opens the external store ("Comprar en ATHELETE Wear ↗"). */}
        <View
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          accessibilityState={{ disabled: !cta.enabled }}
          style={[
            styles.cta,
            { backgroundColor: cta.enabled ? colors.cta.primary : colors.surface.track },
          ]}
        >
          <TextV2
            variant="cta"
            color={cta.enabled ? colors.cta.primaryText : colors.text.tertiary}
          >
            {cta.label}
          </TextV2>
        </View>
        <TextV2 variant="meta" color={colors.text.secondary} align="center">
          {state.footNote}
        </TextV2>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gallery: { height: GALLERY_HEIGHT, overflow: 'hidden' },
  page: { height: GALLERY_HEIGHT, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  back: { position: 'absolute', zIndex: 6 },
  info: { paddingTop: 26, gap: 28 },
  head: { gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 },
  name: { flex: 1, fontSize: 28, lineHeight: 31, fontWeight: '600', letterSpacing: -0.56 },
  price: { fontSize: 20, fontWeight: '500' },
  sizeBlock: { gap: 12 },
  sizeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minWidth: 56,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  struck: { textDecorationLine: 'line-through' },
  fact: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  factValue: { flex: 1, textAlign: 'right' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, gap: 10 },
  cta: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
