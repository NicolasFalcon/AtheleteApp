import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { useCoachText } from '@app/features/coach/coachCopy';
import { firstName } from '@app/features/coach/coachModel';
import { useCoachStudents, useIsCoach } from '@app/features/coach/useCoach';
import { CoachAvatar, SCENE, antonStyle } from '@app/features/coach/v2/CoachParts';
import { getLocalDateKey } from '@app/lib/date';

// Inicio · tarjeta ATHELETE Coach (§30.3): only with the coach role, dark
// scene at the start of the content. Up to 4 avatars (the one that needs
// attention with the Ember ring), "12 /30 alumnos" and one line: who trained
// today and who has been inactive the longest. Tap → Mis alumnos.
export function CoachHomeCard({ onOpen }: { onOpen: () => void }) {
  const { colors, fonts } = useThemeV2();
  const { t, language } = useCoachText();
  const isCoach = useIsCoach();
  const query = useCoachStudents(isCoach);
  const data = query.data;
  if (!isCoach || !data) {
    return null;
  }
  const today = getLocalDateKey();
  const active = data.students.filter(student => student.status === 'active');
  const trainedToday = active.filter(student => student.lastSessionAt && getLocalDateKey(new Date(student.lastSessionAt)) === today).length;
  const inactive = [...active]
    .filter(student => student.flags.includes('inactive_7d'))
    .sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0))[0];
  const stack = [...active]
    .sort((a, b) => Number(b.flags.includes('inactive_7d')) - Number(a.flags.includes('inactive_7d')))
    .slice(0, 4)
    .reverse();
  const parts = [
    language === 'en' ? `${trainedToday} trained today` : `${trainedToday} entrenaron hoy`,
    inactive
      ? language === 'en'
        ? `${firstName(inactive.name)} hasn't trained for ${inactive.daysInactive ?? 7} days`
        : `${firstName(inactive.name)} lleva ${inactive.daysInactive ?? 7} días sin entrenar`
      : null,
  ].filter(Boolean);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('coach.brand')}. ${data.stats.students}${t('coach.home.students', { max: data.stats.max })}. ${parts.join('. ')}`}
      onPress={onOpen}
      style={[styles.card, { backgroundColor: SCENE }]}
    >
      <View style={styles.top}>
        <View style={styles.eyebrow}>
          <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
          <TextV2 variant="eyebrow" color={colors.ember.textOnDark}>
            {t('coach.brand')}
          </TextV2>
        </View>
        <View style={styles.stack}>
          {stack.map((student, index) => (
            <CoachAvatar
              key={student.linkId}
              name={student.name}
              avatar={student.avatar}
              size={38}
              ring={student.flags.includes('inactive_7d')}
              dark
              style={index > 0 ? styles.overlap : undefined}
            />
          ))}
        </View>
      </View>
      <View style={styles.figure}>
        <TextV2 color="#FFFFFF" style={antonStyle(fonts.display, 60)}>
          {String(data.stats.students)}
        </TextV2>
        <TextV2 color="#D8D6D1" style={antonStyle(fonts.display, 28)}>
          {t('coach.home.students', { max: data.stats.max })}
        </TextV2>
      </View>
      <View style={styles.bottom}>
        <TextV2 variant="bodyL" color="#D8D6D1" style={styles.flex}>
          {parts.join(' · ')}
        </TextV2>
        <View style={styles.arrow}>
          <ArrowRight size={22} color="#141312" strokeWidth={2} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 26, padding: 22, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stack: { flexDirection: 'row' },
  overlap: { marginLeft: -10 },
  figure: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  arrow: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
