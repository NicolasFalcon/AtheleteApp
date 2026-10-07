import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar } from 'lucide-react-native';
import {
  BackButton,
  FilterChip,
  FormRow,
  GlassHeader,
  PressableScale,
  StatusBarV2,
  StepperButtons,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { LEVELS } from '@app/features/onboarding/onboardingModel';
import { GENDER_OPTIONS } from '@app/features/profile/genderModel';
import { BirthDateSheet } from '@app/features/profile/v2/BirthDateSheet';
import {
  draftFromProfile,
  formatBirthDate,
  formatHeight,
  formatWeight,
  goalOptions,
  isDirty,
  isValid,
  MINUTES_RANGE,
  stepDays,
  stepHeight,
  stepMinutes,
  stepWeight,
  toPatch,
  validateDraft,
  type EditDraft,
} from '@app/features/profile/profileModel';
import { useAuth } from '@app/hooks/useAuth';
import { openProfilePhotoLibrary } from '@app/lib/profilePhotoPicker';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { ROOT_ROUTES } from '@app/constants/routes';
import { updateProfileDetails } from '@app/services/supabase/profile';
import { uploadProfilePhoto } from '@app/services/supabase/profile-photo';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'EditProfile'>;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Editar perfil (PROFILE_02): two groups on the background, the date written
// out, the units visible. Guardar is active only with changes and valid
// values; the writes respect the CHECKs of `profiles` (see profileModel).
export function EditProfileScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile: realProfile, refreshProfile } = useAuth();
  const dev = __DEV__ ? route.params?.devState : undefined;

  const profile = useMemo(() => {
    if (__DEV__ && (dev === 'data' || dev === 'saving' || dev === 'saved' || dev === 'error' || dev === 'invalid')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return (require('@app/dev/profileFixtures') as typeof import('@app/dev/profileFixtures')).FIXTURE_PROFILE;
    }
    if (__DEV__ && dev === 'new') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return (require('@app/dev/profileFixtures') as typeof import('@app/dev/profileFixtures')).FIXTURE_NEW_PROFILE;
    }
    return realProfile;
  }, [dev, realProfile]);

  const saved = useMemo(() => (profile ? draftFromProfile(profile) : null), [profile]);
  const [draft, setDraft] = useState<EditDraft | null>(saved);
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState(false);
  const loadedFor = useRef<string | null>(null);

  // The draft starts from the stored profile once (and when another loads).
  useEffect(() => {
    if (saved && profile && loadedFor.current !== profile.id + (dev ?? '')) {
      loadedFor.current = profile.id + (dev ?? '');
      setDraft(
        dev === 'invalid' ? { ...saved, minutes: 3, name: '' } : saved,
      );
      setTouched(dev === 'invalid');
      setState(dev === 'saving' ? 'saving' : dev === 'saved' ? 'saved' : 'idle');
      if (dev === 'error') {
        setState('error');
        setMessage('No pudimos guardar tus cambios. Revisa tu conexión e inténtalo de nuevo.');
      }
    }
  }, [dev, profile, saved]);

  if (!draft || !saved || !profile) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  const errors = validateDraft(draft);
  const dirty = isDirty(draft, saved) || dev === 'saved' || dev === 'saving' || dev === 'error';
  const canSave = dirty && isValid(errors) && state !== 'saving' && state !== 'saved';
  const set = (patch: Partial<EditDraft>) => {
    setDraft({ ...draft, ...patch });
    setTouched(true);
    if (state === 'error') {
      setState('idle');
      setMessage(null);
    }
  };

  const save = async () => {
    if (!canSave || dev) {
      return;
    }
    setState('saving');
    setMessage(null);
    try {
      await updateProfileDetails(profile.id, toPatch(draft, saved));
      await refreshProfile();
      await Promise.allSettled(
        ['profile', 'home', 'ellie', 'workouts', 'progress'].map(key =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      setState('saved');
      setTimeout(() => safeGoBack(navigation, BACK_FALLBACKS), 800);
    } catch (error) {
      console.warn('[profile] No se pudo guardar el perfil:', error);
      setState('error');
      setMessage('No pudimos guardar tus cambios. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const changePhoto = async () => {
    if (uploading || dev) {
      return;
    }
    try {
      const result = await openProfilePhotoLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
        maxWidth: 1080,
        maxHeight: 1080,
        quality: 0.8,
      });
      const asset = result.assets?.[0];
      if (result.didCancel || !asset?.base64 || !asset.type) {
        return;
      }
      setUploading(true);
      const path = await uploadProfilePhoto(profile.id, {
        base64: asset.base64,
        contentType: asset.type,
        fileSize: asset.fileSize,
      });
      await updateProfileDetails(profile.id, { profilePhotoUrl: path });
      await refreshProfile();
      toast.show('Foto actualizada');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'No pudimos cambiar la foto', { tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const label =
    state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado ✓' : 'Guardar';
  const active = canSave || state === 'saved' || state === 'saving';
  const show = (field: keyof EditDraft) => (touched ? errors[field] : undefined);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Editar perfil"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
        right={
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy: state === 'saving' }}
            disabled={!canSave}
            onPress={save}
            style={[
              styles.save,
              { backgroundColor: active ? colors.cta.primary : colors.surface.muted },
            ]}
          >
            <TextV2 variant="bodyStrong" color={active ? colors.cta.primaryText : colors.text.tertiary}>
              {label}
            </TextV2>
          </PressableScale>
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 40, gap: 28, paddingTop: 12 }}
        >
          <View style={styles.photo}>
            <ProfileAvatar avatarKey={profile.avatarKey} profilePhotoUrl={profile.profilePhotoUrl} size={72} />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de perfil"
              onPress={changePhoto}
              style={styles.photoLink}
            >
              <TextV2 variant="bodyStrong">{uploading ? 'Subiendo…' : 'Cambiar foto'}</TextV2>
            </PressableScale>
          </View>

          <View>
            <Eyebrow>Información personal</Eyebrow>
            <FormRow label="Nombre" error={show('name')}>
              <TextInput
                accessibilityLabel="Nombre"
                value={draft.name}
                onChangeText={name => set({ name })}
                maxLength={80}
                autoCapitalize="words"
                placeholder="Tu nombre"
                placeholderTextColor={colors.text.tertiary}
                style={[styles.input, { color: colors.text.primary }]}
              />
            </FormRow>
            <FormRow
              label="Fecha de nacimiento"
              error={show('birthDate')}
              onPress={() => setDateOpen(true)}
              trailing={<Calendar size={20} color={colors.text.secondary} strokeWidth={1.8} />}
            >
              <TextV2 variant="bodyL" style={styles.value}>
                {formatBirthDate(draft.birthDate)}
              </TextV2>
            </FormRow>
            <FormRow label="Sexo">
              <View style={styles.chips}>
                {GENDER_OPTIONS.map(option => (
                  <FilterChip
                    key={option.value}
                    size={40}
                    label={option.label}
                    selected={draft.gender === option.value}
                    onPress={() => set({ gender: option.value })}
                  />
                ))}
              </View>
            </FormRow>
            <FormRow
              label="Peso"
              error={show('weight')}
              trailing={
                <StepperButtons
                  label="peso"
                  onMinus={() => set({ weight: stepWeight(draft.weight, -1) })}
                  onPlus={() => set({ weight: stepWeight(draft.weight, 1) })}
                />
              }
            >
              <TextV2 variant="bodyL" style={styles.value}>{formatWeight(draft.weight)}</TextV2>
            </FormRow>
            <FormRow
              label="Altura"
              error={show('height')}
              trailing={
                <StepperButtons
                  label="altura"
                  onMinus={() => set({ height: stepHeight(draft.height, -1) })}
                  onPlus={() => set({ height: stepHeight(draft.height, 1) })}
                />
              }
            >
              <TextV2 variant="bodyL" style={styles.value}>{formatHeight(draft.height)}</TextV2>
            </FormRow>
          </View>

          <View style={styles.group}>
            <Eyebrow>Objetivo</Eyebrow>
            <View style={styles.chips}>
              {goalOptions(saved.goal).map(option => (
                <FilterChip
                  key={option.value}
                  size={40}
                  label={option.label}
                  selected={draft.goal === option.value}
                  onPress={() => set({ goal: option.value })}
                />
              ))}
            </View>
            {show('goal') ? <TextV2 variant="caption" color={colors.ember.deep}>{errors.goal}</TextV2> : null}
          </View>

          <View>
            <Eyebrow>Tu semana</Eyebrow>
            <FormRow label="Nivel" error={show('level')}>
              <View style={styles.chips}>
                {LEVELS.map(option => (
                  <FilterChip
                    key={option.value}
                    size={40}
                    label={option.label}
                    selected={draft.level === option.value}
                    onPress={() => set({ level: option.value })}
                  />
                ))}
              </View>
            </FormRow>
            <FormRow
              label="Días de entrenamiento"
              error={show('days')}
              trailing={
                <StepperButtons
                  label="días"
                  onMinus={() => set({ days: stepDays(draft.days, -1) })}
                  onPlus={() => set({ days: stepDays(draft.days, 1) })}
                />
              }
            >
              <TextV2 variant="bodyL" style={styles.value}>
                {draft.days} {draft.days === 1 ? 'día' : 'días'} por semana
              </TextV2>
            </FormRow>
            <FormRow
              label="Minutos por sesión"
              error={show('minutes')}
              trailing={
                <StepperButtons
                  label="minutos"
                  minusDisabled={draft.minutes <= MINUTES_RANGE.min}
                  plusDisabled={draft.minutes >= MINUTES_RANGE.max}
                  onMinus={() => set({ minutes: stepMinutes(draft.minutes, -1) })}
                  onPlus={() => set({ minutes: stepMinutes(draft.minutes, 1) })}
                />
              }
            >
              <TextV2 variant="bodyL" style={styles.value}>{draft.minutes} min</TextV2>
            </FormRow>
          </View>

          {message ? (
            <TextV2 variant="meta" color={colors.ember.deep} accessibilityLiveRegion="polite">
              {message}
            </TextV2>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <BirthDateSheet
        open={dateOpen}
        value={draft.birthDate}
        onClose={() => setDateOpen(false)}
        onPick={birthDate => set({ birthDate })}
      />
    </View>
  );
}

function Eyebrow({ children }: { children: string }) {
  const { colors } = useThemeV2();
  return (
    <TextV2 variant="eyebrow" color={colors.text.secondary} style={styles.eyebrow}>
      {children}
    </TextV2>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  save: { height: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  photo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoLink: { paddingVertical: 8 },
  eyebrow: { paddingBottom: 2 },
  group: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { fontSize: 20, paddingVertical: 2, paddingHorizontal: 0 },
  value: { fontWeight: '500' },
});
