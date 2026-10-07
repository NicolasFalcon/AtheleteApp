import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Check, Dumbbell } from 'lucide-react-native';
import {
  BackButton,
  Button,
  GlassSurface,
  PersonAvatar,
  RetiredContent,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { isRoutineAttachment } from '@app/features/social/postModel';
import { firstName } from '@app/features/social/socialModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialRoutine'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const COVER = require('@app/assets/v2/photos/home/total.jpg');

// Rutina compartida (SOCIAL_04): vista previa de la rutina de un amigo. "Guardar
// rutina" la copia a tus Entrenos como "Tuya" (`save_shared_routine`); se puede
// modificar sin tocar la original. "Empezar" guarda la copia y empieza la sesión.
export function SocialRoutineScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const { postId } = route.params;
  const post = useSocialResource(s => s.getPost(postId), [postId]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const data = post.data;
  const routine = data && isRoutineAttachment(data.attachment) ? data.attachment : null;
  const author = data?.author;

  const back = () => safeGoBack(navigation, BACK_FALLBACKS);
  const save = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await service.saveSharedRoutine(postId);
      setSaved(true);
      toast.show('Rutina guardada en tus Entrenos');
    } catch {
      toast.show('No se pudo guardar la rutina', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  const toWorkouts = () => {
    const names = navigation.getState().routeNames;
    if (names.includes(ROOT_ROUTES.MainTabs)) {
      navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Workouts });
    } else {
      toast.show('Disponible al conectar con Entrenos');
    }
  };
  const start = async () => {
    // TODO(social-wire): save the copy (save_shared_routine) and open its
    // session with the returned `template_id`.
    await save();
    toast.show('La sesión empieza al conectar con Entrenos');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <SceneScope>
          <View style={styles.hero}>
            <Image source={COVER} resizeMode="cover" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(20,19,18,.4)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.85)']}
              locations={[0, 0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.back, { top: insets.top + 8 }]}>
              <BackButton variant="glass" onPress={back} />
            </View>
            {routine ? (
              <View style={styles.heroTexts}>
                <View style={styles.by}>
                  <PersonAvatar
                    name={author?.name ?? 'Amigo'}
                    avatarKey={author?.avatar_key}
                    profilePhotoUrl={author?.profile_photo_url}
                    relationship={data?.relationship ?? 'friends'}
                    size={24}
                  />
                  <TextV2 variant="meta" color="#D8D6D1">
                    {'Compartida por '}
                    <TextV2 variant="metaStrong" color="#FFFFFF">
                      {firstName(author?.name ?? 'un amigo')}
                    </TextV2>
                  </TextV2>
                </View>
                <TextV2 variant="title28" color="#FFFFFF">
                  {routine.title}
                </TextV2>
                <TextV2 variant="meta" color="#D8D6D1">
                  {`${routine.difficulty} · ${routine.duration_min} min · ${routine.exercises.length} ejercicios`}
                </TextV2>
              </View>
            ) : null}
          </View>
        </SceneScope>

        <View style={[styles.body, { backgroundColor: colors.bg, paddingHorizontal: layout.gutter }]}>
          {post.status === 'loading' ? (
            <SkeletonGroup>
              <Skeleton height={20} width="80%" />
              <Skeleton height={60} radius={16} />
              <Skeleton height={60} radius={16} />
            </SkeletonGroup>
          ) : null}
          {post.status === 'error' ? (
            <BlockError message="No pudimos cargar la rutina." onRetry={post.reload} />
          ) : null}
          {post.status === 'ready' && (!data || !routine) ? (
            <RetiredContent
              title="Rutina no disponible"
              body="Ya no se puede ver: su autor la eliminó o se retiró."
            />
          ) : null}
          {routine ? (
            <>
              {data?.body ? (
                <TextV2 variant="bodyL" tone="bodySoft" selectable={false}>
                  {`“${data.body}”`}
                </TextV2>
              ) : null}
              <View>
                {routine.exercises.map((exercise, index) => (
                  <View key={exercise.exercise_id} style={[styles.exercise, { borderBottomColor: colors.divider }]}>
                    <View style={[styles.thumb, { backgroundColor: colors.surface.muted }]}>
                      {/* TODO(social-wire): anatomy thumbnail by exercise_id. */}
                      <Dumbbell size={22} strokeWidth={1.6} color={colors.text.tertiary} />
                    </View>
                    <View style={styles.flex}>
                      <TextV2 variant="bodyStrong">{exercise.name}</TextV2>
                      <TextV2 variant="meta" tone="secondary">
                        {`${exercise.sets} × ${exercise.reps}`}
                      </TextV2>
                    </View>
                    <TextV2 variant="metaStrong" tone="tertiary">
                      {String(index + 1)}
                    </TextV2>
                  </View>
                ))}
              </View>
              <TextV2 variant="meta" tone="secondary">
                {`Al guardarla se copia a tus entrenos. Puedes modificarla sin cambiar la de ${firstName(author?.name ?? 'tu amigo')}.`}
              </TextV2>
            </>
          ) : null}
        </View>
      </ScrollView>

      {routine ? (
        <GlassSurface
          kind="nav"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: colors.divider }]}
        >
          {saved ? (
            <View style={styles.footerRow}>
              <Button
                label="Ver en Entrenos"
                variant="secondary"
                size="lg"
                icon={Check}
                onPress={toWorkouts}
                style={styles.flex}
              />
              <Button label="Empezar" size="lg" onPress={start} style={styles.flex} />
            </View>
          ) : (
            <Button label="Guardar rutina" size="lg" icon={Bookmark} loading={busy} onPress={save} />
          )}
        </GlassSurface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  hero: { height: 300, backgroundColor: '#141312', overflow: 'hidden' },
  back: { position: 'absolute', left: 16 },
  heroTexts: { position: 'absolute', left: 20, right: 20, bottom: 40, gap: 8 },
  by: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    gap: 22,
    minHeight: 300,
  },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1 },
  thumb: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 0.5 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
