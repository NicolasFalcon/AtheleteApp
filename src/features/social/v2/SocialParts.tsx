import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Image, Pressable } from 'react-native';
import { Share2, Users } from 'lucide-react-native';
import {
  Button,
  CoverImage,
  Eyebrow,
  TextV2,
  useThemeV2,
} from '@app/components/v2';

// Group header of the lists: 11 pt eyebrow and the count on the right
// ("SOLICITUDES RECIBIDAS · 2", SOCIAL_05).
export function GroupHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <View style={styles.groupHeader}>
      <Eyebrow>{title}</Eyebrow>
      <TextV2 variant="meta" tone="tertiary">
        {String(count)}
      </TextV2>
    </View>
  );
}

// Three faded portraits (STATE_04): decorative black and white photos of the
// package (not users: DA-119 still holds, nobody's real photo is shown).
const PORTRAITS = [
  require('@app/assets/v2/photos/home/athlete-1.jpg'),
  require('@app/assets/v2/photos/home/athlete-2.jpg'),
  require('@app/assets/v2/photos/home/athlete-3.jpg'),
];

function MutedPortraits() {
  const { colors } = useThemeV2();

  return (
    <View style={styles.portraits} accessibilityElementsHidden>
      {PORTRAITS.map((source, index) => (
        <Image
          key={index}
          source={source}
          accessibilityIgnoresInvertColors
          style={[
            styles.portrait,
            {
              marginLeft: index === 0 ? 0 : -16,
              borderColor: colors.bg,
              backgroundColor: colors.divider,
            },
          ]}
        />
      ))}
    </View>
  );
}

// "Mientras tanto · Reto oficial · 100 dominadas" (STATE_04): a dark card of
// 96 pt under the empty feed. Only with a real official challenge.
const MEANWHILE_COVER = require('@app/assets/v2/photos/home/reto-overhead.jpg');

function MeanwhileCard({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mientras tanto. Reto oficial, ${title}`}
      onPress={onPress}
      style={styles.meanwhile}
    >
      <CoverImage
        source={MEANWHILE_COVER}
        aspect={900 / 601}
        x={0.5}
        y={0.25}
        style={styles.meanwhilePhoto}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['#141312', '#141312', 'rgba(20,19,18,0)']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.meanwhileTexts}>
        <TextV2 style={styles.meanwhileEyebrow}>MIENTRAS TANTO</TextV2>
        <TextV2 style={styles.meanwhileTitle} numberOfLines={1}>
          {`Reto oficial · ${title}`}
        </TextV2>
      </View>
    </Pressable>
  );
}

export function NoFriendsState({
  title,
  body,
  onSearch,
  onInvite,
  meanwhile,
}: {
  title: string;
  body: string;
  onSearch: () => void;
  onInvite: () => void;
  // The real official challenge, when there is one.
  meanwhile?: { title: string; onPress: () => void } | null;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.empty}>
        <MutedPortraits />
        <View style={styles.emptyTexts}>
          <TextV2 variant="section" align="center">
            {title}
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            {body}
          </TextV2>
        </View>
        <View style={styles.emptyActions}>
          <Button
            label="Buscar amigos"
            size="md"
            onPress={onSearch}
            style={styles.centered}
          />
          <Button
            label="Invitar con un enlace"
            icon={Share2}
            iconPosition="start"
            variant="secondary"
            size="md"
            onPress={onInvite}
            style={styles.centered}
          />
        </View>
      </View>
      {meanwhile ? (
        <MeanwhileCard title={meanwhile.title} onPress={meanwhile.onPress} />
      ) : null}
    </View>
  );
}

// Placeholder of the segments that arrive in a later tanda.
export function SegmentPlaceholder({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.empty}>
      <View
        style={[styles.iconCircle, { backgroundColor: colors.surface.muted }]}
      >
        <Users size={28} color={colors.text.secondary} strokeWidth={2} />
      </View>
      <View style={styles.emptyTexts}>
        <TextV2 variant="section" align="center">
          {title}
        </TextV2>
        <TextV2 variant="body" tone="secondary" align="center">
          {body}
        </TextV2>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 8,
  },
  emptyWrap: { gap: 48 },
  centered: { alignSelf: 'center' },
  meanwhile: {
    height: 96,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#141312',
    justifyContent: 'center',
  },
  meanwhilePhoto: { left: '40%' },
  meanwhileTexts: { paddingLeft: 18, gap: 4 },
  meanwhileEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: '#A8A6A1',
  },
  meanwhileTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingRight: 24,
  },
  empty: {
    alignItems: 'center',
    gap: 22,
    paddingTop: 56,
    paddingHorizontal: 12,
  },
  portraits: { flexDirection: 'row' },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    opacity: 0.55,
  },
  emptyTexts: { gap: 6, alignItems: 'center' },
  emptyActions: { gap: 10, alignItems: 'center' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
