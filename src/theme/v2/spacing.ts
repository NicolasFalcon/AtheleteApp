// v2 spacing scale in points (MIGRATION_PROGRESS.md §7.3). Keys are the
// value itself so they read the same in code as in the prototype.
export const spaceV2 = {
  s2: 2,
  s3: 3,
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s18: 18,
  s20: 20,
  s22: 22,
  s24: 24,
  s26: 26,
  s28: 28,
  s30: 30,
  s32: 32,
  s36: 36,
} as const;

export const layoutV2 = {
  gutter: 20,
  floatingGutter: 16,
  sectionGap: 32,
  rowMinHeight: 56,
  rowTwoLineHeight: 64,
  iconButton: 44,
  sheetCloseButton: 36,
  primaryCtaHeight: 56,
  secondaryCtaHeight: 48,
  tabBarHeight: 64,
  tabBarBottom: 24,
  tabBarClearance: 120,
} as const;

export type SpaceV2 = typeof spaceV2;
export type LayoutV2 = typeof layoutV2;
