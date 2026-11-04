import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Video, {
  type OnLoadData,
  type ReactVideoPosterSource,
} from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import { Maximize2, Minimize2, Pause, Play } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { MEDIA_PLACEHOLDER } from '@app/features/workouts/workoutAssets';

// ─────────────────────────────────────────────────────────────────────────────
// MoveKit · single integration point of the exercise video (handoff §9).
//   - `videoUrl` → player source (autoplay, loop, no audio); the poster (or
//     the brand placeholder, cover-bg) sits under it until the first frame;
//   - play / pause, speed 0,5× / 1× / 1,5× and fullscreen, floating over the
//     video. No progress bar: the video loops (B-19).
// ─────────────────────────────────────────────────────────────────────────────

// Speeds, in the order the button cycles through them (B-19).
type Speed = '1×' | '1,5×' | '0,5×';
const SPEEDS: readonly Speed[] = ['1×', '1,5×', '0,5×'];
const RATE: Record<Speed, number> = { '0,5×': 0.5, '1×': 1, '1,5×': 1.5 };
const nextSpeed = (current: Speed): Speed =>
  SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length];

// The MoveKit pack is landscape 16:9 (its thumbs are 960×536 frames of the
// same video); the real ratio of each MP4 replaces it on load.
export const MOVEKIT_ASPECT = 16 / 9;
const FADE_IN_MS = 200;

export type MoveKitLanguage = 'es' | 'en';

const LABELS = {
  es: {
    unavailable: 'Video no disponible',
    speed: (speed: string) => `Velocidad ${speed}`,
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    play: 'Reproducir',
    pause: 'Pausar',
    video: (title: string) => `Video de técnica de ${title}`,
  },
  en: {
    unavailable: 'Video not available',
    speed: (speed: string) => `Speed ${speed}`,
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    play: 'Play',
    pause: 'Pause',
    video: (title: string) => `Technique video of ${title}`,
  },
};
type Labels = (typeof LABELS)['es'];

// "cover" anchored at the top: fills the box without bands and never cuts
// the top of the figure (react-native-video has no content position).
function coverTop(boxWidth: number, boxHeight: number, aspect: number) {
  if (boxWidth / boxHeight > aspect) {
    return { position: 'absolute' as const, top: 0, left: 0, width: boxWidth, height: boxWidth / aspect };
  }
  const width = boxHeight * aspect;
  return { position: 'absolute' as const, top: 0, left: (boxWidth - width) / 2, width, height: boxHeight };
}

