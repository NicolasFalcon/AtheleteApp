import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PRIVACY_TRIM_M, trimEnds } from '@app/features/route/routeGeo';
import { useRouteSession } from '@app/features/route/routeStore';
import { useRouteActivity } from '@app/features/route/useRouteData';
import { formatDuration, formatKg } from '@app/features/session/sessionModel';
import {
  improvementOf,
  kmText,
  pickRecord,
  zonesOf,
  type ShareLanguage,
  type StickerData,
} from '@app/features/share/shareModel';
import { useExercises } from '@app/hooks/useCatalog';
import { detectSessionPRs, fetchSessionDetail, type DetectedPR } from '@app/services/supabase/session';

export type ShareTarget = { kind: 'workout'; sessionId: string } | { kind: 'route'; activityId: string };

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
  const records = useMemo(() => prsQuery.data ?? [], [prsQuery.data]);
  const exercises = useExercises([...(detail?.session.completedExercises ?? []), ...records.map(r => r.exerciseId)]);

  const routeSession = useRouteSession();
  const finished =
    routeSession.finished && (!activityId || routeSession.finished.id === activityId) ? routeSession.finished : null;
  const activity = useRouteActivity(activityId ?? finished?.id, finished).data ?? null;

  const data = useMemo((): StickerData | null => {
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
      date: ended ? new Date(ended) : new Date(),
      title: session.workoutTitle,
      durationSec,
      volumeKg: detail.volumeKg,
      reps: reps || null,
      kcal: session.caloriesBurned || null,
      record: pickRecord(named),
      zones: zonesOf(session.completedExercises.map(id => exercises.byId[id]?.bodyPart)),
    };
  }, [activity, detail, exercises.byId, records, target.kind]);

  // "Total Body Dumbbell · 42 min" / "Carrera de tarde · 8,42 km"
  const context = data
    ? data.kind === 'workout'
      ? `${data.title} · ${Math.max(1, Math.round(data.durationSec / 60))} min`
      : `${data.title} · ${kmText(data.distanceM, language)} km`
    : '';

  return {
    data,
    context,
    activity,
    loading: target.kind === 'workout' ? detailQuery.isLoading : !activity,
    error: target.kind === 'workout' ? Boolean(detailQuery.error) : false,
    retry: () => {
      detailQuery.refetch().catch(() => undefined);
    },
  };
}
