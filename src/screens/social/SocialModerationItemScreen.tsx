import { useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  RetiredContent,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { ROOT_ROUTES } from '@app/constants/routes';
import {
  ACTION_DONE,
  ACTION_LABEL,
  MODERATION_ERROR_COPY,
  ModerationError,
  NOTE_MAX,
  REASON_LABEL,
  TARGET_LABEL,
  actionLabel,
  allowedActions,
  parseModerationTarget,
  queueState,
  validateNote,
  type ModerationAction,
} from '@app/features/social/moderationModel';
import { timeAgo } from '@app/features/social/postModel';
import { usePostPhotoSource, useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialModerationItem'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Un reporte de la cola: el contenido reportado (siempre como texto plano), los
// motivos y las acciones que `moderate_content` permite según el tipo: restaurar
// o retirar un post / comentario, descartar los reportes de un usuario. Cada
// acción queda en el historial.
export function SocialModerationItemScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const { targetId } = route.params;
  const role = useSocialResource('getModeratorRole', s => s.getModeratorRole());
  const queue = useSocialResource(
    'getModerationQueue',
    s => (role.data ? s.getModerationQueue() : Promise.resolve([])),
    [role.data],
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ModerationAction | null>(null);
  // not_moderator from the server: the access was lost while the screen was open.
  const [denied, setDenied] = useState(false);
  const item = (queue.data ?? []).find(row => row.target_id === targetId) ?? null;
  const actions = item ? allowedActions(item, role.data ?? null) : [];
  const noteCheck = validateNote(note);
  const photo = usePostPhotoSource(item?.photo_path ?? null);

  const apply = async (action: ModerationAction) => {
    if (!item || !noteCheck.ok || busy) {
      return;
    }
    setBusy(action);
    try {
      await service.moderateContent(
        parseModerationTarget(item.target_type),
        targetId,
        action,
        noteCheck.note,
      );
      toast.show(ACTION_DONE[action]);
      safeGoBack(navigation, BACK_FALLBACKS);
    } catch (error) {
      const kind = error instanceof ModerationError ? error.kind : 'unknown';
      if (kind === 'not_moderator') {
        setDenied(true);
      } else {
        toast.show(MODERATION_ERROR_COPY[kind], { tone: 'error' });
      }
      setBusy(null);
    }
  };

  const reasons = new Map<string, number>();
  (item?.reasons ?? []).forEach(reason => reasons.set(reason, (reasons.get(reason) ?? 0) + 1));

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Reporte"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 14, paddingBottom: insets.bottom + 40, gap: 24 }}
      >
        {role.status === 'loading' || queue.status === 'loading' ? (
          <SkeletonGroup>
            <Skeleton height={120} radius={16} />
            <Skeleton height={60} radius={12} />
          </SkeletonGroup>
        ) : null}
        {queue.status === 'error' ? (
          <BlockError message="No pudimos cargar el reporte." onRetry={queue.reload} />
        ) : null}
        {denied || (role.status === 'ready' && !role.data) ? (
          <RetiredContent title="No tienes acceso" body="Este espacio es solo para el equipo de moderación." />
        ) : null}
        {role.data && queue.status === 'ready' && !item ? (
          <RetiredContent title="Reporte resuelto" body="Ya no está en la cola: otra persona lo resolvió." />
        ) : null}

        {item && !denied ? (
          <>
            <View style={[styles.content, { backgroundColor: colors.surface.raised, borderColor: colors.divider }]}>
              <View style={styles.contentTop}>
                <TextV2 variant="eyebrow" tone="secondary">
                  {TARGET_LABEL[parseModerationTarget(item.target_type)]}
                </TextV2>
                <TextV2 variant="caption" tone="tertiary">
                  {queueState(item) === 'hidden' ? 'Oculto para todos' : 'Visible'}
                </TextV2>
              </View>
              {item.body ? (
                <TextV2 variant="bodyL" selectable={false}>
                  {item.body}
                </TextV2>
              ) : (
                <TextV2 variant="body" tone="secondary">
                  Reporte sobre una persona, sin contenido asociado.
                </TextV2>
              )}
              {item.photo_path ? (
                <View style={[styles.photo, { backgroundColor: colors.surface.muted }]}>
                  {photo ? (
                    <Image
                      source={photo}
                      resizeMode="cover"
                      accessibilityLabel="Foto reportada"
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <TextV2 variant="meta" tone="secondary">
                      Foto reportada
                    </TextV2>
                  )}
                </View>
              ) : null}
              <TextV2 variant="meta" tone="secondary">
                {`@${item.author_username} · ${item.author_prior_removals ?? 0} retiradas anteriores`}
              </TextV2>
            </View>

            <View>
              <Eyebrow style={styles.title}>Reportes</Eyebrow>
              <TextV2 variant="body">
                {`${item.open_reports} ${item.open_reports === 1 ? 'reporte abierto' : 'reportes abiertos'}${item.first_reported_at ? ` · el primero ${timeAgo(item.first_reported_at)}` : ''}`}
              </TextV2>
              <View style={styles.chips}>
                {Array.from(reasons.entries()).map(([reason, count]) => (
                  <View key={reason} style={[styles.chip, { backgroundColor: colors.surface.muted }]}>
                    <TextV2 variant="metaStrong">{`${REASON_LABEL[reason] ?? reason}${count > 1 ? ` ×${count}` : ''}`}</TextV2>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.noteBox}>
              <Eyebrow>Nota interna (opcional)</Eyebrow>
              <View style={[styles.note, { backgroundColor: colors.surface.muted }]}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Motivo de la decisión"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  maxLength={NOTE_MAX + 1}
                  accessibilityLabel="Nota interna"
                  selectionColor={colors.text.primary}
                  style={[styles.noteInput, { color: colors.text.primary }]}
                />
              </View>
              {!noteCheck.ok ? (
                <TextV2 variant="meta" color={colors.ember.deep}>
                  {`Máximo ${NOTE_MAX} caracteres.`}
                </TextV2>
              ) : null}
            </View>

            <View style={styles.actions}>
              {actions.includes('restore') ? (
                <Button
                  label={actionLabel('restore', item)}
                  fullWidth
                  variant="secondary"
                  loading={busy === 'restore'}
                  disabled={!noteCheck.ok || busy !== null}
                  onPress={() => apply('restore')}
                />
              ) : null}
              {actions.includes('remove') ? (
                <Button
                  label={ACTION_LABEL.remove}
                  fullWidth
                  loading={busy === 'remove'}
                  disabled={!noteCheck.ok || busy !== null}
                  onPress={() => apply('remove')}
                />
              ) : null}
              {actions.includes('dismiss') ? (
                <Button
                  label={ACTION_LABEL.dismiss}
                  fullWidth
                  variant="outline"
                  loading={busy === 'dismiss'}
                  disabled={!noteCheck.ok || busy !== null}
                  onPress={() => apply('dismiss')}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { paddingBottom: 6 },
  content: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 12 },
  contentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photo: { height: 200, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center' },
  noteBox: { gap: 8 },
  note: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, minHeight: 84 },
  noteInput: { fontSize: 15, padding: 0, minHeight: 64, textAlignVertical: 'top' },
  actions: { gap: 10 },
});
