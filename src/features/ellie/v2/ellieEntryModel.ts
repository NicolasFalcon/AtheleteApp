// Entry animation of the ELLIE cover (Ellie.dc.html + ellie-orb.js `flipFromTab`
// + `athUp`). Pure numbers so they can be tested.
export const ELLIE_ENTRY = {
  // The halo leaves the tab icon (24 pt, bottom centre) and grows to 128 pt:
  // 520 ms, cubic-bezier(.22,.9,.24,1), opacity .9 → 1, no bounce.
  halo: {
    duration: 520,
    bezier: [0.22, 0.9, 0.24, 1] as const,
    fromSize: 24,
    toSize: 128,
    fromOpacity: 0.9,
  },
  // Label + voice + answers rise as ONE block: `athUp .5s .1s ease both`
  // (translateY 10 → 0 and fade in, 500 ms after 100 ms, CSS `ease`).
  block: {
    duration: 500,
    delay: 100,
    bezier: [0.25, 0.1, 0.25, 1] as const,
    rise: 10,
  },
} as const;

// Tab icon centre: the tab bar floats `bottomOffset` over the bottom and the
// 24 pt icon sits ~24 pt below the top of the bar.
export function tabIconCenterY(
  windowHeight: number,
  bottomOffset: number,
  tabBarHeight: number,
): number {
  return windowHeight - bottomOffset - tabBarHeight + 24;
}

// The halo wrapper at progress `p` (0 = on the tab, 1 = in place).
export function haloFrame(
  p: number,
  sourceY: number,
  targetCenterY: number,
): { translateY: number; scale: number; opacity: number } {
  'worklet';
  const scaleFrom = ELLIE_ENTRY.halo.fromSize / ELLIE_ENTRY.halo.toSize;
  return {
    translateY: (sourceY - targetCenterY) * (1 - p),
    scale: scaleFrom + (1 - scaleFrom) * p,
    opacity: ELLIE_ENTRY.halo.fromOpacity + (1 - ELLIE_ENTRY.halo.fromOpacity) * p,
  };
}

export function blockFrame(p: number): { translateY: number; opacity: number } {
  'worklet';
  return { translateY: ELLIE_ENTRY.block.rise * (1 - p), opacity: p };
}
