import AsyncStorage from '@react-native-async-storage/async-storage';

// "Día cerrado" (handoff §27.6): the sheet is shown at most once per day of
// the challenge, also after un-marking and marking again or reopening the
// app. Per device: the backend has no readable "day closed" record for the
// client (core33_day_completed is a gamification award the habit service
// does not return). The key holds the user id, so deleting the account
// clears it (localUserData).
const key = (userId: string, participationId: string, date: string) =>
  `@athelete/core33-day-closed-v1:${userId}:${participationId}:${date}`;

export async function wasDayClosedShown(
  userId: string,
  participationId: string,
  date: string,
): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId, participationId, date))) !== null;
  } catch {
    return false;
  }
}

export async function markDayClosedShown(
  userId: string,
  participationId: string,
  date: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId, participationId, date), '1');
  } catch {
    // Worst case the sheet shows again after a re-mark today; never block.
  }
}
