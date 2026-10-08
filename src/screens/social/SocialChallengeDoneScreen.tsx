import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { ChevronsUp } from 'lucide-react-native';
import {
  Button,
  Skeleton,
  StatusBarV2,
  TextV2,
  haptics,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { metricInfo } from '@app/features/social/challengeModel';
import { firstName } from '@app/features/social/socialModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialChallengeDone'>;

// Ember hexagon with the icon in ink (SOCIAL_12), the same shape as HexMedal.
function EmberMedal({ color }: { color: string }) {
  return (
    <View style={styles.hex}>
      <Svg width={100} height={110} viewBox="0 0 100 110" style={StyleSheet.absoluteFill}>
        <Polygon points="50,0 95,27.5 95,82.5 50,110 5,82.5 5,27.5" fill={color} />
      </Svg>
      <ChevronsUp size={40} strokeWidth={2.4} color="#121212" />
    </View>
  );
}

function Burst({ delay, color, width }: { delay: number; color: string; width: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 0.5 + progress.value * 1.1 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.burst, { borderColor: color, borderWidth: width }, style]} />;
}

// Reto completado (SOCIAL_12): dark scene with Ember, the final figure, points
// and badge (only the official challenge gives them, Q1) and your position
// among friends. Compartir opens the composer with the challenge attached.
export function SocialChallengeDoneScreen({ navigation, route }: Props) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const service = useSocialService();
  const { challengeId } = route.params;
  const board = useSocialResource('getChallengeBoard', s => s.getChallengeBoard(challengeId), [challengeId]);
  const data = board.data;

  useEffect(() => {
    haptics.success();
    service.markChallengeCelebrated(challengeId).catch(() => {});
    // Once on entering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const challenge = data?.challenge;
  const others = (data?.board ?? []).filter(entry => !entry.isMe && entry.progress >= (challenge?.goal ?? 1));
  const position =
    data?.mine?.final_rank_among_friends === 1 || others.length === 0
      ? 'Primero de tus amigos en terminar'
      : `Terminaste junto a ${firstName(others[0].profile?.name ?? 'un amigo')}`;
  const unit = challenge ? (challenge.metric === 'exercise_reps' ? 'dominadas' : metricInfo(challenge.metric).unit) : '';

  return (
    <SceneScope>
      <View style={[styles.screen, { backgroundColor: '#141312' }]}>
        <StatusBarV2 style="light" />
        <View style={styles.burstBox}>
          <Burst delay={150} color={colors.ember.base} width={2} />
          <Burst delay={450} color="rgba(255,91,31,.6)" width={1} />
        </View>
        <Animated.View entering={ZoomIn.delay(100).duration(600)} style={styles.medalWrap}>
          <EmberMedal color={colors.ember.base} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(350).duration(400)}>
          <TextV2 variant="eyebrow" color="#A8A6A1" style={styles.over}>
            RETO COMPLETADO
          </TextV2>
        </Animated.View>
        {challenge ? (
          <>
            <Animated.View entering={FadeInUp.delay(450).duration(450)} style={styles.figure}>
              <TextV2 style={styles.big}>{`${challenge.goal} / ${challenge.goal}`}</TextV2>
              <TextV2 variant="bodyL" color="#A8A6A1">
                {unit}
              </TextV2>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(600).duration(450)} style={styles.info}>
              {challenge.points > 0 ? (
                <View style={styles.pill}>
                  <TextV2 variant="metaStrong" color="#FF8A5C">{`+${challenge.points} puntos`}</TextV2>
                  <TextV2 variant="metaStrong" color="#FFFFFF">
                    {challenge.badge_id ? ' · Badge Semana de tracción' : ''}
                  </TextV2>
                </View>
              ) : null}
              <TextV2 variant="body" color="#D8D6D1">
                {position}
              </TextV2>
            </Animated.View>
          </>
        ) : (
          <View style={styles.figure}>
            <Skeleton width={200} height={52} />
          </View>
        )}
        <Animated.View
          entering={FadeInUp.delay(800).duration(400)}
          style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        >
          <Button
            label="Compartir"
            onPress={() => navigation.replace(APP_ROUTES.SocialCompose, { attach: 'challenge', sourceId: challengeId })}
          />
          <Button
            label="Volver a Comunidad"
            variant="secondary"
            size="md"
            onPress={() => navigation.popToTop()}
          />
        </Animated.View>
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  burstBox: { position: 'absolute', top: 130, width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', width: 240, height: 240, borderRadius: 120 },
  medalWrap: { marginTop: 196 },
  hex: { width: 100, height: 110, alignItems: 'center', justifyContent: 'center' },
  over: { marginTop: 34, letterSpacing: 1.1 },
  figure: { marginTop: 12, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  big: { fontSize: 52, fontWeight: '600', letterSpacing: -1.5, lineHeight: 54, color: '#FFFFFF' },
  info: { marginTop: 26, alignItems: 'center', gap: 10 },
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: { position: 'absolute', left: 20, right: 20, bottom: 0, gap: 10 },
});
