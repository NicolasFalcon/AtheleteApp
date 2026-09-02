import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ImagePlus } from 'lucide-react-native';
import { AVATAR_OPTIONS } from '@app/assets/avatars';
import { FormMessage } from '@app/components/auth/FormMessage';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { openProfilePhotoLibrary } from '@app/lib/profilePhotoPicker';
import {safeGoBack} from '@app/navigation/safeGoBack';
import { uploadProfilePhoto } from '@app/services/supabase/profile-photo';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Avatar'>;

export function AvatarPickerScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, session, updateOnboardingDraft } = useAuth();
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(
    onboardingDraft.profilePhotoUrl ?? null,
  );
  const [photoError, setPhotoError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoUploadAttempt = useRef(0);
  const styles = createStyles(theme);
  const photoSelected = Boolean(
    onboardingDraft.profilePhotoUrl || photoPreviewUri,
  );

  const selectAvatar = (avatarKey: (typeof AVATAR_OPTIONS)[number]['key']) => {
    photoUploadAttempt.current += 1;
    setUploadingPhoto(false);
    setPhotoPreviewUri(null);
    setPhotoError('');
    updateOnboardingDraft({
      avatarKey,
      profilePhotoUrl: null,
    });
  };

  const selectProfilePhoto = async () => {
    if (!session) {
      setPhotoError('No hay una sesión activa para guardar la foto.');
      return;
    }

    setPhotoError('');
    let uploadAttempt: number | null = null;

    try {
      const result = await openProfilePhotoLibrary({
        assetRepresentationMode: 'compatible',
        includeBase64: true,
        maxHeight: 1024,
        maxWidth: 1024,
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        setPhotoError(
          result.errorCode === 'permission'
            ? 'Activa el acceso a Fotos en los ajustes del dispositivo.'
            : 'No pudimos abrir la galería. Inténtalo nuevamente.',
        );
        return;
      }

      const photo = result.assets?.[0];

      if (!photo?.uri || !photo.base64) {
        setPhotoError('No pudimos procesar la imagen seleccionada.');
        return;
      }

      setPhotoPreviewUri(photo.uri);
      setUploadingPhoto(true);
      uploadAttempt = ++photoUploadAttempt.current;

      const profilePhotoUrl = await uploadProfilePhoto(session.user.id, {
        base64: photo.base64,
        contentType: photo.type ?? 'image/jpeg',
        fileSize: photo.fileSize,
      });

      if (photoUploadAttempt.current !== uploadAttempt) {
        return;
      }

      setPhotoPreviewUri(profilePhotoUrl);
      updateOnboardingDraft({
        avatarKey: null,
        profilePhotoUrl,
      });
    } catch (error) {
      if (
        uploadAttempt !== null &&
        photoUploadAttempt.current !== uploadAttempt
      ) {
        return;
      }

      setPhotoPreviewUri(onboardingDraft.profilePhotoUrl ?? null);
      setPhotoError(
        error instanceof Error && error.message
          ? error.message
          : 'No pudimos abrir o guardar la foto. Inténtalo nuevamente.',
      );
    } finally {
      if (
        uploadAttempt !== null &&
        photoUploadAttempt.current === uploadAttempt
      ) {
        setUploadingPhoto(false);
      }
    }
  };

  return (
    <ProfileSetupLayout
      continueDisabled={
        uploadingPhoto ||
        (!onboardingDraft.avatarKey && !onboardingDraft.profilePhotoUrl)
      }
      onBack={() => safeGoBack(navigation, [ONBOARDING_ROUTES.Welcome])}
      onContinue={() => navigation.navigate(ONBOARDING_ROUTES.BirthDate)}
      step={0}
      subtitle="Elige una identidad visual para tu perfil."
      title="Selecciona tu avatar"
    >
      <View style={styles.grid}>
        {AVATAR_OPTIONS.map(avatar => {
          const selected =
            !photoSelected && onboardingDraft.avatarKey === avatar.key;
          return (
            <Pressable
              accessibilityLabel={`Seleccionar avatar ${avatar.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={avatar.key}
              onPress={() => selectAvatar(avatar.key)}
              style={({ pressed }) => [
                styles.option,
                selected ? styles.optionSelected : null,
                pressed ? styles.optionPressed : null,
              ]}
            >
              <ProfileAvatar
                avatarKey={avatar.key}
                borderRadius={theme.radii.md}
                selected={selected}
                size={88}
              />
              {selected ? (
                <View style={styles.check}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              ) : null}
              <Text
                numberOfLines={1}
                style={[styles.label, selected ? styles.labelSelected : null]}
              >
                {avatar.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityLabel="Elegir foto de perfil desde la galería"
        accessibilityRole="button"
        accessibilityState={{ selected: photoSelected, busy: uploadingPhoto }}
        disabled={uploadingPhoto}
        onPress={selectProfilePhoto}
        style={({ pressed }) => [
          styles.photoOption,
          photoSelected ? styles.photoOptionSelected : null,
          pressed ? styles.optionPressed : null,
        ]}
      >
        {photoPreviewUri ? (
          <ProfileAvatar
            avatarKey={null}
            borderRadius={theme.radii.md}
            profilePhotoUrl={photoPreviewUri}
            selected={photoSelected}
            size={64}
          />
        ) : (
          <View style={styles.photoIcon}>
            <ImagePlus color={theme.colors.textPrimary} size={24} />
          </View>
        )}
        <View style={styles.photoCopy}>
          <Text style={styles.photoOptionTitle}>
            {photoSelected ? 'Foto seleccionada' : 'Subir mi foto'}
          </Text>
          <Text style={styles.photoOptionText}>
            {uploadingPhoto
              ? 'Guardando tu foto…'
              : 'Elige una imagen desde la galería'}
          </Text>
        </View>
        {uploadingPhoto ? (
          <ActivityIndicator color={theme.colors.textPrimary} size="small" />
        ) : photoSelected ? (
          <View style={styles.inlineCheck}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
      {photoError ? <FormMessage message={photoError} tone="error" /> : null}
    </ProfileSetupLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    option: {
      width: 96,
      paddingTop: 4,
      paddingBottom: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    optionSelected: {
      borderColor: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    optionPressed: {
      opacity: 0.82,
    },
    check: {
      position: 'absolute',
      right: 1,
      top: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      borderWidth: 2,
      borderColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkText: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    labelSelected: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.weights.semibold,
    },
    photoOption: {
      marginTop: theme.spacing.xl,
      padding: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    photoOptionSelected: {
      borderColor: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    photoIcon: {
      width: 64,
      height: 64,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoCopy: {
      flex: 1,
      gap: 3,
    },
    photoOptionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    photoOptionText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    inlineCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
