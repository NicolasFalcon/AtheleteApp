import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  Button,
  Scrim,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { findChallenge } from '@app/features/core33/core33Catalog';
import {
  ChallengeArt,
  HabitLine,
  LevelBars,
  Section,
  StatsRow,
} from '@app/features/core33/v2/Core33Parts';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Core33Detail'>;

// Detalle de reto (CORE33_03): the photo with the name and the three figures,
// what it asks for and the three habits of each day. "Elegir este reto" does
// not start Day 1: it leads to "Tu Core 33 está listo".
export function Core33DetailScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const challenge = findChallenge(route.params.challengeId);

  if (!challenge) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        <SceneScope>
          <View style={styles.hero}>
            <ChallengeArt challenge={challenge} />
            <Scrim variant="hero" />
            <View style={[styles.back, { top: insets.top + 8 }]}>
              <BackButton variant="glass" onPress={() => navigation.goBack()} />
            </View>
            <View style={styles.heroText}>
              <TextV2 variant="eyebrow" color="#FF8A5C">
                {`Core 33 · ${challenge.category}`}
              </TextV2>
              <TextV2 variant="title28" color="#FFFFFF" style={styles.name} accessibilityRole="header">
                {challenge.name}
              </TextV2>
              <TextV2 variant="bodyL" color="#D8D6D1">
                {challenge.intent}
              </TextV2>
              <View style={styles.statsWrap}>
                <StatsRow
                  items={[
                    { value: '33', label: 'días' },
                    { value: '3', label: 'hábitos diarios' },
                    {
                      value: '',
                      label: challenge.levelLabel,
                      node: <LevelBars level={challenge.level} />,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </SceneScope>

        <View style={[styles.body, { paddingHorizontal: layout.gutter }]}>
          <Section title="Lo que buscas">
            <TextV2 variant="title22" style={styles.goal}>
              {challenge.goal}
            </TextV2>
          </Section>
          <Section title="Cada día">
            {challenge.habits.map(habit => (
              <HabitLine key={habit.pillar} pillar={habit.pillar} text={habit.text} />
            ))}
          </Section>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bg, paddingHorizontal: layout.gutter, paddingBottom: Math.max(insets.bottom, 14), borderTopColor: colors.divider },
        ]}
      >
        <Button
          label="Elegir este reto"
          onPress={() => navigation.navigate(APP_ROUTES.Core33Ready, { challengeId: challenge.id })}
          fullWidth
        />
        <TextV2 variant="meta" tone="secondary" align="center">
          Elegirlo no empieza el Día 1. Tú decides cuándo.
        </TextV2>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: 440, backgroundColor: '#141312', justifyContent: 'flex-end', overflow: 'hidden' },
  back: { position: 'absolute', left: 16 },
  heroText: { paddingHorizontal: 20, paddingBottom: 20, gap: 6 },
  name: { fontSize: 40, lineHeight: 44, fontWeight: '600' },
  statsWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.14)' },
  body: { paddingTop: 24, gap: 28 },
  goal: { fontSize: 22, lineHeight: 30, fontWeight: '400' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
