import { useState } from 'react';
import { Image, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Maximize2, Minimize2, Pause, X } from 'lucide-react-native';
import {
  IconButton,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { MOVEKIT_POSTER } from '@app/features/workouts/workoutAssets';

// ─────────────────────────────────────────────────────────────────────────────
// MoveKit · single integration point of the exercise video (handoff §9).
//
// TODO(movekit): replace the poster with the pre-rendered MP4 of the exercise
// (fixed camera, autoplay, loop, no audio) once the assets and a video
// player exist. Wire here, and only here:
//   - `exercise.videoUrl` → player source; poster = first clean frame;
//   - play / pause, speed 1× / 0,5× (the controls below are already laid out
//     and intentionally inactive);
//   - phase segments + the technique step that lights up with the loop.
// No video library is installed on purpose (no new native dependencies).
// ─────────────────────────────────────────────────────────────────────────────

const PHASES = 4;
// Static frame of the poster (phase 2 of 4: lowering). TODO(movekit): drive
// it with the video time.
const ACTIVE_PHASE = 1;

export type MoveKitVariant = 'bleed' | 'lightbox';

type MoveKitPlayerProps = {
  title: string;
  // Light: full bleed over the studio background, fading into the screen.
  // Dark: floating light box (margin 10, radius 34), the asset is not dimmed.
  variant: MoveKitVariant;
  fullscreen: boolean;
  onFullscreenChange: (value: boolean) => void;
  topInset: number;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
};

export function MoveKitPlayer({
  title,
  variant,
  fullscreen,
  onFullscreenChange,
  topInset,
  topLeft,
  topRight,
}: MoveKitPlayerProps) {
  const { colors } = useThemeV2();
  const { width } = useWindowDimensions();
  const [speed, setSpeed] = useState<'1×' | '0,5×'>('1×');
  const lightbox = variant === 'lightbox';

  return (
    <>
      <View
        style={
          lightbox
            ? [styles.lightbox, { marginTop: topInset }]
            : styles.bleed
        }
      >
        <View style={[StyleSheet.absoluteFill, lightbox && styles.lightboxClip]}>
          {/* Poster = PLACEHOLDER of the MoveKit video. */}
          <Image
            source={MOVEKIT_POSTER}
            resizeMode="cover"
            style={lightbox ? [styles.posterLightbox, { width }] : styles.poster}
            accessibilityLabel={`Video de técnica de ${title} (próximamente)`}
          />
          {!lightbox ? (
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(247,246,243,0)', 'rgba(247,246,243,.9)', colors.bg]}
              locations={[0, 0.7, 1]}
              style={styles.fade}
            />
          ) : null}
        </View>
        <TextV2 variant="micro" color="#7A7772" style={styles.mockLabel}>
          VIDEO MOVEKIT · PLACEHOLDER
        </TextV2>
        <View style={styles.controls}>
          <PhaseSegments height={2} />
          <View style={styles.buttons}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Velocidad ${speed}`}
              onPress={() => setSpeed(current => (current === '1×' ? '0,5×' : '1×'))}
              style={styles.speed}
            >
              <TextV2 variant="captionStrong" color="#6B6964" style={styles.bold}>
                {speed}
              </TextV2>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Pantalla completa"
              onPress={() => onFullscreenChange(true)}
              style={styles.small}
            >
              <Maximize2 size={15} color="#121212" strokeWidth={2} style={styles.dimIcon} />
            </PressableScale>
            <View
              accessibilityRole="button"
              accessibilityLabel="Reproducir o pausar (próximamente)"
              accessibilityState={{ disabled: true }}
              style={[styles.small, styles.playSmall]}
            >
              <Pause size={13} color="#121212" strokeWidth={2} />
            </View>
          </View>
        </View>
        <View style={[styles.top, lightbox ? styles.topBox : { top: topInset + 4 }]}>
          {topLeft}
          {topRight}
        </View>
      </View>

      <MoveKitFullscreen
        visible={fullscreen}
        title={title}
        speed={speed}
        onSpeed={() => setSpeed(current => (current === '1×' ? '0,5×' : '1×'))}
        onClose={() => onFullscreenChange(false)}
      />
    </>
  );
}

function PhaseSegments({ height }: { height: number }) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: PHASES }, (_, index) => (
        <View
          key={index}
          style={[styles.segment, { height, borderRadius: height / 2 }]}
        >
          {index < ACTIVE_PHASE ? <View style={styles.segmentDone} /> : null}
          {index === ACTIVE_PHASE ? <View style={styles.segmentFill} /> : null}
        </View>
      ))}
    </View>
  );
}

// EXERCISE_02: the loop full screen, controls grouped in a glass pill.
function MoveKitFullscreen({
  visible,
  title,
  speed,
  onSpeed,
  onClose,
}: {
  visible: boolean;
  title: string;
  speed: string;
  onSpeed: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.fullscreen}>
        <StatusBarV2 style="dark" />
        <Image source={MOVEKIT_POSTER} resizeMode="cover" style={styles.fullPoster} />
        <View style={[styles.fullTop, { top: insets.top + 4 }]}>
          <View style={styles.titlePill}>
            <TextV2 variant="metaStrong" color="#121212" numberOfLines={1}>
              {title}
            </TextV2>
          </View>
          <IconButton icon={X} variant="studio" accessibilityLabel="Cerrar" onPress={onClose} />
        </View>
        <View style={[styles.fullControls, { bottom: insets.bottom + 14 }]}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Velocidad ${speed}`}
            onPress={onSpeed}
            style={styles.fullSpeed}
          >
            <TextV2 variant="metaStrong" color="#121212" style={styles.bold}>
              {speed}
            </TextV2>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Salir de pantalla completa"
            onPress={onClose}
            style={styles.fullButton}
          >
            <Minimize2 size={17} color="#121212" strokeWidth={2} />
          </PressableScale>
          <View
            accessibilityRole="button"
            accessibilityLabel="Reproducir o pausar (próximamente)"
            accessibilityState={{ disabled: true }}
            style={[styles.fullButton, styles.fullPlay]}
          >
            <Pause size={15} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
        <View style={[styles.fullSegments, { bottom: insets.bottom - 4 }]}>
          <PhaseSegments height={3} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  bleed: {
    height: 500,
    backgroundColor: '#F0EFEC',
  },
  lightbox: {
    height: 486,
    marginHorizontal: 10,
    borderRadius: 34,
    backgroundColor: '#F0EFEC',
    boxShadow: '0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)',
  },
  lightboxClip: {
    borderRadius: 34,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  // The poster is composed for the 500 pt bleed area; in the box the figure
  // sits 54 pt higher (prototype: top 24 instead of 78).
  posterLightbox: {
    position: 'absolute',
    top: -54,
    left: -10,
    height: 500,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
  },
  mockLabel: {
    position: 'absolute',
    left: 20,
    bottom: 40,
    fontSize: 9,
    letterSpacing: 0.54,
    fontWeight: '400',
  },
  controls: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    backgroundColor: 'rgba(18,18,18,.1)',
    overflow: 'hidden',
  },
  segmentDone: {
    width: '100%',
    height: '100%',
    backgroundColor: '#121212',
  },
  segmentFill: {
    width: '45%',
    height: '100%',
    backgroundColor: '#FF5B1F',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  speed: {
    minWidth: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimIcon: { opacity: 0.6 },
  playSmall: { backgroundColor: 'rgba(18,18,18,.08)' },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBox: { top: 12 },
  fullscreen: {
    flex: 1,
    backgroundColor: '#F0EFEC',
  },
  fullPoster: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 122,
    height: 500,
    width: '100%',
  },
  fullTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titlePill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.72)',
    justifyContent: 'center',
    maxWidth: '75%',
  },
  fullControls: {
    position: 'absolute',
    right: 16,
    height: 48,
    paddingLeft: 6,
    paddingRight: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,.72)',
    boxShadow: '0 0 0 .5px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fullSpeed: {
    minWidth: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPlay: { backgroundColor: '#121212' },
  fullSegments: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
  },
});
