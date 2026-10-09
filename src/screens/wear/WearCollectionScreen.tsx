import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Bell, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconButton,
  PressableScale,
  StatusBarV2,
  TextV2,
  WearProductTile,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { WEAR_PHOTOS, WEAR_PRODUCTS, type WearProduct } from '@app/features/wear/wearCatalog';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

// ATHELETE Wear · colección (WEAR_01, v2.12). Editorial and monochrome, no
// Ember. Sample catalog from `wearCatalog.ts`; there is no store yet.
// Order: base piece, two-column grid, editorial pause, the accessory, closing.
export function WearCollectionScreen({ navigation }: AppScreenProps<'WearCollection'>) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [notify, setNotify] = useState(false);

  const [base, ...rest] = WEAR_PRODUCTS;
  const grid = rest.slice(0, 4);
  const accessory = rest[4];
  const open = (product: WearProduct) =>
    navigation.navigate(APP_ROUTES.WearProduct, { productId: product.id });

  // TODO(wear): a real waiting list (BT-53). Visual only for now: nothing is
  // stored or sent.
  const toggleNotify = () => {
    const next = !notify;
    setNotify(next);
    toast.show(next ? 'Te avisaremos del lanzamiento' : 'Aviso desactivado');
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={WEAR_PHOTOS.barraMujer} resizeMode="cover" style={StyleSheet.absoluteFill} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(12,11,10,.45)', 'rgba(12,11,10,.1)', 'rgba(12,11,10,.45)', 'rgba(12,11,10,.9)']}
            locations={[0, 0.3, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.bar, { top: insets.top + 8, paddingHorizontal: layout.gutter - 4 }]}>
            <IconButton
              icon={ArrowLeft}
              variant="glass"
              accessibilityLabel="Volver"
              onPress={() => safeGoBack(navigation, [tabFallback('Home')])}
            />
            <View style={styles.brand}>
              <TextV2 style={styles.brandBold}>ATHELETE</TextV2>
              <TextV2 style={styles.brandMuted}>— WEAR</TextV2>
            </View>
          </View>
          <View style={[styles.heroTexts, { paddingHorizontal: layout.gutter }]}>
            <View style={styles.soon}>
              <TextV2 variant="metaStrong" color="#FFFFFF">
                Próximamente
              </TextV2>
            </View>
            <TextV2 style={styles.eyebrow}>COLECCIÓN BASE · 01</TextV2>
            <TextV2 accessibilityRole="header" style={styles.headline}>
              Hecho para durar.
            </TextV2>
            <TextV2 variant="bodyL" color="#E4E2DD" style={styles.lede}>
              Seis piezas para entrenar todos los días. Tejidos técnicos, cortes limpios y sin
              logos grandes.
            </TextV2>
          </View>
        </View>

        <View style={[styles.list, { paddingHorizontal: layout.gutter }]}>
          <WearProductTile
            variant="base"
            name={base.name}
            price={base.price}
            photo={base.photo}
            soon={Boolean(base.soon)}
            onPress={() => open(base)}
          />
          <View style={styles.grid}>
            {grid.map(product => (
              <View key={product.id} style={styles.cell}>
                <WearProductTile
                  variant="grid"
                  name={product.name}
                  price={product.price}
                  photo={product.photo}
                  soon={Boolean(product.soon)}
                  onPress={() => open(product)}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pause}>
          <Image source={WEAR_PHOTOS.overhead} resizeMode="cover" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.pauseDim]} />
          <View style={[styles.pauseText, { paddingHorizontal: layout.gutter + 4 }]}>
            <TextV2 style={styles.pauseLine}>Menos ruido.</TextV2>
            <TextV2 style={[styles.pauseLine, styles.pauseMuted]}>Más entrenamiento.</TextV2>
          </View>
        </View>

        <View style={[styles.list, { paddingHorizontal: layout.gutter }]}>
          {accessory ? (
            <WearProductTile
              variant="horizontal"
              name={accessory.name}
              price={accessory.price}
              photo={accessory.photo}
              soon={Boolean(accessory.soon)}
              onPress={() => open(accessory)}
            />
          ) : null}

          <View style={styles.closing}>
            <TextV2 variant="title22">Sé de los primeros</TextV2>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: notify }}
              accessibilityLabel={notify ? 'Te avisaremos. Tocar para desactivar' : 'Avísame del lanzamiento'}
              onPress={toggleNotify}
              style={[
                styles.notify,
                notify
                  ? { boxShadow: `inset 0 0 0 1px ${colors.outline.strong}` }
                  : { backgroundColor: colors.cta.primary },
              ]}
            >
              {notify ? (
                <Check size={18} color={colors.text.primary} strokeWidth={2.2} />
              ) : (
                <Bell size={18} color={colors.cta.primaryText} strokeWidth={2} />
              )}
              <TextV2 variant="cta" color={notify ? colors.text.primary : colors.cta.primaryText}>
                {notify ? 'Te avisaremos' : 'Avísame del lanzamiento'}
              </TextV2>
            </PressableScale>
            <TextV2 variant="meta" color={colors.text.secondary}>
              Tienda online · Hombre, mujer y accesorios
            </TextV2>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 56 },
  hero: { height: 580, backgroundColor: '#141312', overflow: 'hidden', justifyContent: 'flex-end' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  brand: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  brandBold: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: '#FFFFFF' },
  brandMuted: { fontSize: 11, fontWeight: '500', letterSpacing: 1.6, color: '#A8A6A1' },
  soon: {
    alignSelf: 'flex-start',
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexts: { paddingBottom: 36, gap: 10 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.3, color: '#A8A6A1' },
  headline: { fontSize: 48, lineHeight: 50, fontWeight: '700', letterSpacing: -1.4, color: '#FFFFFF' },
  lede: { maxWidth: 300 },
  list: { paddingTop: 32, gap: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 24 },
  cell: { width: '48.3%' },
  pause: { height: 340, marginTop: 36, backgroundColor: '#141312', justifyContent: 'center' },
  pauseDim: { backgroundColor: 'rgba(12,11,10,.55)' },
  pauseText: { gap: 2 },
  pauseLine: { fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.1, color: '#FFFFFF' },
  pauseMuted: { color: '#8E8B86' },
  closing: { gap: 14, paddingTop: 12 },
  notify: {
    alignSelf: 'flex-start',
    height: 52,
    paddingHorizontal: 22,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
