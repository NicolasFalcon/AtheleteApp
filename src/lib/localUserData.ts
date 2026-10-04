import AsyncStorage from '@react-native-async-storage/async-storage';
import { userScopedKeys } from '@app/features/profile/deleteAccountModel';

// After deleting the account: removes what the app keeps on the phone for the
// user (offline session queue, migration marks, local preferences). The theme
// and the visual onboarding are device settings and stay.
export async function clearLocalUserData(userId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const own = userScopedKeys(keys, userId);
  if (own.length > 0) {
    await AsyncStorage.removeMany(own);
  }
}
