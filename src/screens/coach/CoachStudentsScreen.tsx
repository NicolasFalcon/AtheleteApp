import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, StatusBarV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { CoachStudentsView } from '@app/features/coach/v2/CoachStudentsView';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'CoachStudents'>;

// Mis alumnos as its own screen (pushes coach_daily_digest and a coach
// without the Entrenos segment at hand). Same view as Entrenos › Mis alumnos.
export function CoachStudentsScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
      >
        <View style={styles.back}>
          <BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
        </View>
        <CoachStudentsView
          showTitle
          onOpenStudent={student =>
            navigation.navigate(APP_ROUTES.CoachStudent, { linkId: student.linkId, name: student.name })
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { alignSelf: 'flex-start' },
});
