import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Video, {
  type OnLoadData,
  type ReactVideoPosterSource,
} from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import { Maximize2, Minimize2, Pause, Play } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { MOVEKIT_POSTER } from '@app/features/workouts/workoutAssets';

// ─────────────────────────────────────────────────────────────────────────────
// MoveKit · single integration point of the exercise video (handoff §9).
//
// TODO(movekit): replace the poster with the pre-rendered MP4 of the exercise
// (fixed camera, autoplay, loop, no audio) once the assets and a video
// player exist. Wire here, and only here:
//   - `exercise.videoUrl` → player source; poster = first clean frame;
//   - play / pause, speed 0,5× / 1× / 1,5× and fullscreen. No progress bar:
//     the video loops (B-19).
// No video library is installed on purpose (no new native dependencies).
// ─────────────────────────────────────────────────────────────────────────────

// Speeds, in the order the button cycles through them (B-19).
type Speed = '1×' | '1,5×' | '0,5×';
const SPEEDS: readonly Speed[] = ['1×', '1,5×', '0,5×'];
const RATE: Record<Speed, number> = { '0,5×': 0.5, '1×': 1, '1,5×': 1.5 };
const nextSpeed = (current: Speed): Speed =>
  SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length];

export type MoveKitVariant = 'bleed' | 'lightbox';

