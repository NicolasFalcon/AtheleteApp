import { useEffect } from 'react';
import { AppState } from 'react-native';
import { applyReminders, planReminders, type ReminderScheduler } from '@app/features/push/localReminders';
import { notificationsModule } from '@app/features/push/notificationsNative';
import { LOCAL_FLAG } from '@app/features/push/usePushEvents';
import { readPermission } from '@app/features/push/pushRuntime';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

function nativeScheduler(): ReminderScheduler {
  const Notifications = notificationsModule();
  return {
    scheduled: async () => (await Notifications.getAllScheduledNotificationsAsync()).map(item => item.identifier),
    cancel: id => Notifications.cancelScheduledNotificationAsync(id),
    schedule: async reminder => {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body, data: { [LOCAL_FLAG]: true } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt },
      });
    },
  };
}

// Reminders of workouts and hydration (notification_prefs.workouts /
// hydration, the switches of Ajustes), respecting the quiet hours. They are
// planned again every time the data changes or the app comes to the foreground.
export function useLocalReminders(): void {
  const { profile, flow } = useAuth();
  const language = useProfileLanguage();
  const home = useHomeFeed();
  const overview = home.data;
  const prefs = profile?.notificationPrefs;
  const quiet = profile?.pushPrefs.quietHours;
  const perWeek = profile?.trainingDaysPerWeek ?? null;
  const trainedToday = Boolean(overview?.completedToday);
  const waterMl = overview?.hydration.todayMl ?? 0;
  const waterGoalMl = overview?.hydration.goalMl ?? null;
  const active = flow === 'app' && Boolean(profile);

  useEffect(() => {
    if (!active || !prefs || !quiet) {
      return undefined;
    }
    const run = async () => {
      if ((await readPermission()) !== 'granted') {
        return;
      }
      await applyReminders(
        nativeScheduler(),
        planReminders({
          now: new Date(),
          language,
          workouts: prefs.workouts,
          hydration: prefs.hydration,
          quiet,
          trainingDaysPerWeek: perWeek,
          trainedToday,
          waterMl,
          waterGoalMl,
        }),
      );
    };
    run().catch(() => undefined);
    const state = AppState.addEventListener('change', next => {
      if (next === 'active') {
        run().catch(() => undefined);
      }
    });
    return () => state.remove();
  }, [active, language, perWeek, prefs, quiet, trainedToday, waterGoalMl, waterMl]);

  // Signing out clears what was scheduled for that person.
  useEffect(() => {
    if (flow === 'auth') {
      applyReminders(nativeScheduler(), []).catch(() => undefined);
    }
  }, [flow]);
}
