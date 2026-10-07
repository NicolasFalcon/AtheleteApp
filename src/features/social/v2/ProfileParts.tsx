import { StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import {
  Eyebrow,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type {
  SocialRecord,
  SocialRecentPost,
} from '@app/features/social/socialTypes';

// "RÉCORDS PERSONALES": name, NUEVO tag and the figure on the right.
export function RecordsList({ records }: { records: SocialRecord[] }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.block}>
      <Eyebrow style={styles.eyebrow}>Récords personales</Eyebrow>
      {records.map(record => (
        <View
          key={record.exercise_name}
          style={[styles.recordRow, { borderTopColor: colors.divider }]}
        >
          <View style={styles.recordName}>
            <TextV2 variant="body">{record.exercise_name}</TextV2>
            {record.is_new ? (
              <View
                style={[styles.newTag, { backgroundColor: colors.ember.base }]}
              >
                <TextV2 variant="eyebrow" color={colors.ember.onText}>
                  Nuevo
                </TextV2>
              </View>
            ) : null}
          </View>
          <View style={styles.recordValue}>
            <TextV2 variant="section">
              {String(record.value)}
            </TextV2>
            <TextV2 variant="meta" tone="secondary">
              {record.reps ? ` ${record.unit} × ${record.reps}` : ` ${record.unit}`}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

const OVER: Record<SocialRecentPost['type'], string> = {
  workout: 'ENTRENAMIENTO',
  record: 'NUEVO RÉCORD',
  routine: 'RUTINA',
  achievement: 'LOGRO',
  challenge: 'RETO',
  photo: 'FOTO',
};

// "ACTIVIDAD RECIENTE": two dark tiles. The post detail is tanda A.
export function RecentActivity({
  posts,
  onOpen,
}: {
  posts: SocialRecentPost[];
  onOpen: (post: SocialRecentPost) => void;
}) {
  const { scene, colors, mode } = useThemeV2();

  return (
    <View style={styles.activity}>
      <Eyebrow>Actividad reciente</Eyebrow>
      <View style={styles.tiles}>
        {posts.slice(0, 2).map(post => (
          <PressableScale
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={`${OVER[post.type]}. ${post.title}`}
            onPress={() => onOpen(post)}
            style={[
              styles.tile,
              { backgroundColor: scene.plate },
              // The plate is almost the Dark background: a hairline separates it.
              mode === 'dark'
                ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }
                : null,
            ]}
          >
            <TextV2
              variant="eyebrow"
              color={
                post.type === 'workout'
                  ? scene.onDark.secondary
                  : colors.ember.textOnDark
              }
            >
              {OVER[post.type]}
            </TextV2>
            <TextV2 variant="cta" color={scene.onDark.primary} numberOfLines={2}>
              {post.title}
            </TextV2>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

export function PrivacyLine({ text }: { text: string }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.privacy}>
      <Lock size={15} color={colors.text.tertiary} strokeWidth={1.8} />
      <TextV2 variant="meta" tone="secondary" style={styles.privacyText}>
        {text}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  activity: { gap: 12 },
  block: { gap: 0 },
  eyebrow: { paddingBottom: 4 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  recordName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  recordValue: { flexDirection: 'row', alignItems: 'baseline' },
  newTag: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    height: 150,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'flex-end',
    gap: 2,
  },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyText: { flex: 1 },
});
