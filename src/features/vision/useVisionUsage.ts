import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { remainingAnalyses } from '@app/features/vision/visionCopy';
import { useAuth } from '@app/hooks/useAuth';
import { ellieKeys, useEllieUsage } from '@app/hooks/useEllieConversations';
import type { EllieUsage } from '@app/services/ellie/ellieService';
import type { VisionUsage } from '@app/services/vision/visionService';

// The day's quota of photo analyses: read from get_ellie_usage, refreshed with
// the `usage` of every answer. `meal` = the shared image_analyses; `machine` =
// the scans of machines.
export function useVisionUsage(kind: 'meal' | 'machine') {
  const { profile } = useAuth();
  const client = useQueryClient();
  const usage = useEllieUsage();
  const data = usage.data;
  const used = kind === 'meal' ? data?.imageAnalysesUsed : data?.machineScansUsed;
  const limit = kind === 'meal' ? data?.imageAnalysesLimit : data?.machineScansLimit;
  // Only 3 or fewer left are worth saying.
  const left = used !== undefined && limit !== undefined ? remainingAnalyses(used, limit) : null;

  const record = useCallback(
    (next: VisionUsage | null) => {
      if (!next) {
        return;
      }
      client.setQueryData<EllieUsage | null | undefined>(ellieKeys.usage(profile?.id), current =>
        current
          ? kind === 'meal'
            ? { ...current, imageAnalysesUsed: next.used, imageAnalysesLimit: next.limit }
            : { ...current, machineScansUsed: next.used, machineScansLimit: next.limit }
          : current,
      );
    },
    [client, kind, profile?.id],
  );

  return { left, record };
}
