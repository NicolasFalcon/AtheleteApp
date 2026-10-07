import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Droplets,
  Dumbbell,
  Heart,
  ListChecks,
  LogOut,
  Mail,
  KeyRound,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Users,
  Utensils,
} from 'lucide-react-native';
import {
  BackButton,
  Button,
  GlassHeader,
  Row,
  Segmented,
  Sheet,
  StatusBarV2,
  SwitchV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { useOpenCore33 } from '@app/features/core33/useOpenCore33';
import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { goalLabel, trainingLine } from '@app/features/profile/profileModel';
import { SettingsSection } from '@app/features/profile/v2/SettingsParts';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useProfilePreferences } from '@app/hooks/useProfilePreferences';
import { moderatorPermissions } from '@app/features/social/moderationModel';
import { useSocialResource } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import {
  mapDeleteAccountResponse,
  type DeleteAccountOutcome,
} from '@app/features/profile/deleteAccountModel';
import { clearLocalUserData } from '@app/lib/localUserData';
import {
  requestAccountDeletion,
  sendPasswordReset,
  signOutLocal,
} from '@app/services/supabase/auth';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Settings'>;
type Confirm = 'logout' | 'password' | 'delete1' | 'delete2' | null;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

const NOTIFICATIONS = [
  { key: 'workouts', icon: Bell, title: 'Recordatorios de entreno', subtitle: 'El día que te toca, a tu hora habitual' },
  { key: 'hydration', icon: Droplets, title: 'Hidratación', subtitle: 'Un aviso discreto si vas por detrás' },
  { key: 'updates', icon: Sparkles, title: 'Novedades de ELLIE', subtitle: 'Recomendaciones nuevas para ti' },
] as const;

