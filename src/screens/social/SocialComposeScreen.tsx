import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, ImagePlus, Users, X } from 'lucide-react-native';
import {
  ATTACHMENT_ICONS,
  AttachmentPreview,
  Button,
  Eyebrow,
  PersonAvatar,
  PressableScale,
  Sheet,
  StatusBarV2,
  TextV2,
  haptics,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { LEGAL_IS_PLACEHOLDER, TERMS_URL } from '@app/constants/legal';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  createPostErrorCopy,
  POST_BODY_MAX,
  POST_ISSUES,
  validatePhoto,
  validatePost,
  type CreatePostErrorCopy,
  type PostIssue,
} from '@app/features/social/postModel';
import { pickPostPhoto } from '@app/features/social/postPhotoPicker';
import type {
  AttachmentKind,
  AttachmentSource,
  PostPhotoDraft,
} from '@app/features/social/postTypes';
import { usesFixtures } from '@app/services/social/socialSource';
import {
  usePostPhotoSource,
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialCompose'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

const CHIP_LABEL: Record<AttachmentKind, string> = {
  workout: 'Entrenamiento',
  routine: 'Rutina',
  record: 'Récord',
  achievement: 'Logro',
  challenge: 'Reto',
};

// Photos the dev screens cycle through (sample data only). The real app uses
// the image picker: resized to 1440 px, JPEG 0.8, without EXIF (pickPostPhoto).
const FIXTURE_PHOTOS: PostPhotoDraft[] = [
  { key: 'barra-mujer', mime: 'image/jpeg', sizeBytes: 640_000, width: 1200, height: 1500 },
  { key: 'hero-entreno', mime: 'image/jpeg', sizeBytes: 720_000, width: 1200, height: 1500 },
  { key: 'overhead', mime: 'image/jpeg', sizeBytes: 580_000, width: 1200, height: 1500 },
];
const BAD_PHOTO: PostPhotoDraft = {
  key: 'overhead',
  mime: 'image/heic',
  sizeBytes: 6_400_000,
  width: 1200,
  height: 1500,
};

const SHARE_TITLE: Record<AttachmentKind, string> = {
  workout: 'Compartir entreno',
  record: 'Compartir récord',
  routine: 'Compartir rutina',
  achievement: 'Compartir logro',
  challenge: 'Compartir reto',
};

function titleFor(attach: AttachmentKind | undefined, shared: boolean): string {
  return shared && attach ? SHARE_TITLE[attach] : 'Nueva publicación';
}

// Crear publicación (SOCIAL_02) y Compartir entreno / récord (SOCIAL_13):
// a short text, an optional photo and an Athelete attachment with figures the
// user cannot edit. Never only text. Before the first publication the Terms
// are accepted (BT-43, placeholder URL).
export function SocialComposeScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const { profile } = useAuth();
  const { attach, sourceId, devState } = route.params ?? {};
  const sources = useSocialResource(
    'getAttachmentSources',
    s => s.getAttachmentSources(attach && sourceId ? { kind: attach, sourceId } : undefined),
    [attach ?? null, sourceId ?? null],
  );
  const settings = useSocialResource('getSettings', s => s.getSettings());
  const shared = Boolean(attach);

  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<AttachmentKind | null>(attach ?? null);
  const [photo, setPhoto] = useState<PostPhotoDraft | null>(
    devState === 'badPhoto' ? BAD_PHOTO : devState === 'photo' ? FIXTURE_PHOTOS[0] : null,
  );
  const [issues, setIssues] = useState<PostIssue[]>(
    devState === 'badPhoto' ? ['photo_type', 'photo_size', 'photo_not_allowed'] : [],
  );
  const [termsOpen, setTermsOpen] = useState(devState === 'terms');
  const [publishing, setPublishing] = useState(false);
  // Where a publication with a photo is: the upload comes first.
  const [step, setStep] = useState<'uploading' | 'publishing'>('publishing');
  // What create_post refused, with its message (and a way to Privacidad social).
  const [failure, setFailure] = useState<CreatePostErrorCopy | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const fixturePhoto = usePostPhotoSource(photo && !photo.uri ? `fx://${photo.key}` : null);
  const photoSource = photo?.uri ? { uri: photo.uri } : fixturePhoto;

  // Opens with the first available attachment when none came preselected.
  useEffect(() => {
    if (attachment === null && !photo && !attach && sources.data) {
      const first = sources.data.find(item => !item.blockedByPrivacy);
      if (first) {
        setAttachment(first.kind);
      }
    }
    // Once, when the sources arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.data]);

  const selected: AttachmentSource | null =
    sources.data?.find(item => item.kind === attachment) ?? null;
  const audience = settings.data?.audience === 'public' ? 'Público' : 'Amigos';
  const AudienceIcon = audience === 'Público' ? Globe : Users;
  const remaining = POST_BODY_MAX - text.length;

  const pickPhoto = async () => {
    haptics.selection();
    setFailure(null);
    if (usesFixtures()) {
      // Dev screens: sample photos, nothing is read from the library.
      setPhoto(FIXTURE_PHOTOS[photoIndex % FIXTURE_PHOTOS.length]);
      setPhotoIndex(value => value + 1);
      setIssues(current => current.filter(item => !item.startsWith('photo')));
      return;
    }
    const picked = await pickPostPhoto();
    if (picked.status === 'cancelled') {
      return;
    }
    if (picked.status === 'error') {
      toast.show(picked.message, { tone: 'error' });
      return;
    }
    // Type and size are checked before anything is uploaded.
    const issue = validatePhoto(picked.photo);
    setPhoto(picked.photo);
    setIssues(issue ? [issue] : []);
  };

  const publish = async (termsAccepted: boolean) => {
    const result = validatePost({
      body: text,
      attachment,
      photo,
      termsAccepted,
    });
    if (!result.ok) {
      // Only the Terms missing: ask for them, then publish.
      if (result.issues.length === 1 && result.issues[0] === 'terms') {
        setIssues([]);
        setTermsOpen(true);
        return;
      }
      setIssues(result.issues.filter(item => item !== 'terms'));
      haptics.error();
      return;
    }
    setIssues([]);
    setFailure(null);
    setStep(photo ? 'uploading' : 'publishing');
    setPublishing(true);
    try {
      const outcome = await service.createPost({
        type: result.type,
        sourceId: selected?.sourceId,
        body: result.body,
        photo,
        onStep: setStep,
      });
      if (outcome.ok) {
        // Repeating the same source gives the same post: "ya lo compartiste".
        toast.show(outcome.created ? 'Publicado para tus amigos' : 'Ya lo habías compartido');
        navigation.replace(APP_ROUTES.SocialPost, { postId: outcome.postId });
        return;
      }
      haptics.error();
      setFailure(createPostErrorCopy(outcome.error));
    } catch {
      haptics.error();
      setFailure(createPostErrorCopy('unknown'));
    }
    setPublishing(false);
  };

  const onPublish = async () => {
    if (publishing) {
      return;
    }
    const accepted = await service.getTermsAccepted();
    publish(accepted);
  };

  const acceptTerms = async () => {
    await service.acceptTerms();
    setTermsOpen(false);
    publish(true);
  };

  const openTerms = () => {
    if (LEGAL_IS_PLACEHOLDER) {
      // TODO(testflight): BT-43 · real Terms page.
      toast.show('Los Términos estarán disponibles antes de TestFlight');
      return;
    }
    Linking.openURL(TERMS_URL).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <StatusBarV2 />
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, 16) }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          onPress={() => safeGoBack(navigation, BACK_FALLBACKS)}
          style={styles.cancel}
        >
          <TextV2 variant="bodyL">Cancelar</TextV2>
        </PressableScale>
        <TextV2 variant="cta" align="center" style={styles.barTitle}>
          {titleFor(attach, shared)}
        </TextV2>
        <View style={styles.publish}>
          <Button
            label="Publicar"
            size="sm"
            loading={publishing}
            disabled={publishing}
            loadingLabel={step === 'uploading' ? 'Subiendo foto' : 'Publicando'}
            onPress={onPublish}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 12,
          paddingBottom: insets.bottom + 32,
          gap: 18,
        }}
      >
        <View style={styles.authorRow}>
          <PersonAvatar
            name={profile?.name || 'Tú'}
            avatarKey={profile?.avatarKey}
            profilePhotoUrl={profile?.profilePhotoUrl}
            relationship="self"
            size={44}
          />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <TextV2 variant="bodyStrong">{profile?.name?.split(' ')[0] || 'Tú'}</TextV2>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Audiencia: ${audience}. Cambiar en Privacidad social`}
                onPress={() => navigation.navigate(APP_ROUTES.SocialPrivacy)}
                style={[styles.audience, { backgroundColor: colors.surface.muted }]}
              >
                <AudienceIcon size={12} strokeWidth={2} color={colors.text.primary} />
                <TextV2 variant="captionStrong">{audience}</TextV2>
              </PressableScale>
            </View>
            <TextInput
              value={text}
              onChangeText={value => {
                setText(value);
                setIssues(current => current.filter(item => item !== 'too_long'));
              }}
              placeholder={shared ? 'Añade una frase, si quieres' : '¿Qué quieres contar?'}
              placeholderTextColor={colors.text.tertiary}
              multiline
              autoFocus={devState === undefined && !shared}
              accessibilityLabel="Texto de la publicación"
              selectionColor={colors.text.primary}
              style={[styles.input, { color: colors.text.primary }]}
            />
            {remaining <= 40 ? (
              <TextV2
                variant="caption"
                color={remaining < 0 ? colors.ember.deep : colors.text.tertiary}
                align="right"
              >
                {String(remaining)}
              </TextV2>
            ) : null}
          </View>
        </View>

        {photo ? (
          <View style={[styles.photo, { backgroundColor: colors.surface.muted }]}>
            {photoSource ? (
              <Image source={photoSource} resizeMode="cover" style={StyleSheet.absoluteFill} />
            ) : null}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Quitar foto"
              onPress={() => {
                setPhoto(null);
                setFailure(null);
                setIssues(current => current.filter(item => !item.startsWith('photo')));
              }}
              style={styles.removePhoto}
            >
              <X size={15} strokeWidth={2.4} color="#FFFFFF" />
            </PressableScale>
          </View>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Añadir foto, opcional"
            onPress={pickPhoto}
            style={[styles.addPhoto, { borderColor: colors.outline.strong }]}
          >
            <ImagePlus size={20} strokeWidth={1.8} color={colors.text.secondary} />
            <TextV2 variant="bodyStrong" tone="bodySoft">
              Añadir foto · opcional
            </TextV2>
          </PressableScale>
        )}

        <View style={styles.attachments}>
          <View style={styles.attachHead}>
            <Eyebrow>Adjunto de Athelete</Eyebrow>
            <TextV2 variant="caption" tone="tertiary">
              Los datos se añaden solos
            </TextV2>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroll}
          >
            {(sources.data ?? []).map(source => {
              const on = attachment === source.kind;
              const Icon = ATTACHMENT_ICONS[source.kind];
              const blocked = Boolean(source.blockedByPrivacy);
              return (
                <PressableScale
                  key={source.kind}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: blocked }}
                  accessibilityLabel={`${CHIP_LABEL[source.kind]}${blocked ? ', desactivado en Privacidad social' : ''}`}
                  disabled={blocked}
                  onPress={() => {
                    haptics.selection();
                    setAttachment(on ? null : source.kind);
                    setIssues([]);
                  }}
                  style={[
                    styles.chip,
                    on
                      ? { backgroundColor: colors.cta.primary }
                      : { backgroundColor: colors.surface.raised, borderWidth: 1, borderColor: colors.outline.strong },
                    blocked ? styles.chipOff : null,
                  ]}
                >
                  <Icon
                    size={15}
                    strokeWidth={1.9}
                    color={on ? colors.cta.primaryText : colors.text.primary}
                  />
                  <TextV2
                    variant="body"
                    color={on ? colors.cta.primaryText : colors.text.primary}
                  >
                    {CHIP_LABEL[source.kind]}
                  </TextV2>
                </PressableScale>
              );
            })}
          </ScrollView>
          {selected ? <AttachmentPreview source={selected} /> : null}
          {!selected && sources.status === 'ready' ? (
            <TextV2 variant="meta" tone="secondary">
              {photo
                ? 'Se publicará solo la foto.'
                : 'Elige un adjunto o añade una foto: no se publica solo texto.'}
            </TextV2>
          ) : null}
        </View>

        {publishing ? (
          <View accessibilityLiveRegion="polite" style={styles.progress}>
            <ActivityIndicator color={colors.text.secondary} />
            <TextV2 variant="meta" tone="secondary">
              {step === 'uploading' ? 'Subiendo la foto…' : 'Publicando…'}
            </TextV2>
          </View>
        ) : null}

        {failure ? (
          <View accessibilityLiveRegion="polite" style={styles.issues}>
            <TextV2 variant="meta" color={colors.ember.deep}>
              {failure.message}
            </TextV2>
            {failure.goToPrivacy ? (
              <Button
                label="Ir a Privacidad social"
                variant="secondary"
                size="md"
                onPress={() => navigation.navigate(APP_ROUTES.SocialPrivacy)}
              />
            ) : null}
          </View>
        ) : null}

        {issues.length > 0 ? (
          <View accessibilityLiveRegion="polite" style={styles.issues}>
            {issues.map(issue => (
              <TextV2 key={issue} variant="meta" color={colors.ember.deep}>
                {POST_ISSUES[issue]}
              </TextV2>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Sheet
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Antes de tu primera publicación"
        footer={
          <Button label="Acepto y publico" onPress={acceptTerms} style={styles.flex} />
        }
      >
        <View style={styles.terms}>
          <TextV2 variant="body" tone="secondary">
            Tus amigos verán lo que publiques. Respeta a los demás: nada de
            contenido ofensivo, violento o que no sea tuyo. Puedes reportar y
            bloquear a cualquier persona, y revisamos los reportes.
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            {'Al publicar aceptas los '}
            <TextV2 variant="bodyStrong" accessibilityRole="link" onPress={openTerms}>
              Términos de uso
            </TextV2>
            {' y las normas de la comunidad.'}
          </TextV2>
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cancel: { width: 90, paddingVertical: 8 },
  barTitle: { flex: 1 },
  publish: { width: 90, alignItems: 'flex-end' },
  authorRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audience: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  input: {
    fontSize: 18,
    lineHeight: 26,
    minHeight: 76,
    padding: 0,
    paddingTop: 6,
    textAlignVertical: 'top',
  },
  photo: { height: 280, borderRadius: 26, overflow: 'hidden' },
  removePhoto: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20,19,18,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    height: 96,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  attachments: { gap: 10 },
  attachHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chipScroll: { marginHorizontal: -20 },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipOff: { opacity: 0.4 },
  issues: { gap: 4 },
  terms: { gap: 12 },
});
