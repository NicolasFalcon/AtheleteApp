import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { invalidateNutritionDay } from '@app/features/nutrition/useNutritionToday';
import { useAuth } from '@app/hooks/useAuth';
import { invalidateRoutineLists } from '@app/hooks/useRoutines';
import { invalidateWeek } from '@app/hooks/useWeekPlan';
import { createUuid } from '@app/lib/uuid';
import {
  CoachError,
  coachService,
  type NutritionTargetsInput,
} from '@app/services/coach/coachService';

// ATHELETE Coach through the coach-1 RPCs. Coach data is only read with
// profiles.is_coach; the student side (student_get_coach) for everyone.

export const coachKeys = {
  all: ['coach'] as const,
  students: (userId: string | undefined) => ['coach', 'students', userId ?? 'anon'] as const,
  student: (userId: string | undefined, linkId: string) => ['coach', 'student', userId ?? 'anon', linkId] as const,
  invite: (userId: string | undefined) => ['coach', 'invite', userId ?? 'anon'] as const,
  preview: (code: string) => ['coach', 'preview', code] as const,
  mine: (userId: string | undefined) => ['coach', 'mine', userId ?? 'anon'] as const,
};

export function useIsCoach(): boolean {
  const { profile } = useAuth();
  return profile?.isCoach === true;
}

const noRetryOn = (codes: string[]) => (count: number, error: unknown) =>
  !(error instanceof CoachError && codes.includes(error.code)) && count < 1;

export function useCoachStudents(enabled = true) {
  const { profile } = useAuth();
  const isCoach = profile?.isCoach === true;
  return useQuery({
    queryKey: coachKeys.students(profile?.id),
    enabled: Boolean(profile?.id) && isCoach && enabled,
    staleTime: 30_000,
    retry: noRetryOn(['not_coach']),
    queryFn: () => coachService.listStudents(),
  });
}

export function useCoachStudent(linkId: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: coachKeys.student(profile?.id, linkId),
    enabled: Boolean(profile?.id && linkId),
    staleTime: 15_000,
    retry: noRetryOn(['not_found', 'not_coach']),
    queryFn: () => coachService.getStudent(linkId),
  });
}

export function useCoachInvite(enabled: boolean) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: coachKeys.invite(profile?.id),
    enabled: Boolean(profile?.id) && enabled,
    staleTime: 5 * 60_000,
    queryFn: () => coachService.getInvite(),
  });
}

// coach_preview_invite: an answer for a code (errors are answers, no retry).
export function useCoachPreview(code: string | null) {
  return useQuery({
    queryKey: coachKeys.preview(code ?? ''),
    enabled: Boolean(code),
    staleTime: 60_000,
    retry: noRetryOn(['invalid_code', 'own_code', 'coach_full', 'already_linked']),
    queryFn: () => coachService.previewInvite(code as string),
  });
}

export function useMyCoach(enabled = true) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: coachKeys.mine(profile?.id),
    enabled: Boolean(profile?.id) && enabled,
    staleTime: 60_000,
    queryFn: () => coachService.getMyCoach(),
  });
}

// What a change of the link touches on the student's side: the week (coach
// days), the routines (the copy), nutrition (the coach plan).
async function invalidateStudentSide(queryClient: QueryClient, userId: string | undefined) {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: coachKeys.all }),
    invalidateWeek(queryClient),
    invalidateRoutineLists(queryClient),
    invalidateNutritionDay(queryClient, userId),
    queryClient.invalidateQueries({ queryKey: ['nutrition-targets'] }),
    queryClient.invalidateQueries({ queryKey: ['nutrition', 'plan'] }),
  ]);
}

export function useCoachMutations() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id;
  const refreshCoach = () => queryClient.invalidateQueries({ queryKey: coachKeys.all });

  const assignRoutine = useMutation({
    mutationFn: (input: {
      linkId: string;
      sourceTemplateId: string;
      days: number[];
      startDate: string;
      weeks: number | null;
      note: string | null;
      clientId: string;
    }) => coachService.assignRoutine(input),
    onSuccess: () => refreshCoach(),
  });

  const endRoutine = useMutation({
    mutationFn: (assignmentId: string) => coachService.endRoutine(assignmentId),
    onSuccess: () => refreshCoach(),
  });

  const assignNutrition = useMutation({
    mutationFn: (input: { linkId: string; targets: NutritionTargetsInput; note: string | null; clientId: string }) =>
      coachService.assignNutrition(input),
    onSuccess: () => refreshCoach(),
  });

  const endLink = useMutation({
    mutationFn: (linkId: string) => coachService.endLink(linkId),
    onSuccess: () => refreshCoach(),
  });

  const regenerateInvite = useMutation({
    mutationFn: () => coachService.regenerateInvite(),
    onSuccess: invite => {
      queryClient.setQueryData(coachKeys.invite(userId), invite);
    },
  });

  const acceptInvite = useMutation({
    mutationFn: (input: { code: string; shareNutrition: boolean; shareBody: boolean }) =>
      coachService.acceptInvite(input),
    onSuccess: () => invalidateStudentSide(queryClient, userId),
  });

  const updateShares = useMutation({
    mutationFn: (input: { shareNutrition: boolean; shareBody: boolean }) => coachService.updateShares(input),
    onSettled: () => invalidateStudentSide(queryClient, userId),
  });

  const respondNutrition = useMutation({
    mutationFn: (input: { assignmentId: string; accept: boolean }) =>
      coachService.respondNutrition(input.assignmentId, input.accept),
    onSuccess: () => invalidateStudentSide(queryClient, userId),
  });

  const endMyLink = useMutation({
    mutationFn: () => coachService.endMyLink(),
    onSuccess: () => invalidateStudentSide(queryClient, userId),
  });

  return {
    assignRoutine,
    endRoutine,
    assignNutrition,
    endLink,
    regenerateInvite,
    acceptInvite,
    updateShares,
    respondNutrition,
    endMyLink,
  };
}

// Idempotency key of one assignment attempt (kept while the screen lives,
// so a retry after a timeout is not a second assignment).
export function newClientId(): string {
  return createUuid();
}
