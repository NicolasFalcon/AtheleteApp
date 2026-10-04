import {useCallback} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {invalidateCore33Queries} from '@app/lib/queryInvalidation';
import {useAuth} from '@app/hooks/useAuth';
import type {Core33ChallengeId} from '@app/features/core33/core33Catalog';
import {
  fetchCore33State,
  restartCore33Challenge,
  startCore33Challenge,
} from '@app/services/supabase/core33';
import {markCore33IntroSeen} from '@app/services/supabase/profile';

// State of Core 33 (active or last completed participation with its logs) and
// its writes. The habit taps live in useCore33Day (optimistic and queued).
export function useCore33() {
  const queryClient = useQueryClient();
  const {profile, refreshProfile} = useAuth();

  const stateQuery = useQuery({
    queryKey: ['core33', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchCore33State(profile!.id),
  });

  const startMutation = useMutation({
    mutationFn: async (challengeId: Core33ChallengeId) => {
      if (!profile?.id) {
        throw new Error('No hay sesión activa.');
      }

      await startCore33Challenge({
        userId: profile.id,
        challengeId,
      });
    },
    onSuccess: async () => {
      if (!profile?.id) {
        return;
      }

      await invalidateCore33Queries(queryClient, profile.id);
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !stateQuery.data?.challenge) {
        throw new Error('No hay un reto para dejar.');
      }

      await restartCore33Challenge({
        userId: profile.id,
        challengeId: stateQuery.data.challenge.id,
      });
    },
    onSuccess: async () => {
      if (!profile?.id) {
        return;
      }

      await invalidateCore33Queries(queryClient, profile.id);
    },
  });

  // The first time the user leaves the Intro (continues or skips it).
  const markIntroSeen = useCallback(async () => {
    if (!profile?.id || profile.core33IntroSeenAt) {
      return;
    }

    try {
      await markCore33IntroSeen(profile.id);
      await refreshProfile();
    } catch (error) {
      console.warn('[core33] No se pudo guardar la intro vista.', error);
    }
  }, [profile?.core33IntroSeenAt, profile?.id, refreshProfile]);

  return {
    stateQuery,
    startChallenge: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    abandonChallenge: abandonMutation.mutateAsync,
    isAbandoning: abandonMutation.isPending,
    markIntroSeen,
  };
}
