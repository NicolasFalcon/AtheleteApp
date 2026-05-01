import { useCallback } from "react";
import { useRouter } from "next/navigation";

export function useSafeBack(fallbackHref: string) {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const cameFromSameOrigin =
        referrer.length > 0 && referrer.startsWith(window.location.origin);
      const historyState = window.history.state as { idx?: number } | null;
      const hasInAppHistory =
        typeof historyState?.idx === "number" && historyState.idx > 0;

      if (hasInAppHistory || cameFromSameOrigin) {
        router.back();
        return;
      }
    }

    router.push(fallbackHref);
  }, [fallbackHref, router]);
}
