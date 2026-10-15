import { clearRecording } from '@app/features/route/activeRecording';
import type { TrackerState } from '@app/features/route/routeTracker';
import { activityFromTracker } from '@app/features/route/routeSummary';
import type { RouteActivity, RouteVisibility } from '@app/features/route/routeTypes';
import { RouteServiceError, type RouteService } from '@app/services/route/routeService';

// Distance under which a finished outing is not worth saving.
export const MIN_SAVE_M = 100;

export type FinishOutcome =
  // Saved, or queued for when there is network (`activity.pending`).
  | { kind: 'saved'; activity: RouteActivity }
  // The server refused it. It is kept on the phone with the error.
  | { kind: 'rejected'; clientId: string; message: string }
  // Something unexpected: the recording stays on the phone untouched.
  | { kind: 'failed'; message: string };

// Saves a finished outing. The local recording is deleted only after the
// service has either stored it (saved / queued / kept as rejected) or thrown
// something unexpected (then it stays). It never discards an activity.
export async function saveFinishedRecording(args: {
  service: RouteService;
  state: TrackerState;
  userId: string;
  clientId: string;
  visibility: RouteVisibility;
  hideEndpoints: boolean;
  plannedRouteId: string | null;
}): Promise<FinishOutcome> {
  const activity = activityFromTracker(args.state, {
    visibility: args.visibility,
    hideEndpoints: args.hideEndpoints,
    plannedRouteId: args.plannedRouteId,
    clientId: args.clientId,
  });
  try {
    const saved = await args.service.saveActivity(activity);
    await clearRecording(args.userId);
    return { kind: 'saved', activity: saved };
  } catch (error) {
    if (error instanceof RouteServiceError && error.code !== 'not_configured' && error.code !== 'unauthorized') {
      await clearRecording(args.userId);
      return { kind: 'rejected', clientId: args.clientId, message: error.message };
    }
    return { kind: 'failed', message: 'No pudimos guardar la actividad. Sigue en tu teléfono.' };
  }
}
