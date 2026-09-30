// v2 glass blur amounts (MIGRATION_PROGRESS.md §7.6). On Android the glass
// falls back to a near-opaque fill with `androidFallbackAlpha` (D-28).
export const blurV2 = {
  glass: 20,
  tabBar: 24,
  detailSmall: 12,
  detailLarge: 18,
  saturate: 1.8,
  androidFallbackAlpha: 0.96,
} as const;

export type BlurV2 = typeof blurV2;
