import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Camera as CameraRoll, Image as ImageIcon } from 'lucide-react-native';
import { Camera } from 'expo-camera';
import { Button, PressableScale, Sheet, TextV2, useThemeV2 } from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { pickFromGallery, takeWithSystemCamera, type PickedPhoto } from '@app/features/vision/picker';

type Step = 'menu' | 'rationale' | 'denied';

// The photo button of the chat (decision D2): a menu with Cámara / Galería. The
// first time the camera is asked for, v2 explains it before the system dialog;
// if it was refused there is a way to Ajustes. The gallery needs no permission
// (the system picker only shows what the person chooses).
export function PhotoSourceSheet({
  open,
  onClose,
  onPicked,
  language,
}: {
  open: boolean;
  onClose: () => void;
  onPicked: (photo: PickedPhoto) => void;
  language: EllieLanguage;
}) {
  const { colors } = useThemeV2();
  const es = language === 'es';
  const [step, setStep] = useState<Step>('menu');

  const done = (photo: PickedPhoto | null) => {
    setStep('menu');
    onClose();
    if (photo) {
      onPicked(photo);
    }
  };

  const camera = async () => {
    const permission = await Camera.getCameraPermissionsAsync().catch(() => null);
    if (permission?.granted) {
      done(await takeWithSystemCamera());
    } else if (permission && !permission.canAskAgain) {
      setStep('denied');
    } else if (permission?.status === 'undetermined') {
      setStep('rationale');
    } else {
      done(await takeWithSystemCamera());
    }
  };

  const allow = async () => {
    const result = await Camera.requestCameraPermissionsAsync().catch(() => null);
    if (result?.granted) {
      done(await takeWithSystemCamera());
    } else {
      setStep('denied');
    }
  };

  const gallery = async () => done(await pickFromGallery());

  return (
    <Sheet
      open={open}
      onClose={() => {
        setStep('menu');
        onClose();
      }}
      title={
        step === 'menu'
          ? es ? 'Añadir una foto' : 'Add a photo'
          : step === 'rationale'
            ? es ? 'Tu cámara, solo para la foto' : 'Your camera, only for the photo'
            : es ? 'La cámara está desactivada' : 'The camera is off'
      }
      footer={
        step === 'rationale' ? (
          <Button
            label={es ? 'Continuar' : 'Continue'}
            fullWidth
            onPress={() => {
              allow().catch(() => undefined);
            }}
          />
        ) : step === 'denied' ? (
          <View style={styles.footer}>
            <Button
              label={es ? 'Abrir Ajustes' : 'Open Settings'}
              fullWidth
              onPress={() => {
                Linking.openSettings().catch(() => undefined);
              }}
            />
            <Button
              label={es ? 'Elegir de la galería' : 'Choose from gallery'}
              variant="secondary"
              fullWidth
              onPress={() => {
                gallery().catch(() => undefined);
              }}
            />
          </View>
        ) : null
      }
    >
      {step === 'menu' ? (
        <View style={styles.menu}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              camera().catch(() => undefined);
            }}
            style={styles.row}
          >
            <CameraRoll size={22} color={colors.text.primary} strokeWidth={1.8} />
            <TextV2 variant="cta">{es ? 'Cámara' : 'Camera'}</TextV2>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              gallery().catch(() => undefined);
            }}
            style={styles.row}
          >
            <ImageIcon size={22} color={colors.text.primary} strokeWidth={1.8} />
            <TextV2 variant="cta">{es ? 'Galería' : 'Gallery'}</TextV2>
          </PressableScale>
        </View>
      ) : (
        <TextV2 variant="body" tone="secondary">
          {step === 'rationale'
            ? es
              ? 'ATHELETE usa la cámara para que ELLIE vea lo que le muestras (un plato, por ejemplo). La foto es privada.'
              : 'ATHELETE uses the camera so ELLIE can see what you show her (a plate, for example). The photo is private.'
            : es
              ? 'Actívala en Ajustes para hacer la foto, o elige una de tu galería.'
              : 'Turn it on in Settings to take the photo, or choose one from your gallery.'}
        </TextV2>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  menu: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  footer: { gap: 10 },
});
