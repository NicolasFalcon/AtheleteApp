import { useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatusBarV2 } from '@app/components/v2';

const SCENE = '#0E0D0C';

// The photo of a meal as the header of the result and the detail (B-18): the
// whole plate (contain, centred on a dark plate, never cropped) and below the
// status bar; the buttons sit on top. Tapping it opens it full screen.
export function MealPhoto({
  uri,
  height,
  label,
  closeLabel,
  children,
}: {
  uri: string | null;
  // Height of the photo area (the status bar is added on top).
  height: number;
  // Accessibility label of the photo ("Ver foto").
  label: string;
  closeLabel: string;
  // Buttons and chips over the photo.
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.hero, { height: height + insets.top }]}>
      {uri ? (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={label}
          onPress={() => setOpen(true)}
          style={[styles.photo, { top: insets.top }]}
        >
          <Image source={{ uri }} style={styles.fill} resizeMode="contain" />
        </Pressable>
      ) : null}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {children}
      </View>
      <Modal
        visible={open}
        animationType="fade"
        presentationStyle="overFullScreen"
        transparent
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.full}>
          <StatusBarV2 style="light" />
          {uri ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={() => setOpen(false)}
              style={[styles.fullPhoto, { top: insets.top, bottom: insets.bottom }]}
            >
              <Image source={{ uri }} style={styles.fill} resizeMode="contain" />
            </Pressable>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={() => setOpen(false)}
            style={[styles.close, { top: insets.top + 8 }]}
          >
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </PressableScale>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: SCENE, overflow: 'hidden' },
  photo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fill: { width: '100%', height: '100%' },
  full: { flex: 1, backgroundColor: '#000000' },
  fullPhoto: { position: 'absolute', left: 0, right: 0 },
  close: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14,13,12,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
