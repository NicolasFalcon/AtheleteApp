import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PRIVACY_TRIM_M, trimEnds } from '@app/features/route/routeGeo';
import { useRouteSession } from '@app/features/route/routeStore';
import { useRouteActivity } from '@app/features/route/useRouteData';
import { formatDuration, formatKg } from '@app/features/session/sessionModel';
import {
  clockText,
  improvementOf,
  kmText,
  pickRecord,
  SHARE_COPY,
  zonesOf,
  type ShareLanguage,
  type StickerData,
} from '@app/features/share/shareModel';
import { signedKg, stickerAnchors } from '@app/features/trainingPlan/planReviewModel';
import { usePlanDetailOf, usePlanReport } from '@app/features/trainingPlan/usePlanReview';
import { getLocalDateKey } from '@app/lib/date';
import { useExercises } from '@app/hooks/useCatalog';
import {
  detectSessionPRs,
  fetchSessionDetail,
  fetchSessionRecords,
  type DetectedPR,
} from '@app/services/supabase/session';

// "YYYY-MM-DD" → that local day at noon (no zone shift of the date).
function localDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export type ShareTarget =
  | { kind: 'workout'; sessionId: string }
  | { kind: 'route'; activityId: string }
  | { kind: 'plan'; planId: string };

// "92,5" (es) · "92.5" (en); whole numbers without decimals.
function kgNumber(value: number, language: ShareLanguage): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return language === 'es' ? text.replace('.', ',') : text;
}

// The mark of a record, as the summary writes it.
function recordValue(record: DetectedPR): string {
  switch (record.prType) {
    case 'max_reps':
      return record.valueReps !== null ? `${record.valueReps} reps` : '';
    case 'duration':
      return record.valueDurationSec !== null ? formatDuration(record.valueDurationSec) : '';
    case 'distance':
      return record.valueDistanceM !== null ? `${record.valueDistanceM} m` : '';
    case 'weight_reps': {
      const kg = formatKg(record.valueWeight);
      return kg ? `${kg}${record.valueReps ? ` × ${record.valueReps}` : ''}` : '';
    }
    default:
      return formatKg(record.valueWeight) ?? '';
  }
}

function recordImprovement(record: DetectedPR): number | null {
  switch (record.prType) {
    case 'max_reps':
      return improvementOf(record.valueReps, record.previousReps);
    case 'duration':
      return improvementOf(record.valueDurationSec, record.previousDurationSec);
    case 'distance':
      return improvementOf(record.valueDistanceM, record.previousDistanceM);
    default:
      return improvementOf(record.valueWeight, record.previousWeight);
  }
}

