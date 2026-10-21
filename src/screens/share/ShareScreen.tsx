import { useEffect, useRef, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Camera, Download, Image as ImageIcon, Share2, Users, X } from 'lucide-react-native';
import {
  BackButton,
  Button,
  GlassSurface,
  PressableScale,
  Segmented,
  Sheet,
  Skeleton,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { createPostErrorCopy, publishedToast } from '@app/features/social/postModel';
import type { CreatePostError } from '@app/features/social/postTypes';
import { invalidateSocialContent } from '@app/features/social/useSocial';
import {
  captureScene,
  captureSticker,
  photoLuminance,
  saveToPhotos,
  shareMore,
  shareToStories,
} from '@app/features/share/shareExport';
import {
  COMBINED,
  SHARE_COPY,
  STICKER_MARGIN,
  defaultTone,
  photoKindOf,
  stickerSize,
  type PhotoKind,
  type ShareLanguage,
  type StickerData,
  type StickerTone,
  type StickerVariant,
} from '@app/features/share/shareModel';
import { useShareData } from '@app/features/share/useShareData';
import { BrandBackground, ShareSticker } from '@app/features/share/v2/ShareSticker';
import { pickFromGallery, takeWithSystemCamera } from '@app/features/vision/picker';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { RouteServiceError } from '@app/services/route/routeService';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Share'>;
type PhotoSource = 'camera' | 'gallery' | 'none';

const TONES_KEY = '@athelete/share-tones';
const PREVIEW = { width: 198, height: 352 };
// The combined image is drawn at 360 × 640 pt and captured at 1080 × 1920.
const SCENE = { width: COMBINED.width / 3, height: COMBINED.height / 3 };
const SWATCHES: { tone: StickerTone; label: string }[] = [
  { tone: 'light', label: 'light' },
  { tone: 'dark', label: 'dark' },
  { tone: 'glass', label: 'glass' },
];

// Compartir en Instagram (handoff v2.16 §26 · SHARE_01–09): the 9:16
// preview (photo + sticker), the photo (camera, gallery or none: brand
// background), the sticker (Completo / Mínimo) and its background, and
// Historias de Instagram, Descargar, Más and Comunidad. Replaces ROUTE_10.
export function ShareScreen({ navigation, route }: Props) {
  const { colors, mode } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const toast = useToast();
  const queryClient = useQueryClient();
  const routeService = useRouteService();
  const language: ShareLanguage = useProfileLanguage() === 'en' ? 'en' : 'es';
  const copy = SHARE_COPY[language];
  const target = route.params;
  const share = useShareData(target, language);

  const [photo, setPhoto] = useState<string | null>(null);
  const [source, setSource] = useState<PhotoSource>('none');
  const [photoKind, setPhotoKind] = useState<PhotoKind>('none');
  const [variant, setVariant] = useState<StickerVariant>('full');
  const [remembered, setRemembered] = useState<Partial<Record<PhotoKind, StickerTone>>>({});
  const [tone, setTone] = useState<StickerTone>('glass');
  const [busy, setBusy] = useState<null | 'stories' | 'download' | 'more' | 'community'>(null);
  const [sheet, setSheet] = useState<null | 'noInstagram' | 'photosDenied'>(null);

  const stickerRef = useRef<View>(null);
  const sceneRef = useRef<View>(null);
  const backgroundRef = useRef<View>(null);

  // The background chosen last time for each kind of photo (26.5).
  useEffect(() => {
    AsyncStorage.getItem(TONES_KEY)
      .then(raw => {
        const saved = raw ? (JSON.parse(raw) as Partial<Record<PhotoKind, StickerTone>>) : {};
        setRemembered(saved);
        setTone(defaultTone('none', saved));
      })
      .catch(() => undefined);
  }, []);

  const choosePhoto = async (next: PhotoSource) => {
    if (next === 'none') {
      setPhoto(null);
      setSource('none');
      setPhotoKind('none');
      setTone(defaultTone('none', remembered));
      return;
    }
    const picked = next === 'camera' ? await takeWithSystemCamera() : await pickFromGallery();
    if (!picked) {
      return;
    }
    setPhoto(picked.uri);
    setSource(next);
    // By the photo's brightness: light sticker on dark photos, dark on light.
    const kind = photoKindOf(await photoLuminance(picked.uri));
    setPhotoKind(kind);
    setTone(defaultTone(kind, remembered));
  };

  const chooseTone = (next: StickerTone) => {
    setTone(next);
    const saved = { ...remembered, [photoKind]: next };
    setRemembered(saved);
    AsyncStorage.setItem(TONES_KEY, JSON.stringify(saved)).catch(() => undefined);
  };

  const fail = () => toast.show(copy.error, { tone: 'error' });

  const combined = () => captureScene(sceneRef);

  const stories = async () => {
    const data = share.data;
    if (!data) {
      return;
    }
    setBusy('stories');
    try {
      const [background, sticker] = await Promise.all([
        captureScene(backgroundRef),
        captureSticker(stickerRef, stickerSize(data, variant)),
      ]);
      toast.show(copy.opening);
      const result = await shareToStories({ background, sticker });
      if (result === 'unavailable') {
        toast.hide();
        setSheet('noInstagram');
      } else if (result === 'failed') {
        fail();
      }
    } catch {
      fail();
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy('download');
    try {
      const uri = await combined();
      const result = await saveToPhotos(uri);
      if (result === 'saved') {
        setSheet(null);
        toast.show(copy.saved);
      } else if (result === 'denied') {
        setSheet('photosDenied');
      } else {
        fail();
      }
    } catch {
      fail();
    } finally {
      setBusy(null);
    }
  };

  const more = async () => {
    setBusy('more');
    try {
      setSheet(null);
      await shareMore(await combined());
    } catch {
      // Cancelled or failed: nothing to tell.
    } finally {
      setBusy(null);
    }
  };

  // Comunidad: the existing flow of each kind (the photo is never posted).
  const community = () => {
    if (target.kind === 'workout') {
      navigation.navigate(APP_ROUTES.SocialCompose, { attach: 'workout', sourceId: target.sessionId });
      return;
    }
    setBusy('community');
    routeService
      .shareToCommunity(target.activityId)
      .then(result => {
        invalidateSocialContent(queryClient);
        toast.show(publishedToast(result.created, language));
        navigation.navigate(APP_ROUTES.SocialPost, { postId: result.postId });
      })
      .catch(error => {
        const code = error instanceof RouteServiceError ? error.code : 'unknown';
        toast.show(
          code === 'route_private' ? copy.routePrivate : createPostErrorCopy(code as CreatePostError, language).message,
          { tone: 'error' },
        );
      })
      .finally(() => setBusy(null));
  };

  const data = share.data;
  const ink = mode === 'dark' ? '#F2F0EC' : colors.cta.primary;
  const inkText = mode === 'dark' ? '#121212' : colors.cta.primaryText;
  const pill = mode === 'dark' ? '#2A2826' : colors.surface.muted;
  const footerHeight = 56 + 8 + 44 + Math.max(insets.bottom, 16) + 24;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
        <View style={styles.headerTexts}>
          <TextV2 variant="cta" align="center">
            {copy.title}
          </TextV2>
          <TextV2 variant="caption" tone="secondary" align="center" numberOfLines={1}>
            {share.context}
          </TextV2>
        </View>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: footerHeight + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.previewWrap}>
          {data ? (
            <View style={styles.preview}>
              <Scene
                width={PREVIEW.width}
                height={PREVIEW.height}
                photo={photo}
                data={data}
                variant={variant}
                tone={tone}
                language={language}
                stickerScale={0.55}
                stickerCenter={variant === 'min' ? 0.72 : 0.54}
              />
            </View>
          ) : share.error ? (
            <BlockError message={copy.error} onRetry={share.retry} />
          ) : (
            <Skeleton width={PREVIEW.width} height={PREVIEW.height} radius={18} />
          )}
          <TextV2 variant="caption" tone="secondary" align="center">
            {copy.hint}
          </TextV2>
        </View>

        <View style={styles.gap10}>
          <TextV2 variant="eyebrow" tone="secondary">
            {copy.photo}
          </TextV2>
          <View style={styles.row8}>
            {(
              [
                { key: 'camera', label: copy.camera, icon: Camera },
                { key: 'gallery', label: copy.gallery, icon: ImageIcon },
                { key: 'none', label: copy.noPhoto, icon: X },
              ] as const
            ).map(item => {
              const on = source === item.key;
              return (
                <PressableScale
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    choosePhoto(item.key).catch(() => undefined);
                  }}
                  style={[styles.photoPill, { backgroundColor: on ? ink : pill }]}
                >
                  <item.icon size={16} color={on ? inkText : colors.text.primary} strokeWidth={2} />
                  <TextV2 variant="bodyStrong" color={on ? inkText : colors.text.primary} style={styles.fs15}>
                    {item.label}
                  </TextV2>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={styles.gap10}>
          <View style={styles.between}>
            <TextV2 variant="eyebrow" tone="secondary">
              {copy.sticker}
            </TextV2>
            <TextV2 variant="caption" tone="secondary">
              {copy.tones[tone]}
            </TextV2>
          </View>
          <View style={styles.stickerRow}>
            <Segmented
              options={[
                { key: 'full', label: copy.full },
                { key: 'min', label: copy.min },
              ]}
              value={variant}
              onChange={setVariant}
              style={styles.flex1}
            />
            {SWATCHES.map(item => {
              const on = tone === item.tone;
              return (
                <PressableScale
                  key={item.tone}
                  accessibilityRole="radio"
                  accessibilityLabel={copy.tones[item.tone]}
                  accessibilityState={{ selected: on }}
                  onPress={() => chooseTone(item.tone)}
                  style={[styles.swatchRing, on ? { borderColor: colors.text.primary } : styles.swatchRingOff]}
                >
                  <Swatch tone={item.tone} />
                </PressableScale>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <GlassSurface style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !data, busy: busy === 'stories' }}
          disabled={!data || busy !== null}
          onPress={() => {
            stories().catch(() => undefined);
          }}
          style={[styles.primary, { backgroundColor: ink, opacity: !data || busy === 'stories' ? 0.6 : 1 }]}
        >
          <StoriesIcon color={inkText} />
          <TextV2 variant="cta" color={inkText}>
            {copy.stories}
          </TextV2>
        </PressableScale>
        <View style={styles.row8}>
          {(
            [
              { key: 'download', label: copy.download, icon: Download, run: download },
              { key: 'more', label: copy.more, icon: Share2, run: more },
              { key: 'community', label: copy.community, icon: Users, run: async () => community() },
            ] as const
          ).map(item => (
            <PressableScale
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ busy: busy === item.key }}
              disabled={!data || busy !== null}
              onPress={() => {
                item.run().catch(() => undefined);
              }}
              style={[styles.secondary, { backgroundColor: pill, opacity: !data || busy === item.key ? 0.6 : 1 }]}
            >
              <item.icon size={16} color={colors.text.primary} strokeWidth={2} />
              <TextV2 variant="bodyStrong" style={styles.fs14} numberOfLines={1}>
                {item.label}
              </TextV2>
            </PressableScale>
          ))}
        </View>
      </GlassSurface>

      {/* Off screen: what gets exported (same render as the preview). */}
      {data ? (
        <View pointerEvents="none" style={[styles.offscreen, { left: -screenWidth * 4 }]}>
          <View ref={stickerRef} collapsable={false} style={styles.stickerExport}>
            <ShareSticker data={data} variant={variant} tone={tone} language={language} />
          </View>
          <View ref={sceneRef} collapsable={false}>
            <Scene
              width={SCENE.width}
              height={SCENE.height}
              photo={photo}
              data={data}
              variant={variant}
              tone={tone}
              language={language}
              stickerScale={(variant === 'min' ? COMBINED.minWidth : COMBINED.fullWidth) / 3 / stickerSize(data, variant).width}
              stickerCenter={COMBINED.stickerCenterY / COMBINED.height}
              rounded={false}
            />
          </View>
          <View ref={backgroundRef} collapsable={false}>
            <Scene width={SCENE.width} height={SCENE.height} photo={photo} data={null} rounded={false} />
          </View>
        </View>
      ) : null}

      <Sheet
        open={sheet === 'noInstagram'}
        onClose={() => setSheet(null)}
        eyebrow={copy.noInstagramEyebrow}
        title={copy.noInstagramTitle}
        footer={
          <View style={styles.sheetFooter}>
            <Button label={copy.saveImage} loading={busy === 'download'} onPress={() => download()} fullWidth />
            <Button label={copy.otherWays} variant="secondary" onPress={() => more()} fullWidth />
            <Button label={copy.notNow} variant="text" onPress={() => setSheet(null)} fullWidth />
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          {copy.noInstagramText}
        </TextV2>
      </Sheet>

      <Sheet
        open={sheet === 'photosDenied'}
        onClose={() => setSheet(null)}
        title={copy.photosDeniedTitle}
        footer={
          <View style={styles.sheetFooter}>
            <Button
              label={copy.openSettings}
              onPress={() => {
                setSheet(null);
                Linking.openSettings().catch(() => undefined);
              }}
              fullWidth
            />
            <Button label={copy.notNow} variant="text" onPress={() => setSheet(null)} fullWidth />
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          {copy.photosDeniedText}
        </TextV2>
      </Sheet>
    </View>
  );
}

// A 9:16 scene: the photo (cover) or the brand background, and the sticker
// at `stickerScale` with its centre at `stickerCenter` of the height.
function Scene({
  width,
  height,
  photo,
  data,
  variant = 'full',
  tone = 'glass',
  language = 'es',
  stickerScale = 1,
  stickerCenter = 0.54,
  rounded = true,
}: {
  width: number;
  height: number;
  photo: string | null;
  data: StickerData | null;
  variant?: StickerVariant;
  tone?: StickerTone;
  language?: ShareLanguage;
  stickerScale?: number;
  stickerCenter?: number;
  rounded?: boolean;
}) {
  const size = data ? stickerSize(data, variant) : { width: 0, height: 0 };
  return (
    <View style={[{ width, height }, styles.scene, rounded ? styles.sceneRounded : null]}>
      {photo ? (
        <Image source={{ uri: photo }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <BrandBackground width={width} height={height} />
      )}
      {data ? (
        <View
          style={[
            styles.stickerSlot,
            {
              width: size.width,
              height: size.height,
              left: (width - size.width) / 2,
              top: height * stickerCenter - size.height / 2,
              transform: [{ scale: stickerScale }],
            },
          ]}
        >
          <ShareSticker data={data} variant={variant} tone={tone} language={language} />
        </View>
      ) : null}
    </View>
  );
}

function Swatch({ tone }: { tone: StickerTone }) {
  if (tone === 'glass') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={18} fill="#CFCDC8" />
        <Path d="M30.7 5.3 A18 18 0 0 1 5.3 30.7 Z" fill="#6E6C68" />
      </Svg>
    );
  }
  return (
    <View
      style={[
        styles.swatch,
        tone === 'light' ? styles.swatchLight : styles.swatchDark,
      ]}
    />
  );
}

// The story circle with a "+".
function StoriesIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={1.8} strokeDasharray="3 2.4" />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex1: { flex: 1 },
  fs14: { fontSize: 14 },
  fs15: { fontSize: 15 },
  gap10: { gap: 10 },
  row8: { flexDirection: 'row', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  headerTexts: { flex: 1, gap: 2 },
  headerSide: { width: 44 },
  body: { paddingHorizontal: 20, paddingTop: 12, gap: 22 },
  previewWrap: { alignItems: 'center', gap: 14 },
  preview: { borderRadius: 18, boxShadow: '0 18px 40px rgba(0,0,0,.22)' },
  scene: { overflow: 'hidden' },
  sceneRounded: { borderRadius: 18 },
  stickerSlot: { position: 'absolute' },
  photoPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  stickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatchRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchRingOff: { borderColor: 'transparent' },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchLight: { backgroundColor: '#F7F6F3', boxShadow: 'inset 0 0 0 1px rgba(18,18,18,.12)' },
  swatchDark: { backgroundColor: '#141312' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20, gap: 8 },
  primary: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondary: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  offscreen: { position: 'absolute', top: 0 },
  stickerExport: { padding: STICKER_MARGIN, backgroundColor: 'transparent', alignSelf: 'flex-start' },
  sheetFooter: { flex: 1, gap: 4 },
});
