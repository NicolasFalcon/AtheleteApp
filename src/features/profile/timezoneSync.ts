import { getSupabaseClient } from '@app/services/supabase/client';

// profiles.timezone is the IANA zone of the device ("America/Mexico_City").
// ellie-chat counts the daily quota in that zone, so the app keeps it current:
// when signing in, when it starts and when it comes back to the foreground.

export function deviceTimezone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone.includes('/') ? zone : zone === 'UTC' ? 'UTC' : null;
  } catch {
    return null;
  }
}

export function timezoneUpdateNeeded(stored: string | null | undefined, device: string | null): boolean {
  return Boolean(device) && stored !== device;
}

export type TimezoneStore = {
  read(userId: string): Promise<string | null>;
  write(userId: string, zone: string): Promise<void>;
};

// Reads profiles.timezone and writes the device's zone only when they differ.
// Resolves with the zone it wrote, or null when nothing changed / it failed.
export async function syncProfileTimezone(
  userId: string,
  device: string | null,
  store: TimezoneStore = supabaseTimezoneStore,
): Promise<string | null> {
  if (!device) {
    return null;
  }
  try {
    const stored = await store.read(userId);
    if (!timezoneUpdateNeeded(stored, device)) {
      return null;
    }
    await store.write(userId, device);
    return device;
  } catch {
    return null;
  }
}

function profiles() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }
  // `timezone` is newer than the generated types.
  return (client as unknown as { from: (table: string) => any }).from('profiles');
}

export const supabaseTimezoneStore: TimezoneStore = {
  async read(userId) {
    const { data, error } = await profiles().select('timezone').eq('id', userId).maybeSingle();
    if (error) {
      throw error;
    }
    return typeof data?.timezone === 'string' ? data.timezone : null;
  },
  async write(userId, zone) {
    const { error } = await profiles().update({ timezone: zone }).eq('id', userId);
    if (error) {
      throw error;
    }
  },
};
