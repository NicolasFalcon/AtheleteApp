// v2 elevation as CSS-like `boxShadow` strings (supported by React Native
// 0.85 on the new architecture, iOS and Android). Values come from the
// prototype (MIGRATION_PROGRESS.md §7.5). In dark mode elevation is carried by
// a thin light border rather than a visible shadow.

export type ShadowsV2 = {
  none: string;
  subtle: string;
  cover: string;
  ellie: string;
  floatTab: string;
  sheet: string;
  dialog: string;
  commit: string;
  toast: string;
  lightbox: string;
};

const common = {
  none: 'none',
  commit: '0 12px 32px rgba(255,91,31,.28)',
  toast: '0 12px 32px rgba(0,0,0,.2)',
};

export const lightShadowsV2: ShadowsV2 = {
  ...common,
  subtle: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)',
  cover: '0 18px 40px rgba(20,19,18,.22)', // D-26
  ellie: '0 1px 2px rgba(0,0,0,.04), 0 14px 34px rgba(18,18,18,.10)',
  floatTab: '0 0 0 .5px rgba(0,0,0,.07), 0 12px 32px rgba(0,0,0,.10)',
  sheet: '0 -12px 32px rgba(0,0,0,.12)',
  dialog: '0 12px 32px rgba(0,0,0,.18)',
  lightbox: '0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)',
};

export const darkShadowsV2: ShadowsV2 = {
  ...common,
  subtle: 'inset 0 0 0 1px rgba(255,255,255,.06)', // D-15, D-16
  cover: '0 0 0 1px rgba(255,255,255,.07), 0 24px 56px rgba(0,0,0,.55)',
  ellie: 'none',
  floatTab: '0 0 0 .5px rgba(255,255,255,.1), 0 16px 40px rgba(0,0,0,.55)',
  sheet: '0 0 0 .5px rgba(255,255,255,.08), 0 -16px 40px rgba(0,0,0,.5)',
  dialog: '0 0 0 1px rgba(255,255,255,.06), 0 18px 44px rgba(0,0,0,.5)',
  lightbox: '0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)',
};

// Focus rings and Ember halos: `0 0 0 <width>px <color>`.
export function ringV2(color: string, width = 2): string {
  return `0 0 0 ${width}px ${color}`;
}
