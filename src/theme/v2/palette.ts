// Raw colour values of ATHELETE v2 · Alive Minimalism.
// Source: docs/migration/MIGRATION_PROGRESS.md §7.1. Deviations from the
// prototype are marked with their D-xx id (§6 of the same document).
// Screens never import this file directly: use the semantic tokens in
// colors.ts / scene.ts through `theme.v2`.

export const palette = {
  // Warm neutrals · light
  linen: '#F7F6F3',
  white: '#FFFFFF',
  muted: '#EFEEEA',
  track: '#EAE8E3',
  canvas: '#E9E7E2', // D-24: skeleton + Wear plate
  divider: '#E4E2DD',
  cardBorder: '#ECEAE5',
  outline: '#D9D6CF',
  outlineControl: '#C9C6C0',
  chartMuted: '#CFCCC6',

  // Warm neutrals · ink
  ink: '#121212',
  inkSecondary: '#6B6964',
  inkTertiary: '#7A7772',
  inkBodySoft: '#4A4845',

  // Warm neutrals · dark
  dark: '#121110',
  darkRaised: '#1C1B19',
  darkRaised2: '#1F1E1C',
  darkMuted: '#2A2826',
  darkTrack: '#262422', // D-01, D-02
  darkDivider: '#2C2A27',
  darkOutline: '#3A3835', // D-07…D-10
  darkOutlineControl: '#55524E', // D-12
  ivory: '#F2F0EC',
  ivorySecondary: '#A3A09A',
  ivoryTertiary: '#77746F',
  ivoryBodySoft: '#BDBAB4',

  // Scenes (identical in both modes)
  plate: '#141312',
  deep: '#0C0B0A',
  deeper: '#0E0D0C',
  celebration: '#161616', // D-21, D-22
  medal: '#2E2B28',
  medalAlt: '#34312E',
  dotRing: '#1F1D1B',
  onDarkBody: '#E8E6E1',
  onDarkSecondary: '#D8D6D1',
  onDarkMeta: '#A8A6A1',
  onDarkTertiary: '#8C8A85',

  // Ember
  ember: '#FF5B1F',
  emberTextOnDark: '#FF8A5C',
  emberDeep: '#C23D0B', // D-14, D-23

  // Recovery Blue
  recovery: '#6E8FB3',
  recoveryLight: '#8FB0D1',
  recoveryTintBg: '#E7EDF4',
  recoveryTintText: '#3F6188',
  recoveryTintTextDark: '#A9C0DA',
  recoverySurface: '#1A2129',

  // ELLIE
  ellieTextSecondary: '#72655A', // D-17 (prototype #8A7B6C, 3.3:1)
  ellieTextSecondaryDark: '#B3A594',

  // Studio background of MoveKit videos
  studio: ['#FAFAF8', '#F0EFEC', '#E7E5E1'] as const,
  studioAlt: '#ECEBE7',
} as const;

export const alpha = {
  emberGlow: [
    'rgba(255,91,31,.12)',
    'rgba(255,91,31,.14)',
    'rgba(255,91,31,.24)',
    'rgba(255,91,31,.28)',
    'rgba(255,91,31,.35)',
  ] as const,
  recoveryTintBgDark: 'rgba(110,143,179,.18)',
  recoveryGlow: 'rgba(110,143,179,.28)',
  borderOnDark: 'rgba(255,255,255,.06)',
  borderOnDarkStrong: 'rgba(255,255,255,.10)',
  overlayLight: 'rgba(18,18,18,.32)',
  overlayDark: 'rgba(0,0,0,.55)',
  glassNavLight: 'rgba(247,246,243,.84)',
  glassNavDark: 'rgba(18,17,16,.84)',
  glassTabLight: 'rgba(247,246,243,.74)',
  glassTabDark: 'rgba(30,29,27,.72)',
  glassStatusLight: 'rgba(247,246,243,.8)',
  glassStatusDark: 'rgba(18,17,16,.8)',
  glassOnPhoto: 'rgba(255,255,255,.14)',
  glassOnPhotoStrong: 'rgba(255,255,255,.16)',
  scrimTop: 'rgba(20,19,18,.55)',
  scrimBottom: 'rgba(20,19,18,.96)',
  ellieHalo: 'rgba(255,150,90,.28)',
  ellieHaloDark: 'rgba(255,150,90,.2)',
  ellieShadow: 'rgba(120,80,50,.12)',
  ellieInputLight: 'rgba(255,255,255,.82)',
  ellieInputDark: 'rgba(28,27,25,.82)', // D-13
  ellieLinenAlt: 'rgba(237,228,216,.78)',
} as const;

export const gradients = {
  recovery: [
    '#A9B4C0',
    '#B9CCE3',
    '#A9BFD8',
    '#BACCE1',
    '#8FAACB',
    '#1E2E42',
    '#EDF1F6',
    '#141B23',
  ] as const,
  ellieLinenLight: ['#EFE7DD', '#F3EEE7'] as const,
  ellieLinenDark: ['#221B15', '#171411', '#241E18', '#1A1714'] as const,
  ellieLinenAlt: ['#EDE4D8', '#F3EDE5', '#E2D7CA'] as const,
  ellieOrb: [
    '#FFFFFF',
    '#F6E9DE',
    '#F8EDE3',
    '#E6CCB8',
    '#E9D1BE',
    '#CFAE95',
    '#CFAC92',
  ] as const,
} as const;