type MoveKitPlayerProps = {
  title: string;
  posterUrl?: string | null;
  videoUrl?: string | null;
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
  posterUrl,
  videoUrl,
  variant,
  fullscreen,
  onFullscreenChange,
  topInset,
  topLeft,
  topRight,
}: MoveKitPlayerProps) {
  const { colors } = useThemeV2();
  const { width } = useWindowDimensions();
  const [speed, setSpeed] = useState<Speed>('1×');
  const [paused, setPaused] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const lightbox = variant === 'lightbox';

  useEffect(() => {
    setVideoFailed(false);
  }, [videoUrl]);

  return (
    <>
      <View
        style={
          lightbox ? [styles.lightbox, { marginTop: topInset }] : styles.bleed
        }
      >
        <View
          style={[StyleSheet.absoluteFill, lightbox && styles.lightboxClip]}
        >
          {videoUrl && !videoFailed ? (
            <Video
              source={{ uri: videoUrl }}
              resizeMode="cover"
              repeat
              muted
              paused={paused}
              rate={RATE[speed as Speed] ?? 1}
              poster={{
                source: (posterUrl
                  ? { uri: posterUrl }
                  : MOVEKIT_POSTER) as ReactVideoPosterSource,
                resizeMode: 'cover',
              }}
              onError={() => setVideoFailed(true)}
              style={
                lightbox ? [styles.posterLightbox, { width }] : styles.poster
              }
            />
          ) : (
            <Image
              source={posterUrl ? { uri: posterUrl } : MOVEKIT_POSTER}
              resizeMode="cover"
              style={
                lightbox ? [styles.posterLightbox, { width }] : styles.poster
              }
              accessibilityLabel={`Video de técnica de ${title}`}
            />
          )}
          {!lightbox ? (
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(247,246,243,0)',
                'rgba(247,246,243,.9)',
                colors.bg,
              ]}
              locations={[0, 0.7, 1]}
              style={styles.fade}
            />
          ) : null}
        </View>
        {videoUrl ? null : (
          <TextV2 variant="micro" color="#7A7772" style={styles.mockLabel}>
            VIDEO NO DISPONIBLE
          </TextV2>
        )}
        {/* No progress bar: the video loops (B-19). */}
        <View style={styles.controls}>
          <View style={styles.buttons}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Velocidad ${speed}`}
              onPress={() => setSpeed(nextSpeed)}
              style={styles.speed}
            >
              <TextV2
                variant="captionStrong"
                color="#6B6964"
                style={styles.bold}
              >
                {speed}
              </TextV2>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Pantalla completa"
              onPress={() => onFullscreenChange(true)}
              style={styles.small}
            >
              <Maximize2
                size={15}
                color="#121212"
                strokeWidth={2}
                style={styles.dimIcon}
              />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Reproducir' : 'Pausar'}
              onPress={() => setPaused(current => !current)}
              style={[styles.small, styles.playSmall]}
            >
              {paused ? (
                <Play size={13} color="#121212" strokeWidth={2} />
              ) : (
                <Pause size={13} color="#121212" strokeWidth={2} />
              )}
            </PressableScale>
          </View>
        </View>
        <View
          style={[styles.top, lightbox ? styles.topBox : { top: topInset + 4 }]}
        >
          {topLeft}
          {topRight}
        </View>
      </View>

      <MoveKitFullscreen
        visible={fullscreen}
        posterUrl={posterUrl}
        videoUrl={videoFailed ? null : videoUrl}
        speed={speed}
        paused={paused}
        onSpeedChange={() => setSpeed(nextSpeed)}
        onPauseChange={() => setPaused(current => !current)}
        onVideoError={() => setVideoFailed(true)}
        onClose={() => onFullscreenChange(false)}
      />
    </>
  );
}

// Fullscreen is intentionally independent from the inline hero layout.
function MoveKitFullscreen({
  visible,
  posterUrl,
  videoUrl,
  speed,
  paused,
  onSpeedChange,
  onPauseChange,
  onVideoError,
  onClose,
}: {
  visible: boolean;
  posterUrl?: string | null;
  videoUrl?: string | null;
  speed: string;
  paused: boolean;
  onSpeedChange: () => void;
  onPauseChange: () => void;
  onVideoError: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setVideoAspectRatio(null);
  }, [videoUrl]);

  // MoveKit's landscape MP4s have a narrower frame than a landscape phone.
  // Enlarge that frame enough to remove the side bands while keeping the
  // subject near the bottom of the viewport. The video itself stays contain.
  const landscapeFrame =
    width > height &&
    videoAspectRatio !== null &&
    videoAspectRatio > 1.5 &&
    width / height > videoAspectRatio
      ? (() => {
          const scale = Math.min(width / (height * videoAspectRatio), 1.3);
          const frameWidth = height * videoAspectRatio * scale;
          const frameHeight = height * scale;

          return {
            position: 'absolute' as const,
            left: (width - frameWidth) / 2,
            top: -(frameHeight - height) * 0.9,
            width: frameWidth,
            height: frameHeight,
          };
        })()
      : StyleSheet.absoluteFill;

  // Only touch the orientation on real open → close transitions; the detail
  // screen must not be forced to portrait just by mounting this component.
  useEffect(() => {
    if (!visible) {
      return;
    }

    Orientation.lockToLandscape();

    return () => {
      Orientation.lockToPortrait();
    };
  }, [visible]);

  const handleClose = () => {
    Orientation.lockToPortrait();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape-left',
        'landscape-right',
      ]}
      onRequestClose={handleClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.fullscreen, { width, height }]}>
        <StatusBar hidden />
        {videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            resizeMode="contain"
            repeat
            muted
            paused={paused}
            rate={RATE[speed as Speed] ?? 1}
            poster={{
              source: (posterUrl
                ? { uri: posterUrl }
                : MOVEKIT_POSTER) as ReactVideoPosterSource,
              resizeMode: 'contain',
            }}
            onLoad={({ naturalSize }: OnLoadData) => {
              if (naturalSize.width > 0 && naturalSize.height > 0) {
                setVideoAspectRatio(naturalSize.width / naturalSize.height);
              }
            }}
            onError={onVideoError}
            style={landscapeFrame}
          />
        ) : (
          <Image
            source={posterUrl ? { uri: posterUrl } : MOVEKIT_POSTER}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            styles.fullControls,
            {
              left: insets.left + 20,
              right: insets.right + 20,
              bottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.fullButtons}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Velocidad ${speed}`}
              onPress={onSpeedChange}
              style={styles.fullSpeed}
            >
              <TextV2
                variant="metaStrong"
                color="#6B6964"
                style={styles.fullSpeedText}
              >
                {speed}
              </TextV2>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Salir de pantalla completa"
              onPress={handleClose}
              style={styles.fullButton}
            >
              <Minimize2 size={20} color="#A5A5A5" strokeWidth={2} />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Reproducir' : 'Pausar'}
              onPress={onPauseChange}
              style={[styles.fullButton, styles.fullPlay]}
            >
              {paused ? (
                <Play size={21} color="#121212" strokeWidth={2.2} />
              ) : (
                <Pause size={21} color="#121212" strokeWidth={2.2} />
              )}
            </PressableScale>
          </View>
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
  // Preserve the original lightbox composition: the 500 pt media frame is
  // clipped by the 486 pt hero and shifted upward inside its rounded box.
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
    justifyContent: 'flex-end',
    gap: 14,
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#F0EFEC',
    overflow: 'hidden',
  },
  fullControls: {
    position: 'absolute',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fullButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullSpeed: {
    minWidth: 50,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullSpeedText: {
    fontSize: 18,
  },
  fullButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPlay: { backgroundColor: 'rgba(18,18,18,.08)' },
});
