// Pure state logic of the Living Halo (handoff v2.12 §6 · ELLIE Orb). Kept
// apart from the component so it can be tested without rendering.
export type LivingHaloState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'offline';

// Named sizes (pt) from the handoff: mini for AI buttons, tab bar, chat
// header/messages, input, Home band, cover and voice scene.
export const HALO_SIZES = {
  mini: 20,
  tab: 24,
  chat: 28,
  input: 32,
  band: 56,
  cover: 128,
  voice: 176,
} as const;
export type LivingHaloSize = keyof typeof HALO_SIZES;

export function resolveHaloSize(size: number | LivingHaloSize): number {
  return typeof size === 'number' ? size : HALO_SIZES[size];
}

export type HaloTargets = {
  scale: number;
  breath: number;
  ring: number;
  arc: number;
  halo: number;
  inner: number;
};

// Per-state targets (from the prototype's ellie-orb.js). The Ember arc of
// light only shows while thinking (it travels the contour); at rest the
// contour is an even Ember rim (v2.12 ELLIE cover).
export const HALO_TARGETS: Record<
  Exclude<LivingHaloState, 'offline'>,
  HaloTargets
> = {
  idle: { scale: 1, breath: 1, ring: 0.5, arc: 0, halo: 0, inner: 0 },
  listening: { scale: 1.015, breath: 0.25, ring: 0.82, arc: 0, halo: 0.12, inner: 0.45 },
  thinking: { scale: 1.01, breath: 0.3, ring: 0.22, arc: 1, halo: 0.04, inner: 0.14 },
  speaking: { scale: 1.01, breath: 0.2, ring: 0.5, arc: 0, halo: 0.06, inner: 0.28 },
};

// Settling time per destination state (ms): →idle ~550, →listening/thinking
// 300, →speaking 250.
export const HALO_SETTLE_MS = {
  idle: 550,
  listening: 300,
  thinking: 300,
  speaking: 250,
} as const;

export type HaloKey = keyof typeof HALO_SETTLE_MS;

// Offline renders as a still idle sphere without halo.
export function haloKey(state: LivingHaloState): HaloKey {
  return state === 'offline' ? 'idle' : state;
}

// Tab bar icon: no loops. Inactive = still sphere, no glow; active = soft
// Ember halo and contour, still.
export function resolveHaloTargets(
  state: LivingHaloState,
  tab: { enabled: boolean; active: boolean },
): HaloTargets {
  if (tab.enabled) {
    return tab.active
      ? { ...HALO_TARGETS.idle, ring: 0.5, halo: 0.16, breath: 0 }
      : { ...HALO_TARGETS.idle, ring: 0.14, breath: 0 };
  }
  return HALO_TARGETS[haloKey(state)];
}

// Whether any loop (breathing, arc travel, deformation, ripples) may run.
export function haloMayAnimate(opts: {
  state: LivingHaloState;
  tab: boolean;
  reduceMotion: boolean;
}): boolean {
  return !opts.reduceMotion && !opts.tab && opts.state !== 'offline';
}

export function haloLabel(state: LivingHaloState): string {
  switch (state) {
    case 'offline':
      return 'ELLIE sin conexión';
    case 'listening':
      return 'ELLIE escuchando';
    case 'thinking':
      return 'ELLIE pensando';
    case 'speaking':
      return 'ELLIE respondiendo';
    default:
      return 'ELLIE';
  }
}

// Voice scene: status line under the Halo.
export const VOICE_LABELS: Record<Exclude<LivingHaloState, 'offline'>, string> = {
  idle: 'Toca para hablar',
  listening: 'Escuchando…',
  thinking: 'Procesando…',
  speaking: 'Respondiendo…',
};
