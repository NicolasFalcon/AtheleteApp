import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Check, Flag, Trash2 } from 'lucide-react-native';
import {
  Button,
  PressableScale,
  Row,
  Sheet,
  TextV2,
  haptics,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  validateReport,
} from '@app/features/social/postModel';
import type { ReportReason } from '@app/features/social/postTypes';
import { useSocialService } from '@app/features/social/useSocial';

export type ContentTarget = {
  kind: 'post' | 'comment';
  id: string;
  mine: boolean;
};

type Step = 'menu' | 'report' | 'delete';

const COPY = {
  post: { noun: 'publicación', article: 'esta' },
  comment: { noun: 'comentario', article: 'este' },
} as const;

// "⋯" of a post or a comment: Reportar (anyone else's) or Eliminar (yours).
// Reporting has no screen in the handoff (D-88): a sheet with the six reasons
// of `content_reports`, an optional note and what happens next. App Store 1.2
// asks for reporting before showing other people's content.
export function ContentActions({
  target: liveTarget,
  onClose,
  onDone,
  withTabBar = false,
  initialStep = 'menu',
}: {
  target: ContentTarget | null;
  // Dev only: opens straight on a step.
  initialStep?: Step;
  onClose: () => void;
  // The content left the list: because the user reported or deleted it.
  onDone: (target: ContentTarget, action: 'reported' | 'deleted') => void;
  withTabBar?: boolean;
}) {
  const { colors } = useThemeV2();
  const toast = useToast();
  const service = useSocialService();
  const [step, setStep] = useState<Step>(initialStep);
  // The sheet keeps its content while it slides away.
  const lastTarget = useRef<ContentTarget | null>(liveTarget);
  if (liveTarget) {
    lastTarget.current = liveTarget;
  }
  const target = liveTarget ?? lastTarget.current;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  // Every time it opens it starts from the menu with an empty report.
  useEffect(() => {
    if (liveTarget) {
      setStep(initialStep);
      setReason(null);
      setDetails('');
      setBusy(false);
    }
  }, [liveTarget, initialStep]);

  if (!target) {
    return null;
  }
  const copy = COPY[target.kind];
  const check = validateReport({ reason, details });
  const show = (message: string, tone?: 'error') =>
    toast.show(message, { tone, withTabBar });

  const submitReport = async () => {
    if (!check.ok || busy) {
      return;
    }
    setBusy(true);
    try {
      await service.reportContent(target.kind, target.id, check.reason, check.details);
      onClose();
      onDone(target, 'reported');
      show('Gracias por avisar. Ya no verás este contenido.');
    } catch {
      show('No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      if (target.kind === 'post') {
        await service.deletePost(target.id);
      } else {
        await service.deleteComment(target.id);
      }
      onClose();
      onDone(target, 'deleted');
      show(`${target.kind === 'post' ? 'Publicación' : 'Comentario'} eliminado`);
    } catch {
      show('No se pudo eliminar. Inténtalo de nuevo.', 'error');
      setBusy(false);
    }
  };

  // One sheet whose content changes with the step: two modals presenting and
  // dismissing at once make iOS drop the second one.
  const title =
    step === 'menu'
      ? `Opciones de la ${copy.noun}`
      : step === 'report'
      ? `Reportar ${copy.noun}`
      : `¿Eliminar ${copy.article} ${copy.noun}?`;

  return (
    <Sheet
      open={Boolean(liveTarget)}
      onClose={onClose}
      scrollable={step === 'report'}
      title={title}
      footer={
        step === 'report' ? (
          <Button
            label="Enviar reporte"
            loading={busy}
            loadingLabel="Enviando"
            disabled={!check.ok}
            onPress={submitReport}
            style={styles.flex}
          />
        ) : step === 'delete' ? (
          <Button
            label="Eliminar"
            loading={busy}
            loadingLabel="Eliminando"
            onPress={remove}
            style={styles.flex}
          />
        ) : undefined
      }
    >
      {step === 'menu' ? (
        <View>
          {target.mine ? (
            <Row
              leading={<Trash2 size={20} strokeWidth={1.8} color={colors.ember.deep} />}
              title={`Eliminar ${copy.noun}`}
              destructive
              onPress={() => setStep('delete')}
              divider={false}
            />
          ) : (
            <Row
              leading={<Flag size={20} strokeWidth={1.8} color={colors.text.primary} />}
              title={`Reportar ${copy.noun}`}
              subtitle="Se la enviamos al equipo de moderación"
              onPress={() => setStep('report')}
              divider={false}
            />
          )}
        </View>
      ) : null}

      {step === 'report' ? (
        <View style={styles.reportBody}>
          <TextV2 variant="body" tone="secondary">
            {`¿Qué pasa con ${copy.article} ${copy.noun}? Dejarás de verl${
              target.kind === 'post' ? 'a' : 'o'
            } y lo revisaremos. No se lo decimos a la otra persona.`}
          </TextV2>
          <View accessibilityRole="radiogroup">
            {REPORT_REASONS.map(option => {
              const selected = reason === option.key;
              return (
                <PressableScale
                  key={option.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    haptics.selection();
                    setReason(option.key);
                  }}
                  style={[styles.reason, { borderBottomColor: colors.divider }]}
                >
                  <TextV2 variant="body" style={styles.flex}>
                    {option.label}
                  </TextV2>
                  <View
                    style={[
                      styles.radio,
                      selected
                        ? { backgroundColor: colors.cta.primary }
                        : { borderWidth: 1.5, borderColor: colors.outline.strong },
                    ]}
                  >
                    {selected ? (
                      <Check size={13} strokeWidth={3} color={colors.cta.primaryText} />
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
          <View style={[styles.notes, { backgroundColor: colors.surface.muted }]}>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Cuéntanos más (opcional)"
              placeholderTextColor={colors.text.tertiary}
              multiline
              maxLength={REPORT_DETAILS_MAX + 1}
              accessibilityLabel="Detalles del reporte"
              selectionColor={colors.text.primary}
              style={[styles.notesInput, { color: colors.text.primary }]}
            />
          </View>
          {!check.ok && check.error === 'details_too_long' ? (
            <TextV2 variant="meta" color={colors.ember.deep}>
              {`Máximo ${REPORT_DETAILS_MAX} caracteres.`}
            </TextV2>
          ) : null}
        </View>
      ) : null}

      {step === 'delete' ? (
        <TextV2 variant="body" tone="secondary">
          {target.kind === 'post'
            ? 'Desaparece para todos, con sus comentarios y me gusta. No se puede deshacer.'
            : 'Desaparece para todos. No se puede deshacer.'}
        </TextV2>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  reportBody: { gap: 16 },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, minHeight: 84 },
  notesInput: { fontSize: 15, padding: 0, minHeight: 64, textAlignVertical: 'top' },
});
