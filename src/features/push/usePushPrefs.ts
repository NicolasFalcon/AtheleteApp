import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@app/components/v2';
import { applyPatch, mergePatches } from '@app/features/push/pushPrefsModel';
import { settingsCopy } from '@app/features/push/pushCopy';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { DEFAULT_PUSH_PREFS, pushService, type PushPrefs, type PushPrefsPatch } from '@app/services/push/pushService';

// The push preferences of Ajustes. A change shows at once; what goes to the
// server is ONLY the fields that changed (set_push_prefs), grouped when they
// come in a burst; if the write fails it is put back with a toast.
export function usePushPrefs() {
  const { profile, refreshProfile } = useAuth();
  const language = useProfileLanguage();
  const toast = useToast();
  const [prefs, setPrefs] = useState<PushPrefs>(profile?.pushPrefs ?? DEFAULT_PUSH_PREFS);
  const confirmed = useRef(prefs);
  const queued = useRef<PushPrefsPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(0);

  useEffect(() => {
    if (profile && inFlight.current === 0 && !timer.current) {
      setPrefs(profile.pushPrefs);
      confirmed.current = profile.pushPrefs;
    }
  }, [profile]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const flush = useCallback(async () => {
    timer.current = null;
    const patch = queued.current;
    queued.current = {};
    if (Object.keys(patch).length === 0) {
      return;
    }
    inFlight.current += 1;
    try {
      const saved = await pushService.setPrefs(patch);
      confirmed.current = saved;
      setPrefs(saved);
      refreshProfile().catch(() => undefined);
    } catch {
      setPrefs(confirmed.current);
      toast.show(settingsCopy(language).saveError, { tone: 'error' });
    } finally {
      inFlight.current -= 1;
    }
  }, [language, refreshProfile, toast]);

  const update = useCallback(
    (patch: PushPrefsPatch) => {
      setPrefs(current => applyPatch(current, patch));
      queued.current = mergePatches(queued.current, patch);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        flush().catch(() => undefined);
      }, 500);
    },
    [flush],
  );

  return { prefs, update };
}