// Real data of the sticker (26.10.2: never edited): the session (time
// without pauses, volume, reps, kcal, best record, zones) or the activity
// (always trimmed at both ends, 26.10.5).
export function useShareData(target: ShareTarget, language: ShareLanguage) {
  const sessionId = target.kind === 'workout' ? target.sessionId : null;
  const activityId = target.kind === 'route' ? target.activityId : null;
  const planId = target.kind === 'plan' ? target.planId : null;

  // The same cache as the summary.
  const detailQuery = useQuery({
    queryKey: ['session-summary', sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => fetchSessionDetail(sessionId as string),
  });
  const prsQuery = useQuery({
    queryKey: ['session-prs', sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => detectSessionPRs(sessionId as string),
  });
  const detail = detailQuery.data ?? null;
  // A past session (Tu semana · historial): its records are already saved,
  // so detect_session_prs no longer returns them. Saved + still detected,
  // one per set, so the sticker shows that session's records, not today's.
  const setIds = useMemo(
    () => (detail?.sets ?? []).map(set => set.id).filter((id): id is string => Boolean(id)),
    [detail],
  );
  const savedQuery = useQuery({
    queryKey: ['session-saved-prs', sessionId, setIds.length],
    enabled: Boolean(sessionId) && setIds.length > 0,
    queryFn: () => fetchSessionRecords(setIds),
  });
  const records = useMemo(() => {
    const detected = prsQuery.data ?? [];
    const seen = new Set(detected.map(record => record.sessionSetId));
    return [...detected, ...(savedQuery.data ?? []).filter(record => !seen.has(record.sessionSetId))];
  }, [prsQuery.data, savedQuery.data]);
  const exercises = useExercises([...(detail?.session.completedExercises ?? []), ...records.map(r => r.exerciseId)]);

  const routeSession = useRouteSession();
  const finished =
    routeSession.finished && (!activityId || routeSession.finished.id === activityId) ? routeSession.finished : null;
  const activity = useRouteActivity(activityId ?? finished?.id, finished).data ?? null;

  // The final report of a plan (it may already be in the cache: it came
  // inside end_training_plan) and the plan's weeks and dates.
  const reportQuery = usePlanReport(planId);
  const planDetail = usePlanDetailOf(planId);

  const data = useMemo((): StickerData | null => {
    if (target.kind === 'plan') {
      const report = reportQuery.data;
      if (!report) {
        return null;
      }
      // The day the plan closed (ended early: today), at noon.
      const today = getLocalDateKey();
      const end = planDetail.data?.endDate;
      return {
        kind: 'plan',
        date: localDay(end && end < today ? end : today),
        weeks: planDetail.data?.weeks || 0,
        anchors: stickerAnchors(report.anchors).map(anchor => ({
          name: anchor.name,
          after: `${kgNumber(anchor.after, language)} kg`,
          delta: `${signedKg(anchor.delta, language)} kg`,
        })),
      };
    }
    if (target.kind === 'route') {
      if (!activity) {
        return null;
      }
      return {
        kind: 'route',
        date: new Date(activity.startedAt),
        title: activity.title,
        sport: activity.sport === 'cycling' ? 'cycling' : 'running',
        distanceM: activity.distanceM,
        movingSec: activity.movingSec,
        elevationGainM: activity.elevationGainM > 0 ? activity.elevationGainM : null,
        points: trimEnds(activity.points, PRIVACY_TRIM_M),
      };
    }
    if (!detail) {
      return null;
    }
    const session = detail.session;
    const ended = session.endedAt ? new Date(session.endedAt).getTime() : null;
    const wall = ended ? (ended - detail.clock.startedAt) / 1000 - detail.clock.pausedTotalSec : 0;
    const durationSec = wall > 0 ? wall : session.duration * 60;
    const reps = detail.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    const named = records.map(record => ({
      exerciseName: exercises.byId[record.exerciseId]?.name ?? '',
      valueText: recordValue(record),
      improvement: recordImprovement(record),
    }));
    return {
      kind: 'workout',
      // The day of the session (workout_sessions.date: local day it started or
      // was last resumed), not the end: 23:30 → 00:20 shows the day it began.
      date: session.date ? localDay(session.date) : ended ? new Date(ended) : new Date(),
      title: session.workoutTitle,
      durationSec,
      volumeKg: detail.volumeKg,
      reps: reps || null,
      kcal: session.caloriesBurned || null,
      record: pickRecord(named),
      zones: zonesOf(session.completedExercises.map(id => exercises.byId[id]?.bodyPart)),
    };
  }, [activity, detail, exercises.byId, language, planDetail.data, records, reportQuery.data, target.kind]);

  // "Total Body Dumbbell · 42:08" / "Carrera de tarde · 8,42 km": the same
  // duration and rounding as the sticker (clockText of durationSec).
  const context = !data
    ? ''
    : data.kind === 'plan'
      ? SHARE_COPY[language].planTitle
      : data.kind === 'workout'
        ? `${data.title} · ${clockText(data.durationSec)}`
        : `${data.title} · ${kmText(data.distanceM, language)} km`;

  return {
    data,
    context,
    activity,
    loading:
      target.kind === 'workout'
        ? detailQuery.isLoading
        : target.kind === 'plan'
          ? reportQuery.isLoading
          : !activity,
    error:
      target.kind === 'workout'
        ? Boolean(detailQuery.error)
        : target.kind === 'plan'
          ? Boolean(reportQuery.error)
          : false,
    retry: () => {
      detailQuery.refetch().catch(() => undefined);
      reportQuery.refetch().catch(() => undefined);
    },
  };
}
