// v2 corner radii in points (MIGRATION_PROGRESS.md §7.4).
export const radiusV2 = {
  pill: 999,
  circle44: 22,
  circle36: 18,
  tabBar: 34,
  lightbox: 34,
  tabItem: 28,
  sheet: 28,
  rise: 32,
  card: 24,
  cardCompact: 20,
  input: 16,
  inputCompact: 14,
  thumb: 12,
  capsule: 10,
  capsulePreview: 7,
  chipSmall: 8,
  bar: 3,
} as const;

export type RadiusV2 = typeof radiusV2;
