// v2 motion tokens from the prototype keyframes (MIGRATION_PROGRESS.md §5.1).
// Durations in ms; easings as cubic-bezier control points [x1, y1, x2, y2].
// Plain data: the animation library consumes them in phase 2.

type Bezier = readonly [number, number, number, number];

export const easingV2 = {
  standard: [0.25, 0.1, 0.25, 1] as Bezier, // CSS `ease`
  navigation: [0.2, 0.8, 0.2, 1] as Bezier,
  sheet: [0.2, 0.9, 0.25, 1] as Bezier,
  springy: [0.3, 1.3, 0.5, 1] as Bezier,
  grow: [0.3, 1.2, 0.5, 1] as Bezier,
  scan: [0.5, 0, 0.5, 1] as Bezier,
} as const;

export const motionV2 = {
  pressScale: 0.97,
  navigation: { duration: 360, pushOffset: 28, backOffset: -24 },
  tabFade: { duration: 360 },
  sheet: { duration: 380 },
  backdrop: { duration: 250 },
  up: { duration: 350, offset: 10, stagger: 100 },
  pop: { duration: 500, from: 0.6, overshoot: 1.12 },
  shake: { duration: 400, offsets: [-6, 6, -4, 4] },
  skeleton: { duration: 1400, minOpacity: 0.45 }, // D-25
  orb: {
    duration: 3200,
    slowDuration: 3600,
    thinkingDuration: 1200,
    scale: 1.045,
  },
  halo: { duration: 3200, from: 0.5, to: 0.9, scale: 1.12 },
  breath: { duration: 2400, scale: 0.82, opacity: 0.45 },
  pulse: { duration: 2400, scale: 1.6, opacity: 0.35 },
  burst: { duration: 1400, from: 0.3, to: 2.4, delays: [150, 450] },
  rise: { duration: 1100, distance: 70 },
  cascade: { duration: 420, step: 70 },
  grow: { duration: 600 },
  scan: { duration: 1700 },
  kenBurns: { duration: 6000, from: 1.08 },
  toast: { enter: 300, visible: 2200 },
  celebrationDelay: { core33: 900, record: 250 },
  firstDay: { capsule: 450, total: 750 },
} as const;

export type MotionV2 = typeof motionV2;
export type EasingV2 = typeof easingV2;
