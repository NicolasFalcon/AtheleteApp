import { GuideAnchor, useGuide } from '@app/features/guides/GuideAnchor';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera as CameraIcon, Image as ImageIcon, X, Zap, ZapOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, LivingHalo, PressableScale, StatusBarV2, TextV2 } from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { haptics } from '@app/components/v2/haptics';

const SCENE = '#0E0D0C';
const CORNER = 44;

// Live camera of the photo flows (design §23.3 / §10): full screen, dark in
// both modes. Header: close · a pill "Registrar con ELLIE" with the mini Halo ·
// flash. A 300 × 300 framing guide with four corners (white; Ember when ELLIE
// recognises the subject, a feature that is not available yet), a hint, and at
// the bottom the gallery, the shutter and an optional "Sin foto".
export function CameraCapture({
  kind,
  language,
  headerLabel,
  notice,
  onCaptured,
  onGallery,
  onClose,
  onNoPhoto,
}: {
  kind: 'meal' | 'machine';
  language: EllieLanguage;
  headerLabel: string;
  // "Quedan 2 análisis hoy" / "Hoy llevas 1.240 kcal".
  notice?: string | null;
  onCaptured: (uri: string) => void;
  onGallery: () => void;
  onClose: () => void;
  // Meal only: a way out without a photo (kcal rápidas).
  onNoPhoto?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const es = language === 'es';
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);
  // Guías (25.4): Escanear (machine) and Cámara de Calorías (meal), once the
  // camera is live.
  const tour = kind === 'meal' ? 'calories' : 'scan';
  useGuide(tour, { enabled: permission?.granted === true });

  const shoot = async () => {
    if (busy || !camera.current) {
      return;
    }
    setBusy(true);
    haptics.light();
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.9 });
      if (picture?.uri) {
        onCaptured(picture.uri);
      }
    } catch {
      // The camera was not ready: the person taps again.
    } finally {
      setBusy(false);
    }
  };

  const hint =
    kind === 'meal'
      ? es ? 'Encuadra el plato completo' : 'Frame the whole plate'
      : es ? 'Encuadra toda la máquina' : 'Frame the whole machine';

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={es ? 'Cerrar' : 'Close'}
        onPress={onClose}
        style={styles.round44}
      >
        <X size={20} color="#FFFFFF" strokeWidth={2} />
      </PressableScale>
      <View style={styles.pill}>
        <LivingHalo size={20} state="idle" />
        <TextV2 variant="bodyStrong" color="#FFFFFF">
          {headerLabel}
        </TextV2>
      </View>
      {permission?.granted ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={es ? 'Linterna' : 'Flash'}
          accessibilityState={{ selected: torch }}
          onPress={() => setTorch(value => !value)}
          style={styles.round44}
        >
          {torch ? (
            <Zap size={20} color="#FFFFFF" strokeWidth={2} />
          ) : (
            <ZapOff size={20} color="#FFFFFF" strokeWidth={2} />
          )}
        </PressableScale>
      ) : (
        <View style={styles.round44Spacer} />
      )}
    </View>
  );

  // Asking for the first time: explain before the system dialog.
  if (permission && !permission.granted && permission.canAskAgain && permission.status === 'undetermined') {
    return (
      <View style={[styles.fill, { backgroundColor: SCENE }]}>
        <StatusBarV2 style="light" />
        {header}
        <View style={styles.center}>
          <View style={styles.circle88}>
            <CameraIcon size={34} color="#FFFFFF" strokeWidth={1.8} />
          </View>
          <TextV2 variant="title22" color="#FFFFFF" align="center">
            {es ? 'Tu cámara, solo para la foto' : 'Your camera, only for the photo'}
          </TextV2>
          <TextV2 variant="body" color="#A8A6A1" align="center">
            {kind === 'meal'
              ? es
                ? 'ATHELETE usa la cámara para que ELLIE vea tu plato y calcule las kcal y los macros. La foto es privada.'
                : 'ATHELETE uses the camera so ELLIE can see your plate and work out the kcal and macros. The photo is private.'
              : es
                ? 'ATHELETE usa la cámara para que ELLIE reconozca la máquina del gimnasio.'
                : 'ATHELETE uses the camera so ELLIE can recognise the gym machine.'}
          </TextV2>
          <View style={styles.actions}>
            <Button
              label={es ? 'Continuar' : 'Continue'}
              variant="onScene"
              fullWidth
              onPress={() => {
                requestPermission().catch(() => undefined);
              }}
            />
            <Button label={es ? 'Elegir de la galería' : 'Choose from gallery'} variant="secondary" fullWidth onPress={onGallery} />
          </View>
        </View>
      </View>
    );
  }

  // Denied: always a way out without the camera.
  if (permission && !permission.granted) {
    return (
      <View style={[styles.fill, { backgroundColor: SCENE }]}>
        <StatusBarV2 style="light" />
        {header}
        <View style={styles.center}>
          <View style={styles.circle88}>
            <CameraIcon size={34} color="#FFFFFF" strokeWidth={1.8} />
          </View>
          <TextV2 variant="title22" color="#FFFFFF" align="center">
            {es ? 'ATHELETE no tiene acceso a la cámara' : 'ATHELETE has no access to the camera'}
          </TextV2>
          <TextV2 variant="body" color="#A8A6A1" align="center">
            {es
              ? 'Actívala en Ajustes para hacer la foto, o elige una de tu galería.'
              : 'Turn it on in Settings to take the photo, or choose one from your gallery.'}
          </TextV2>
          <View style={styles.actions}>
            <Button
              label={es ? 'Abrir Ajustes' : 'Open Settings'}
              variant="onScene"
              fullWidth
              onPress={() => {
                Linking.openSettings().catch(() => undefined);
              }}
            />
            <Button label={es ? 'Elegir de la galería' : 'Choose from gallery'} variant="secondary" fullWidth onPress={onGallery} />
            {onNoPhoto ? (
              <Button label={es ? 'Registrar solo kcal' : 'Log just kcal'} variant="text" fullWidth onPress={onNoPhoto} />
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: SCENE }]}>
      <StatusBarV2 style="light" />
      {permission?.granted ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
      ) : null}
      {header}
      {notice ? (
        <View style={styles.noticeRow}>
          <View style={styles.noticePill}>
            <TextV2 variant="metaStrong" color="#FFFFFF">
              {notice}
            </TextV2>
          </View>
        </View>
      ) : null}

      <View style={styles.frameWrap} pointerEvents="none">
        <GuideAnchor id={`${tour}.frame`} pointerEvents="none">
          <View style={styles.frame}>
            {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
              <View key={corner} style={[styles.corner, styles[corner]]} />
            ))}
            {kind === 'meal' ? <View style={styles.plate} /> : null}
          </View>
        </GuideAnchor>
        <View style={styles.hint}>
          <TextV2 variant="meta" color="#FFFFFF">
            {hint}
          </TextV2>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.sideStart}>
          <GuideAnchor id={`${tour}.gallery`}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={es ? 'Galería' : 'Gallery'}
              onPress={onGallery}
              style={styles.round52}
            >
              <ImageIcon size={22} color="#FFFFFF" strokeWidth={2} />
            </PressableScale>
          </GuideAnchor>
        </View>
        <GuideAnchor id={`${tour}.shutter`}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={es ? 'Hacer la foto' : 'Take the photo'}
          accessibilityState={{ busy }}
          onPress={() => {
            shoot().catch(() => undefined);
          }}
          style={styles.shutterRing}
        >
          <View style={[styles.shutter, busy ? styles.shutterBusy : null]} />
        </PressableScale>
        </GuideAnchor>
        <View style={styles.side}>
          {onNoPhoto ? (
            <GuideAnchor id={`${tour}.noPhoto`}>
              <PressableScale accessibilityRole="button" onPress={onNoPhoto} style={styles.noPhoto}>
                <TextV2 variant="bodyStrong" color="#FFFFFF">
                  {es ? 'Sin foto' : 'No photo'}
                </TextV2>
              </PressableScale>
            </GuideAnchor>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  round44: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  round44Spacer: { width: 44, height: 44 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.14)' },
  noticeRow: { alignItems: 'center', paddingTop: 12 },
  noticePill: { paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.14)', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  circle88: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 14 },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 22 },
  frame: { width: 300, height: 300 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF', borderWidth: 0 },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 26 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 26 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 26 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 26 },
  plate: { position: 'absolute', left: 42, right: 42, top: 42, bottom: 42, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,.28)' },
  hint: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.14)', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  side: { flex: 1, alignItems: 'flex-end' },
  sideStart: { flex: 1, alignItems: 'flex-start' },
  round52: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  shutterRing: { flex: 0, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', },
  shutter: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF' },
  shutterBusy: { opacity: 0.6 },
  noPhoto: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
});
