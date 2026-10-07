import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ShieldCheck, ShieldOff } from 'lucide-react-native';
import {
  BackButton,
  GlassHeader,
  PressableScale,
  Segmented,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  ACTION_LABEL,
  REASON_LABEL,
  TARGET_LABEL,
  moderatorPermissions,
  queueState,
  sortQueue,
  type ModerationTarget,
} from '@app/features/social/moderationModel';
import { timeAgo } from '@app/features/social/postModel';
import { useSocialResource } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialModeration'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Moderación (D-97, sin diseño): solo para moderadores (`app_moderators`).
// La app pregunta `is_moderator()` antes de mostrar nada y las lecturas pasan
// por RLS: sin rol, ni siquiera se piden la cola ni el historial.
export function SocialModerationScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const role = useSocialResource('getModeratorRole', s => s.getModeratorRole());
  const permissions = moderatorPermissions(role.data ?? null);
  const [tab, setTab] = useState<'queue' | 'history'>(route.params?.devTab ?? 'queue');
  const queue = useSocialResource(
    'getModerationQueue',
    s => (permissions.canSeePanel ? s.getModerationQueue() : Promise.resolve([])),
    [permissions.canSeePanel],
  );
  const history = useSocialResource(
    'getModerationHistory',
    s => (permissions.canSeePanel ? s.getModerationHistory() : Promise.resolve([])),
    [permissions.canSeePanel],
  );
  const rows = sortQueue(queue.data ?? []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Moderación"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      {role.status === 'loading' ? (
        <View style={[styles.body, { paddingHorizontal: layout.gutter }]}>
          <SkeletonGroup>
            <Skeleton height={36} radius={18} />
            <Skeleton height={80} radius={16} />
            <Skeleton height={80} radius={16} />
          </SkeletonGroup>
        </View>
      ) : null}

      {role.status === 'error' ? (
        <View style={[styles.body, { paddingHorizontal: layout.gutter }]}>
          <BlockError message="No pudimos comprobar tu acceso." onRetry={role.reload} />
        </View>
      ) : null}

      {role.status === 'ready' && !permissions.canSeePanel ? (
        <View style={styles.denied}>
          <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}>
            <ShieldOff size={28} strokeWidth={1.9} color={colors.text.secondary} />
          </View>
          <TextV2 variant="section" align="center">
            No tienes acceso
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            Este espacio es solo para el equipo de moderación.
          </TextV2>
        </View>
      ) : null}

      {role.status === 'ready' && permissions.canSeePanel ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 18 }}
        >
          <Segmented
            options={[
              { key: 'queue', label: 'Cola', badge: rows.length || undefined },
              { key: 'history', label: 'Historial' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'queue' ? (
            <>
              {queue.status === 'loading' ? (
                <SkeletonGroup>
                  <Skeleton height={88} radius={16} />
                  <Skeleton height={88} radius={16} />
                </SkeletonGroup>
              ) : null}
              {queue.status === 'error' ? (
                <BlockError message="No pudimos cargar la cola." onRetry={queue.reload} />
              ) : null}
              {queue.status === 'ready' && rows.length === 0 ? (
                <View style={styles.empty}>
                  <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}>
                    <ShieldCheck size={28} strokeWidth={1.9} color={colors.text.secondary} />
                  </View>
                  <TextV2 variant="section" align="center">
                    La cola está vacía
                  </TextV2>
                  <TextV2 variant="body" tone="secondary" align="center">
                    No hay reportes pendientes. Cuando alguien reporte contenido aparecerá aquí.
                  </TextV2>
                </View>
              ) : null}
              {rows.map(item => {
                const state = queueState(item);
                const target = (item.target_type ?? 'post') as ModerationTarget;
                return (
                  <PressableScale
                    key={`${item.target_type}-${item.target_id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${TARGET_LABEL[target]} de ${item.author_username}. ${item.open_reports} reportes`}
                    onPress={() => navigation.navigate(APP_ROUTES.SocialModerationItem, { targetId: item.target_id ?? '' })}
                    style={[styles.card, { backgroundColor: colors.surface.raised, borderColor: colors.divider }]}
                  >
                    <View style={styles.cardTop}>
                      <TextV2 variant="eyebrow" tone="secondary">
                        {TARGET_LABEL[target]}
                      </TextV2>
                      {state === 'hidden' ? (
                        <View style={[styles.pill, { backgroundColor: colors.ember.base }]}>
                          <TextV2 variant="eyebrow" color={colors.ember.onText}>
                            Oculto
                          </TextV2>
                        </View>
                      ) : null}
                    </View>
                    {item.body ? (
                      <TextV2 variant="body" numberOfLines={2} selectable={false}>
                        {item.body}
                      </TextV2>
                    ) : (
                      <TextV2 variant="body" tone="secondary">
                        Reporte sobre el usuario
                      </TextV2>
                    )}
                    <View style={styles.cardBottom}>
                      <TextV2 variant="meta" tone="secondary" style={styles.flex} numberOfLines={1}>
                        {`@${item.author_username} · ${item.open_reports} ${item.open_reports === 1 ? 'reporte' : 'reportes'} · ${Array.from(new Set(item.reasons ?? [])).map(reason => REASON_LABEL[reason] ?? reason).join(', ')}`}
                      </TextV2>
                      <ChevronRight size={16} strokeWidth={2} color={colors.text.tertiary} />
                    </View>
                  </PressableScale>
                );
              })}
            </>
          ) : (
            <>
              {history.status === 'loading' ? (
                <SkeletonGroup>
                  <Skeleton height={56} radius={12} />
                  <Skeleton height={56} radius={12} />
                </SkeletonGroup>
              ) : null}
              {history.status === 'error' ? (
                <BlockError message="No pudimos cargar el historial." onRetry={history.reload} />
              ) : null}
              {history.status === 'ready' && (history.data ?? []).length === 0 ? (
                <TextV2 variant="body" tone="secondary" align="center">
                  Todavía no hay acciones registradas.
                </TextV2>
              ) : null}
              {(history.data ?? []).map(action => (
                <View key={action.id} style={[styles.historyRow, { borderTopColor: colors.divider }]}>
                  <View style={styles.flex}>
                    <TextV2 variant="bodyStrong">
                      {`${ACTION_LABEL[action.action as keyof typeof ACTION_LABEL] ?? action.action} · ${TARGET_LABEL[action.target_type as ModerationTarget] ?? action.target_type}`}
                    </TextV2>
                    {action.note ? (
                      <TextV2 variant="meta" tone="secondary" selectable={false}>
                        {action.note}
                      </TextV2>
                    ) : null}
                  </View>
                  <TextV2 variant="caption" tone="tertiary">
                    {timeAgo(action.created_at)}
                  </TextV2>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingTop: 14, gap: 14 },
  denied: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 32 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40, paddingHorizontal: 12 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { height: 20, paddingHorizontal: 7, borderRadius: 6, justifyContent: 'center' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderTopWidth: 1 },
});
