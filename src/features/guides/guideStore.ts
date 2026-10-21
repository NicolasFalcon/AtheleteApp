import { useSyncExternalStore } from 'react';
import { AppState, type ScrollView, type View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_ROUTES } from '@app/constants/routes';
import { GUIDE_TOURS, type GuideTour } from '@app/features/guides/guideTours';
import { navigationRef } from '@app/navigation/navigationRef';

// Guías (handoff v2.15 §25.4): which tours this person has seen on this
// device, the tour on screen, and what may not be covered. A tour is marked
// seen when it is shown, so it appears once per screen and user.
//
// Never on top of: an open sheet (Sheet registers itself), a system dialog
// (the app is not "active"), a workout session or a route being recorded.

const key = (userId: string) => `@athelete/guides/${userId}`;

// Screens a guide never covers (a session or a route in progress).
const BLOCKED_ROUTES: string[] = [APP_ROUTES.WorkoutSession, APP_ROUTES.RouteActive];

export type ActiveGuide = { tour: GuideTour; step: number };

type State = {
  userId: string | null;
  loaded: boolean;
  seen: Partial<Record<GuideTour, true>>;
  active: ActiveGuide | null;
};

let state: State = { userId: null, loaded: false, seen: {}, active: null };
let sheets = 0;
// The launch overlay still covers the app: the screen's tour waits for it.
let launching = true;
let pending: GuideTour | null = null;
const listeners = new Set<() => void>();
const anchors = new Map<string, View>();
const scrolls = new Map<GuideTour, ScrollView>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

function persist() {
  if (state.userId) {
    AsyncStorage.setItem(key(state.userId), JSON.stringify(state.seen)).catch(() => undefined);
  }
}

export const guideStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // The signed-in person (null: signed out). Reads what they have seen.
  async setUser(userId: string | null) {
    if (userId === state.userId) {
      return;
    }
    set({ userId, loaded: false, seen: {}, active: null });
    if (!userId) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(key(userId));
      const seen = raw ? (JSON.parse(raw) as State['seen']) : {};
      if (state.userId === userId) {
        set({ seen: seen ?? {}, loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  // Starts the tour of a screen if it was never shown and nothing is in the
  // way. Called ~0.9 s after the screen gains focus.
  maybeStart(tour: GuideTour) {
    if (launching) {
      pending = tour;
      return;
    }
    if (!state.loaded || !state.userId || state.seen[tour] || state.active || sheets > 0) {
      return;
    }
    if (AppState.currentState !== 'active') {
      return;
    }
    const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    if (route && BLOCKED_ROUTES.includes(route)) {
      return;
    }
    set({ active: { tour, step: 0 }, seen: { ...state.seen, [tour]: true } });
    persist();
  },

  next() {
    const active = state.active;
    if (!active) {
      return;
    }
    if (active.step >= GUIDE_TOURS[active.tour].length - 1) {
      set({ active: null });
      return;
    }
    set({ active: { ...active, step: active.step + 1 } });
  },

  close() {
    if (state.active) {
      set({ active: null });
    }
  },

  // The launch overlay is gone: the tour of the screen underneath may start.
  launchDone() {
    launching = false;
    const tour = pending;
    pending = null;
    if (tour) {
      setTimeout(() => guideStore.maybeStart(tour), 600);
    }
  },

  // Leaving the screen closes its tour.
  closeIf(tour: GuideTour) {
    if (pending === tour) {
      pending = null;
    }
    if (state.active?.tour === tour) {
      set({ active: null });
    }
  },

  // The highlighted element was tapped: on to the next step (0.3 s after a
  // "tap" step, so its own action is seen).
  anchorTapped(id: string) {
    const active = state.active;
    const step = active ? GUIDE_TOURS[active.tour][active.step] : null;
    if (!active || step?.anchor !== id) {
      return;
    }
    setTimeout(() => {
      if (state.active === active) {
        guideStore.next();
      }
    }, step.tap ? 300 : 60);
  },

  // Ajustes · "Ver guías de nuevo": every tour shows again.
  resetAll() {
    set({ seen: {}, active: null });
    persist();
  },

  // A sheet opened (or closed): never a guide on top of it.
  sheetOpened() {
    sheets += 1;
    guideStore.close();
  },
  sheetClosed() {
    sheets = Math.max(0, sheets - 1);
  },

  registerAnchor(id: string, view: View | null) {
    if (view) {
      anchors.set(id, view);
    } else {
      anchors.delete(id);
    }
  },
  anchor: (id: string) => anchors.get(id) ?? null,

  registerScroll(tour: GuideTour, scroll: ScrollView | null) {
    if (scroll) {
      scrolls.set(tour, scroll);
    } else {
      scrolls.delete(tour);
    }
  },
  scroll: (tour: GuideTour) => scrolls.get(tour) ?? null,
};

export function useGuideState(): State {
  return useSyncExternalStore(guideStore.subscribe, guideStore.get, guideStore.get);
}
