import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  CORE33_CHALLENGES,
  recommendedChallenge,
} from '@app/features/core33/core33Catalog';
import { ChallengeCard } from '@app/features/core33/v2/Core33Parts';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Core33Explore'>;

// Explorar retos (CORE33_02): one challenge at a time, the one that fits the
// goal of the profile first and large, the rest as tiles.
export function Core33ExploreScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const first = recommendedChallenge(profile?.goal);
  const rest = CORE33_CHALLENGES.filter(challenge => challenge.id !== first.id);
  const open = (id: typeof first.id) =>
    navigation.navigate(APP_ROUTES.Core33Detail, { challengeId: id });

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 32, gap: 24 }}
      >
        <BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
        <View style={styles.head}>
          <TextV2 variant="eyebrow" tone="secondary">
            Core 33
          </TextV2>
          <TextV2 variant="title28" style={styles.title} accessibilityRole="header">
            ¿Qué quieres construir en 33 días?
          </TextV2>
          <TextV2 variant="bodyL" tone="secondary">
            Un reto a la vez. Tres hábitos cada día.
          </TextV2>
        </View>
        <ChallengeCard challenge={first} large recommended onPress={() => open(first.id)} />
        <View style={styles.grid}>
          {rest.map(challenge => (
            <View key={challenge.id} style={styles.cell}>
              <ChallengeCard challenge={challenge} onPress={() => open(challenge.id)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { gap: 8 },
  title: { fontSize: 32, lineHeight: 36, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '48%' },
});