type MoveKitPlayerProps = {
  title: string;
  posterUrl?: string | null;
  videoUrl?: string | null;
  // The exercise has no video in the catalog: "Video no disponible".
  unavailable?: boolean;
  language?: MoveKitLanguage;
  // Full bleed, running under the status bar.
  height: number;
  // The bottom of the video fades into this colour (the screen background),
  // so the title can sit over it.
  fadeTo: string;
  // Room kept clear at the bottom (the title over the fade): the controls
  // float just above it.
  overlap?: number;
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
  unavailable = false,
  language = 'es',
  height,
  fadeTo,
  overlap = 0,
  fullscreen,
  onFullscreenChange,
  topInset,
  topLeft,
  topRight,
}: MoveKitPlayerProps) {
  const { width } = useWindowDimensions();
  const labels = LABELS[language];
  const [speed, setSpeed] = useState<Speed>('1×');
  const [paused, setPaused] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [aspect, setAspect] = useState(MOVEKIT_ASPECT);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setVideoFailed(false);
    videoOpacity.setValue(0);
  }, [videoOpacity, videoUrl]);

  const playable = Boolean(videoUrl && !videoFailed);
  // #RRGGBB → the same colour, fully transparent (no grey band on the way).
  const clear = /^#[0-9a-f]{6}$/i.test(fadeTo) ? `${fadeTo}00` : 'transparent';

  return (
    <>
      <View style={[styles.hero, { height }]}>
        {/* Poster (or the brand placeholder) under the video until its first
            frame; the real picture fades in over cover-bg. */}
        <ExpoImage
          source={posterUrl ? { uri: posterUrl } : MEDIA_PLACEHOLDER}
          placeholder={MEDIA_PLACEHOLDER}
          placeholderContentFit="cover"
          contentFit="cover"
          contentPosition="top"
          transition={posterUrl ? FADE_IN_MS : 0}
          style={StyleSheet.absoluteFill}
          accessibilityLabel={labels.video(title)}
        />
        {playable && videoUrl ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
          >
            <Video
              source={{ uri: videoUrl }}
              resizeMode="cover"
              repeat
              muted
              paused={paused}
              rate={RATE[speed as Speed] ?? 1}
              onLoad={({ naturalSize }: OnLoadData) => {
                if (naturalSize.width > 0 && naturalSize.height > 0) {
                  setAspect(naturalSize.width / naturalSize.height);
                }
              }}
              onReadyForDisplay={() => {
                Animated.timing(videoOpacity, {
                  toValue: 1,
                  duration: FADE_IN_MS,
                  useNativeDriver: true,
                }).start();
              }}
              onError={() => setVideoFailed(true)}
              style={coverTop(width, height, aspect)}
            />
          </Animated.View>
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={[clear, fadeTo]}
          locations={[0, 1]}
          style={[styles.fade, { height: Math.round(height * 0.45) }]}
        />
        {/* Top shade: the floating buttons and the status bar read over any
            frame. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,.35)', 'rgba(0,0,0,0)']}
          style={styles.topShade}
        />
        {unavailable || videoFailed ? (
          <View
            style={[styles.unavailable, { top: topInset, bottom: overlap }]}
            pointerEvents="none"
          >
            <View style={styles.unavailablePill}>
              <TextV2 variant="micro" color="rgba(255,255,255,.82)" style={styles.unavailableText}>
                {labels.unavailable.toUpperCase()}
              </TextV2>
            </View>
          </View>
        ) : null}
        {/* Floating over the video, above the title. No progress bar: the
            video loops (B-19). */}
        {playable ? (
          <View style={[styles.controls, { bottom: overlap + 12 }]}>
            <GlassControl
              accessibilityLabel={labels.speed(speed)}
              onPress={() => setSpeed(nextSpeed)}
            >
              <TextV2 variant="captionStrong" color="#FFFFFF" style={styles.bold}>
                {speed}
              </TextV2>
            </GlassControl>
            <GlassControl
              accessibilityLabel={labels.fullscreen}
              onPress={() => onFullscreenChange(true)}
            >
              <Maximize2 size={20} color="#FFFFFF" strokeWidth={2} />
            </GlassControl>
            <GlassControl
              accessibilityLabel={paused ? labels.play : labels.pause}
              onPress={() => setPaused(current => !current)}
            >
              {paused ? (
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
              ) : (
                <Pause size={20} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
              )}
            </GlassControl>
          </View>
        ) : null}
        <View style={[styles.top, { top: topInset + 4 }]}>
          {topLeft}
          {topRight}
        </View>
      </View>

      <MoveKitFullscreen
        visible={fullscreen}
        labels={labels}
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

// Same dark glass as the header buttons (IconButton 'studio'): 44 pt circle,
// blur, 1 pt light border and a soft shadow.
function GlassControl({
  accessibilityLabel,
  onPress,
  children,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { blur } = useThemeV2();
  const blurred = Platform.OS === 'ios';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.control, !blurred && { backgroundColor: GLASS }]}
    >
      {blurred ? (
        <View style={styles.controlClip}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={blur.glass}
            reducedTransparencyFallbackColor={GLASS}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS }]} />
        </View>
      ) : null}
      {children}
    </PressableScale>
  );
}

const GLASS = 'rgba(18,18,18,.72)';

// Fullscreen is intentionally independent from the inline hero layout.
function MoveKitFullscreen({
  visible,
  labels,
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
  labels: Labels;
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
                : MEDIA_PLACEHOLDER) as ReactVideoPosterSource,
              resizeMode: posterUrl ? 'contain' : 'cover',
            }}
            onError={onVideoError}
            // Whole and centred in any orientation: never enlarged or
            // shifted (that cut the top of some exercises in landscape).
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Image
            source={posterUrl ? { uri: posterUrl } : MEDIA_PLACEHOLDER}
            resizeMode={posterUrl ? 'contain' : 'cover'}
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
              accessibilityLabel={labels.speed(speed)}
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
              accessibilityLabel={labels.exitFullscreen}
              onPress={handleClose}
              style={styles.fullButton}
            >
              <Minimize2 size={20} color="#A5A5A5" strokeWidth={2} />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={paused ? labels.play : labels.pause}
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
  hero: {
    overflow: 'hidden',
    backgroundColor: '#F0EFEC',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  unavailable: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailablePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(18,18,18,.5)',
  },
  unavailableText: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  // Dark glass circles: legible over the light studio frames.
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    boxShadow: '0 4px 12px rgba(0,0,0,.18)',
  },
  controlClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    overflow: 'hidden',
  },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
