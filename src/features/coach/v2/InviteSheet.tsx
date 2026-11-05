import { useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Copy, Share2, ShieldCheck } from 'lucide-react-native';
import { Button, Skeleton, TextV2, useThemeV2, useToast } from '@app/components/v2';
import { Sheet } from '@app/components/v2/Sheet';
import { useCoachText } from '@app/features/coach/coachCopy';
import { coachErrorMessage } from '@app/features/coach/coachModel';
import { useCoachInvite, useCoachMutations } from '@app/features/coach/useCoach';
import { BlockError } from '@app/features/home/v2/BlockError';
import { antonStyle } from '@app/features/coach/v2/CoachParts';

// Invitar alumno (§30.3): the coach's code in Anton, "Válido 7 días · un solo
// uso", Copiar (→ "Copiado") and Compartir enlace. `regenerate`: "Invitar de
// nuevo" revokes the code and shows a new one.
//
// There is no clipboard module in the app (adding one needs a native build):
// "Copiar" opens the system share sheet with only the code, which has Copy,
// and the code itself is selectable.
export function InviteSheet({
  open,
  onClose,
  regenerate = false,
}: {
  open: boolean;
  onClose: () => void;
  regenerate?: boolean;
}) {
  const { colors, fonts } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, language } = useCoachText();
  const invite = useCoachInvite(open);
  const { regenerateInvite } = useCoachMutations();
  const [copied, setCopied] = useState(false);
  const regenerated = useRef(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      regenerated.current = false;
      setCopied(false);
      return;
    }
    if (regenerate && !regenerated.current) {
      regenerated.current = true;
      regenerateInvite.mutate();
    }
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, regenerate]);

  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const data = regenerate ? regenerateInvite.data ?? (regenerateInvite.isPending ? null : invite.data) : invite.data;
  const loading = regenerate ? regenerateInvite.isPending || (!data && invite.isLoading) : invite.isLoading;
  const error = regenerate ? regenerateInvite.error ?? (!data ? invite.error : null) : invite.error;

  const copy = async () => {
    if (!data) {
      return;
    }
    try {
      const result = await Share.share({ message: data.code });
      if (result.action === Share.sharedAction) {
        setCopied(true);
        if (copiedTimer.current) {
          clearTimeout(copiedTimer.current);
        }
        copiedTimer.current = setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Dismissed: nothing to do.
    }
  };

  const shareLink = async () => {
    if (!data) {
      return;
    }
    try {
      const result = await Share.share({
        message: t('coach.invite.message', { code: data.code, url: data.url }),
        url: data.url,
      });
      if (result.action === Share.sharedAction) {
        toast.show(t('coach.invite.ready'));
      }
    } catch {
      // Dismissed.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('coach.invite.title')}>
      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TextV2 variant="bodyL" tone="secondary">
          {t('coach.invite.body')}
        </TextV2>
        {error ? (
          <BlockError
            message={coachErrorMessage(error, language)}
            onRetry={() => {
              if (regenerate) {
                regenerateInvite.mutate();
              } else {
                invite.refetch().catch(() => undefined);
              }
            }}
          />
        ) : (
          <View style={[styles.codeBox, { backgroundColor: colors.surface.muted }]}>
            {loading || !data ? (
              <Skeleton width={200} height={56} radius={12} />
            ) : (
              <TextV2
                selectable
                accessibilityLabel={data.code.split('').join(' ')}
                color={colors.text.primary}
                style={[antonStyle(fonts.display, 56), styles.code]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {data.code}
              </TextV2>
            )}
            <TextV2 variant="meta" tone="secondary">
              {t('coach.invite.validity')}
            </TextV2>
          </View>
        )}
        <View style={styles.actions}>
          <Button
            label={copied ? t('coach.invite.copied') : t('coach.invite.copy')}
            icon={copied ? Check : Copy}
            variant="secondary"
            disabled={!data}
            onPress={() => {
              copy().catch(() => undefined);
            }}
            style={styles.copy}
          />
          <Button
            label={t('coach.invite.share')}
            icon={Share2}
            disabled={!data}
            onPress={() => {
              shareLink().catch(() => undefined);
            }}
            style={styles.share}
          />
        </View>
        <View style={styles.footer}>
          <ShieldCheck size={18} color={colors.text.secondary} strokeWidth={1.8} />
          <TextV2 variant="body" tone="secondary" style={styles.flex}>
            {t('coach.invite.footer')}
          </TextV2>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: 18, paddingTop: 4 },
  codeBox: { borderRadius: 22, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center', gap: 6 },
  code: { letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  copy: { flex: 2 },
  share: { flex: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
