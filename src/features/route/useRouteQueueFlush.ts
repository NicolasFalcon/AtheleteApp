import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { supabaseRouteService } from '@app/services/route/supabaseRouteService';

// Sends the activities that were saved offline (the local queue of
// supabaseRouteService) when there is a session: at start and every time the
// app comes back to the foreground. Retries use the same client_id, so a
// repeated send cannot duplicate an activity.
export function useRouteQueueFlush(): void {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    const run = () => {
      supabaseRouteService
        .flushPending()
        .then(sent => {
          if (sent > 0) {
            queryClient.invalidateQueries({ queryKey: ['route'] }).catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['social'] }).catch(() => {});
          }
        })
        .catch(() => {});
    };
    run();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        run();
      }
    });
    return () => subscription.remove();
  }, [userId, queryClient]);
}