// Ajustes (PROFILE_03): flat rows by section. Community and Apple Health
// depend on future modules: Comunidad rows open Amigos and Privacidad social and
// Apple Health opens its placeholder screen.
export function SettingsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  // The moderation row only exists for moderators (app_moderators); a normal
  // user never sees it and the screen checks the role again.
  const moderatorRole = useSocialResource('getModeratorRole', s => s.getModeratorRole());
  const isModerator = moderatorPermissions(moderatorRole.data ?? null).canSeePanel;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { preferredMode, setPreferredMode } = useAppTheme();
  const { profile: realProfile, signOut } = useAuth();
  const overview = useProfileOverview();
  const preferences = useProfilePreferences();
  const openEllieChat = useOpenEllieChat();
  const openCore33 = useOpenCore33();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  // Eliminar cuenta (BT-30): the result of the last attempt.
  const [deleting, setDeleting] = useState(false);
  const [deleteOutcome, setDeleteOutcome] = useState<DeleteAccountOutcome | null>(null);

  const profile = useMemo(() => {
    if (__DEV__ && dev) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fixtures = require('@app/dev/profileFixtures') as typeof import('@app/dev/profileFixtures');
      return dev === 'new' ? fixtures.FIXTURE_NEW_PROFILE : fixtures.FIXTURE_PROFILE;
    }
    return realProfile;
  }, [dev, realProfile]);

  const plan = overview.data?.nutritionPlan;
  const challenge = overview.data?.challenge;

  const run = async (action: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await action();
      if (ok) {
        toast.show(ok);
      }
      setConfirm(null);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'No pudimos completar la acción', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const closeThen = (next: Confirm) => {
    setConfirm(null);
    // iOS does not present a modal while another is dismissing.
    setTimeout(() => setConfirm(next), 350);
  };

  // Signs out even if the server no longer knows the user.
  const finishSession = async () => {
    try {
      await signOut();
    } catch {
      await signOutLocal();
    }
  };

  const deleteAccount = async () => {
    if (deleting || dev) {
      return;
    }
    setDeleting(true);
    setDeleteOutcome(null);
    const userId = profile?.id;
    try {
      const outcome = mapDeleteAccountResponse(await requestAccountDeletion());
      setDeleteOutcome(outcome);
      if (outcome.kind === 'deleted') {
        if (userId) {
          await clearLocalUserData(userId).catch(() => {});
        }
        await finishSession();
      } else if (outcome.kind === 'unauthorized') {
        await finishSession();
      }
    } catch (error) {
      console.warn('[account] No se pudo eliminar la cuenta:', error);
      setDeleteOutcome(mapDeleteAccountResponse({ status: null, body: null }));
    } finally {
      setDeleting(false);
    }
  };

  const icon = (Icon: typeof Target) => (
    <Icon size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.icon} />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Ajustes"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 40, gap: 28, paddingTop: 12 }}
      >
        <SettingsSection title="Mi plan">
          <Row
            leading={icon(Target)}
            title="Objetivo"
            value={profile?.goal ? goalLabel(profile.goal) : 'Sin objetivo'}
            trailing="chevron"
            onPress={() => navigation.navigate(APP_ROUTES.EditProfile)}
          />
          <Row
            leading={icon(Dumbbell)}
            title="Entrenamiento"
            value={trainingLine(profile?.trainingDaysPerWeek ?? null, profile?.preferredSessionMinutes ?? null)}
            trailing="chevron"
            onPress={() => navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Workouts })}
          />
          <Row
            leading={icon(Utensils)}
            title="Nutrición"
            value={plan ? `${plan.targetCalories} kcal/día` : 'Sin plan · Crear con ELLIE'}
            trailing="chevron"
            onPress={() =>
              plan ? navigation.navigate(APP_ROUTES.NutritionPlan) : openEllieChat(ELLIE_ASKS.nutritionPlan)
            }
          />
          <Row
            leading={icon(ListChecks)}
            title="Core 33"
            value={
              challenge
                ? challenge.status === 'completed'
                  ? 'Completado'
                  : `Día ${challenge.challengeDay} de 33`
                : 'Descubrir'
            }
            trailing="chevron"
            onPress={openCore33}
          />
        </SettingsSection>

        <SettingsSection title="Comunidad">
          <Row
            leading={icon(Users)}
            title="Amigos y retos"
            trailing="chevron"
            onPress={() =>
              navigation.navigate(ROOT_ROUTES.MainTabs, {
                screen: TAB_ROUTES.Community,
                params: { segment: 'amigos' },
              })
            }
          />
          {isModerator ? (
            <Row
              leading={icon(ShieldCheck)}
              title="Moderación"
              value="Cola de reportes"
              trailing="chevron"
              onPress={() => navigation.navigate(APP_ROUTES.SocialModeration)}
            />
          ) : null}
          <Row
            leading={icon(Shield)}
            title="Privacidad social"
            trailing="chevron"
            onPress={() => navigation.navigate(APP_ROUTES.SocialPrivacy)}
          />
        </SettingsSection>

        <SettingsSection title="Integraciones">
          <Row
            leading={icon(Heart)}
            title="Apple Health"
            value="Sin conectar"
            trailing="chevron"
            onPress={() => navigation.navigate(APP_ROUTES.HealthSettings)}
          />
        </SettingsSection>

        <SettingsSection title="Preferencias">
          <View style={[styles.appearance, { borderBottomColor: colors.divider }]}>
            <View style={styles.appearanceHead}>
              {icon(Sun)}
              <TextV2 variant="body">Apariencia</TextV2>
            </View>
            <Segmented
              options={[
                { key: 'light', label: 'Claro' },
                { key: 'dark', label: 'Oscuro' },
                { key: 'system', label: 'Sistema' },
              ]}
              value={preferredMode}
              onChange={setPreferredMode}
            />
          </View>
          {NOTIFICATIONS.map(item => (
            <Row
              key={item.key}
              leading={icon(item.icon)}
              title={item.title}
              subtitle={item.subtitle}
              trailing={
                <SwitchV2
                  accessibilityLabel={item.title}
                  value={preferences.notifications[item.key]}
                  onValueChange={value =>
                    !dev && preferences.updateNotifications({ [item.key]: value })
                  }
                />
              }
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Cuenta">
          <Row leading={icon(Mail)} title="Correo" value={profile?.email ?? ''} />
          <Row
            leading={icon(KeyRound)}
            title="Cambiar contraseña"
            trailing="chevron"
            onPress={() => setConfirm('password')}
          />
          <Row
            leading={<LogOut size={20} color={colors.ember.deep} strokeWidth={1.8} style={styles.icon} />}
            title="Cerrar sesión"
            destructive
            onPress={() => setConfirm('logout')}
          />
          <Row
            leading={<Trash2 size={20} color={colors.ember.deep} strokeWidth={1.8} style={styles.icon} />}
            title="Eliminar cuenta"
            destructive
            divider={false}
            onPress={() => {
              setDeleteOutcome(null);
              setConfirm('delete1');
            }}
          />
        </SettingsSection>
      </ScrollView>

      <Sheet
        open={confirm === 'logout'}
        onClose={() => setConfirm(null)}
        title="¿Cerrar sesión?"
        footer={
          <Button
            label="Cerrar sesión"
            loading={busy}
            loadingLabel="Cerrando"
            onPress={() => run(signOut)}
            style={styles.flex}
          />
        }
      >
        <TextV2 variant="body" tone="secondary">
          Tus datos quedan guardados en tu cuenta. Podrás volver a entrar cuando quieras.
        </TextV2>
      </Sheet>

      <Sheet
        open={confirm === 'password'}
        onClose={() => setConfirm(null)}
        title="Cambiar contraseña"
        footer={
          <Button
            label="Enviar enlace"
            loading={busy}
            loadingLabel="Enviando"
            onPress={() =>
              run(async () => {
                if (!profile?.email) {
                  throw new Error('No encontramos tu correo.');
                }
                const { error } = await sendPasswordReset(profile.email);
                if (error) {
                  throw error;
                }
              }, 'Te enviamos un enlace a tu correo')
            }
            style={styles.flex}
          />
        }
      >
        <TextV2 variant="body" tone="secondary">
          {`Te enviaremos un enlace a ${profile?.email ?? 'tu correo'} para elegir una contraseña nueva.`}
        </TextV2>
      </Sheet>

      <Sheet
        open={confirm === 'delete1'}
        onClose={() => setConfirm(null)}
        title="Eliminar cuenta"
        footer={
          <Button label="Continuar" variant="outline" onPress={() => closeThen('delete2')} style={styles.flex} />
        }
      >
        <TextV2 variant="body" tone="secondary">
          Se borrarán tu perfil, tus entrenos, récords, logros y tu conversación con ELLIE. No se puede deshacer.
        </TextV2>
      </Sheet>

      <Sheet
        open={confirm === 'delete2'}
        onClose={() => !deleting && setConfirm(null)}
        title="¿Seguro que quieres eliminarla?"
        footer={
          deleteOutcome?.kind === 'lastAdmin' ? (
            <Button label="Entendido" variant="outline" onPress={() => setConfirm(null)} style={styles.flex} />
          ) : (
            <Button
              label={deleteOutcome?.kind === 'retry' ? 'Reintentar' : 'Eliminar mi cuenta'}
              loading={deleting}
              loadingLabel="Eliminando…"
              onPress={deleteAccount}
              style={styles.flex}
            />
          )
        }
      >
        <TextV2 variant="body" tone="secondary">
          Última confirmación: tu cuenta y todos sus datos se eliminarán de forma permanente.
        </TextV2>
        {deleteOutcome && (deleteOutcome.kind === 'lastAdmin' || deleteOutcome.kind === 'retry') ? (
          <TextV2
            variant="meta"
            color={colors.ember.deep}
            style={styles.deleteMessage}
            accessibilityLiveRegion="polite"
          >
            {deleteOutcome.message}
          </TextV2>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  icon: { opacity: 0.75 },
  appearance: { gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  deleteMessage: { marginTop: 12 },
  appearanceHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
