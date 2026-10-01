import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import type { TabScreenProps } from '@app/types/navigation';

// Comunidad tab (v2). The social features come in a later phase; for now the
// tab exists with the shell header (avatar → Perfil) and a "coming soon".
export function CommunityScreen({ navigation }: TabScreenProps<'Community'>) {
  const { colors, layout, space } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.s8,
            paddingHorizontal: layout.gutter,
            paddingBottom: bottomClearance,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Perfil"
            hitSlop={4}
            onPress={() => navigation.navigate(APP_ROUTES.Profile)}
          >
            <ProfileAvatar
              avatarKey={profile?.avatarKey}
              profilePhotoUrl={profile?.profilePhotoUrl}
              size={layout.iconButton}
            />
          </Pressable>
          <TextV2 variant="title28" accessibilityRole="header">
            Comunidad
          </TextV2>
        </View>

        <View style={styles.empty}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.surface.muted },
            ]}
          >
            <Users size={28} color={colors.text.secondary} strokeWidth={2} />
          </View>
          <TextV2 variant="sub" align="center">
            Muy pronto
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            Aquí verás los entrenos de tus amigos, retos compartidos y rutinas
            de la comunidad.
          </TextV2>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});
