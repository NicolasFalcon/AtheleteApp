import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState, Platform} from 'react-native';
import {
  createClient,
  processLock,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { env } from '@app/lib/config/env';
import type { Database } from '@app/types/supabase';

let supabaseClient: SupabaseClient<Database> | null = null;
let hasRegisteredAppStateHandler = false;

export const isSupabaseConfigured = env.supabase.isConfigured;

function registerAutoRefresh(client: SupabaseClient<Database>) {
  if (Platform.OS === 'web' || hasRegisteredAppStateHandler) {
    return;
  }

  hasRegisteredAppStateHandler = true;

  if (AppState.currentState === 'active') {
    client.auth.startAutoRefresh();
  }

  AppState.addEventListener('change', state => {
    if (state === 'active') {
      client.auth.startAutoRefresh();
      return;
    }

    client.auth.stopAutoRefresh();
  });
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabase.url, env.supabase.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });

    registerAutoRefresh(supabaseClient);
  }

  return supabaseClient;
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const {data, error} = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}
