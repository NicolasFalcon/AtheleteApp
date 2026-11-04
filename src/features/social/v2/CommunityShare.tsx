import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Segmented, Sheet, TextV2, useToast } from '@app/components/v2';
import { LEGAL_IS_PLACEHOLDER, TERMS_URL } from '@app/constants/legal';
import type { PostVisibility } from '@app/features/social/postTypes';
import { useSocialService } from '@app/features/social/useSocial';

// Comunidad abierta · what every way of publishing shares: the Pública /
// Solo amigos selector and the community guidelines, asked before the first
// public post (accept_community_guidelines). Without accepting, only friends.

export const VISIBILITY_OPTIONS: { key: PostVisibility; label: string }[] = [
  { key: 'public', label: 'Pública' },
  { key: 'friends', label: 'Solo amigos' },
];

export function visibilityHint(visibility: PostVisibility): string {
  return visibility === 'public'
    ? 'La verá cualquier atleta en Comunidad.'
    : 'Solo la verán tus amigos.';
}

export function VisibilityPicker({
  value,
  onChange,
}: {
  value: PostVisibility;
  onChange: (value: PostVisibility) => void;
}) {
  return (
    <View style={styles.picker}>
      <Segmented options={VISIBILITY_OPTIONS} value={value} onChange={onChange} size="compact" />
      <TextV2 variant="caption" tone="secondary">
        {visibilityHint(value)}
      </TextV2>
    </View>
  );
}

// The text of the guidelines (with the link to the Terms).
export function CommunityGuidelinesBody() {
  const toast = useToast();
  const openTerms = () => {
    if (LEGAL_IS_PLACEHOLDER) {
      // TODO(testflight): BT-43 · real Terms page.
      toast.show('Los Términos estarán disponibles antes de TestFlight');
      return;
    }
    Linking.openURL(TERMS_URL).catch(() => {});
  };
  return (
    <View style={styles.body}>
      <TextV2 variant="body" tone="secondary">
        Lo que publiques en público lo puede ver cualquier atleta de Athelete en
        Comunidad.
      </TextV2>
      <TextV2 variant="body" tone="secondary">
        Respeta a los demás: nada de acoso, odio, desnudos, violencia ni spam.
        Comparte solo lo que sea tuyo.
      </TextV2>
      <TextV2 variant="body" tone="secondary">
        Cuida tu privacidad: en tus rutas públicas ocultamos el inicio y el final.
        Si prefieres que tus publicaciones no salgan en Comunidad, activa Cuenta
        privada en Ajustes.
      </TextV2>
      <TextV2 variant="body" tone="secondary">
        Cualquiera puede reportar o bloquear. Revisamos los reportes y retiramos
        lo que incumple las normas.
      </TextV2>
      <TextV2 variant="body" tone="secondary">
        {'Al aceptar, aceptas también los '}
        <TextV2 variant="bodyStrong" accessibilityRole="link" onPress={openTerms}>
          Términos de uso
        </TextV2>
        {'. Sin aceptar puedes publicar solo para amigos.'}
      </TextV2>
    </View>
  );
}

// "Acepto" saves the guidelines (server) and the Terms (they say the same).
export function useAcceptGuidelines() {
  const service = useSocialService();
  return async () => {
    await service.acceptCommunityGuidelines();
    await service.acceptTerms();
  };
}

// The guidelines sheet on its own (the composer).
export function CommunityGuidelinesSheet({
  open,
  onClose,
  onAccepted,
  onFriendsOnly,
}: {
  open: boolean;
  onClose: () => void;
  // Accepted: publish in public.
  onAccepted: () => void;
  // Not accepted: publish to friends.
  onFriendsOnly: () => void;
}) {
  const toast = useToast();
  const accept = useAcceptGuidelines();
  const [busy, setBusy] = useState(false);

  const onAccept = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await accept();
      onAccepted();
    } catch {
      toast.show('No se pudo guardar. Inténtalo de nuevo.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Normas de la comunidad"
      footer={
        <View style={styles.buttons}>
          <Button label="Acepto" loading={busy} loadingLabel="Guardando" onPress={onAccept} />
          <Button
            label="Publicar solo para amigos"
            variant="secondary"
            disabled={busy}
            onPress={onFriendsOnly}
          />
        </View>
      }
    >
      <CommunityGuidelinesBody />
    </Sheet>
  );
}

// "Compartir en Comunidad" of a ready-made post (a route): the selector, then
// the guidelines when it goes public for the first time. One sheet whose
// content changes with the step (two modals at once make iOS drop one).
// `onPublish` answers 'guidelines_required' when the server still asks for
// them; anything else is handled by the caller.
export function CommunityShareSheet({
  open,
  title = 'Compartir en Comunidad',
  busy,
  onClose,
  onPublish,
}: {
  open: boolean;
  title?: string;
  busy: boolean;
  onClose: () => void;
  onPublish: (visibility: PostVisibility) => Promise<'guidelines_required' | void>;
}) {
  const toast = useToast();
  const service = useSocialService();
  const accept = useAcceptGuidelines();
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [step, setStep] = useState<'pick' | 'guidelines'>('pick');
  const [working, setWorking] = useState(false);

  // Every time it opens: Pública and the selector.
  useEffect(() => {
    if (open) {
      setVisibility('public');
      setStep('pick');
      setWorking(false);
    }
  }, [open]);

  const publish = async (audience: PostVisibility) => {
    const outcome = await onPublish(audience);
    if (outcome === 'guidelines_required') {
      setStep('guidelines');
    }
  };

  const onPrimary = async () => {
    if (working || busy) {
      return;
    }
    setWorking(true);
    try {
      if (visibility === 'public') {
        const accepted = await service.getCommunityGuidelinesAccepted().catch(() => false);
        if (!accepted) {
          setStep('guidelines');
          return;
        }
      }
      await publish(visibility);
    } finally {
      setWorking(false);
    }
  };

  const onAccept = async () => {
    if (working || busy) {
      return;
    }
    setWorking(true);
    try {
      await accept();
      await publish('public');
    } catch {
      toast.show('No se pudo guardar. Inténtalo de nuevo.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  };

  const onFriendsOnly = async () => {
    if (working || busy) {
      return;
    }
    setVisibility('friends');
    setStep('pick');
    setWorking(true);
    try {
      await publish('friends');
    } finally {
      setWorking(false);
    }
  };

  const loading = working || busy;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === 'guidelines' ? 'Normas de la comunidad' : title}
      footer={
        step === 'guidelines' ? (
          <View style={styles.buttons}>
            <Button label="Acepto" loading={loading} loadingLabel="Publicando" onPress={onAccept} />
            <Button
              label="Publicar solo para amigos"
              variant="secondary"
              disabled={loading}
              onPress={onFriendsOnly}
            />
          </View>
        ) : (
          <Button
            label="Publicar"
            loading={loading}
            loadingLabel="Publicando"
            onPress={onPrimary}
            style={styles.flex}
          />
        )
      }
    >
      {step === 'guidelines' ? (
        <CommunityGuidelinesBody />
      ) : (
        <VisibilityPicker value={visibility} onChange={setVisibility} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  picker: { gap: 8 },
  body: { gap: 12 },
  buttons: { flex: 1, gap: 10 },
});
