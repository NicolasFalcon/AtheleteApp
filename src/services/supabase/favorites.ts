import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@app/services/supabase/client';

// user_favorites (BACKEND): PK (user_id, item_type, item_id), RLS: select /
// insert / delete only the user's own rows; no update.
export type FavoriteType = 'routine' | 'exercise';

export type FavoriteRow = { itemType: FavoriteType; itemId: string };

function getClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }
  return client;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Newest first.
export async function fetchFavorites(userId: string): Promise<FavoriteRow[]> {
  const { data, error } = await getClient()
    .from('user_favorites')
    .select('item_type, item_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? [])
    .filter(row => row.item_type === 'routine' || row.item_type === 'exercise')
    .map(row => ({
      itemType: row.item_type as FavoriteType,
      itemId: row.item_id,
    }));
}

// A second insert of the same favourite is not an error (23505).
export async function addFavorite(
  userId: string,
  itemType: FavoriteType,
  itemId: string,
): Promise<void> {
  const { error } = await getClient()
    .from('user_favorites')
    .insert({ user_id: userId, item_type: itemType, item_id: itemId });
  if (error && error.code !== '23505') {
    throw error;
  }
}

export async function removeFavorite(
  userId: string,
  itemType: FavoriteType,
  itemId: string,
): Promise<void> {
  const { error } = await getClient()
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_id', itemId);
  if (error) {
    throw error;
  }
}

// ── One-time migration of the old AsyncStorage favourites ───────────────────
export const LEGACY_WORKOUTS_KEY = 'athelete_favorite_workouts';
export const LEGACY_EXERCISES_KEY = 'athelete_favorite_exercises';
const migratedKey = (userId: string) =>
  `@athelete/favorites-migrated-v1:${userId}`;

async function readLegacy(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string => typeof item === 'string' && UUID.test(item),
        )
      : [];
  } catch {
    return [];
  }
}

// Uploads what the device had (upsert: duplicates do not fail), then removes
// the local keys and leaves the "migrated" mark. If the upload fails nothing
// is deleted and it is tried again next time. Returns whether it ran.
export async function migrateLocalFavorites(userId: string): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(migratedKey(userId))) {
      return false;
    }
  } catch {
    return false;
  }

  const [routines, exercises] = await Promise.all([
    readLegacy(LEGACY_WORKOUTS_KEY),
    readLegacy(LEGACY_EXERCISES_KEY),
  ]);
  const rows = [
    ...routines.map(id => ({ item_type: 'routine', item_id: id })),
    ...exercises.map(id => ({ item_type: 'exercise', item_id: id })),
  ].map(row => ({ ...row, user_id: userId }));

  if (rows.length > 0) {
    const { error } = await getClient()
      .from('user_favorites')
      .upsert(rows, {
        onConflict: 'user_id,item_type,item_id',
        ignoreDuplicates: true,
      });
    if (error) {
      throw error;
    }
  }

  await AsyncStorage.removeItem(LEGACY_WORKOUTS_KEY);
  await AsyncStorage.removeItem(LEGACY_EXERCISES_KEY);
  await AsyncStorage.setItem(migratedKey(userId), new Date().toISOString());
  return true;
}
