import { useState, useCallback } from 'react';

const STORAGE_KEY = 'athelete_is_premium';

function loadPremium(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export function usePremium() {
  const [isPremium, setIsPremiumState] = useState<boolean>(loadPremium);

  const setIsPremium = useCallback((value: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
    setIsPremiumState(value);
  }, []);

  return { isPremium, setIsPremium };
}
