import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { PersonAvatar } from '@app/components/v2/PersonAvatar';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { progressPct, type RankedEntry } from '@app/features/social/challengeModel';
import { firstName } from '@app/features/social/socialModel';

// Private ranking between friends (SOCIAL_09 / SOCIAL_08): position, avatar,
// name, figure and a bar; your row in Ember. Ties share a position. Inside a
// scene (official challenge) it becomes a compact list without bars.
export function RankBars({
  entries,
  goal,
  variant = 'bars',
}: {
  entries: RankedEntry[];
  goal: number;
  variant?: 'bars' | 'list';
}) {
  const { colors, scene, mode } = useThemeV2();
  const onScene = mode === 'scene';

  return (
    <View style={variant === 'bars' ? styles.bars : styles.list}>
      {entries.map(entry => {
        const name = entry.isMe ? 'Tú' : firstName(entry.profile?.name ?? 'Amigo');
        const ring = entry.isMe ? { boxShadow: `0 0 0 2px ${onScene ? scene.plate : colors.bg}, 0 0 0 3.5px ${colors.ember.base}` } : null;

        if (variant === 'list') {
          return (
            <View
              key={entry.user_id}
              style={[styles.listRow, { borderTopColor: colors.border.onDark }]}
            >
              <TextV2 variant="captionStrong" tone="tertiary" style={styles.pos}>
                {String(entry.position)}
              </TextV2>
              <PersonAvatar
                name={name}
                avatarKey={entry.profile?.avatar_key}
                profilePhotoUrl={entry.profile?.profile_photo_url}
                relationship={entry.relationship}
                size={34}
                style={ring}
              />
              <TextV2 variant={entry.isMe ? 'bodyStrong' : 'body'} style={styles.flex}>
                {name}
              </TextV2>
              <TextV2
                variant="bodyStrong"
                color={entry.isMe ? colors.ember.textOnDark : undefined}
              >
                {String(entry.progress)}
              </TextV2>
            </View>
          );
        }

        return (
          <View key={entry.user_id} style={styles.barRow}>
            <TextV2 variant="captionStrong" tone="tertiary" style={styles.pos}>
              {String(entry.position)}
            </TextV2>
            <PersonAvatar
              name={name}
              avatarKey={entry.profile?.avatar_key}
              profilePhotoUrl={entry.profile?.profile_photo_url}
              relationship={entry.relationship}
              size={44}
              style={ring}
            />
            <View style={styles.flex}>
              <View style={styles.barHead}>
                <TextV2 variant={entry.isMe ? 'bodyStrong' : 'body'}>{name}</TextV2>
                <TextV2 variant="bodyStrong">
                  {String(entry.progress)}
                  <TextV2 variant="body" tone="tertiary">{` / ${goal}`}</TextV2>
                </TextV2>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surface.muted }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${progressPct(entry.progress, goal)}%`,
                      backgroundColor: entry.isMe ? colors.ember.base : colors.cta.primary,
                    },
                  ]}
                />
              </View>
            </View>
            {entry.done ? (
              <View style={[styles.done, { backgroundColor: colors.ember.base }]}>
                <Check size={12} strokeWidth={3} color={colors.ember.onText} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bars: { gap: 18 },
  list: { gap: 0 },
  pos: { width: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  done: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
});
