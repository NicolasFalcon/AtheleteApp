import { alpha, gradients, palette } from '@app/theme/v2/palette';

export type ColorsV2 = {
  bg: string;
  surface: {
    raised: string;
    raised2: string;
    muted: string;
    track: string;
    skeleton: string;
    wearPlate: string;
    // Input fill (prototype Auth/Onboarding fields).
    field: string;
  };
  divider: string;
  border: {
    card: string;
    onDark: string;
    onDarkStrong: string;
  };
  outline: {
    strong: string;
    control: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    bodySoft: string;
    disabled: string;
  };
  cta: {
    primary: string;
    primaryText: string;
    commit: string;
    commitText: string;
  };
  ember: {
    base: string;
    onText: string;
    textOnDark: string;
    deep: string;
    glow: readonly string[];
  };
  recovery: {
    base: string;
    light: string;
    tintBg: string;
    tintText: string;
    surface: string;
    glow: string;
    gradient: readonly string[];
  };
  ellie: {
    linen: readonly string[];
    linenAlt: readonly string[];
    textSecondary: string;
    orb: readonly string[];
    halo: string;
    shadow: string;
    input: string;
  };
  overlay: string;
  glass: {
    nav: string;
    tab: string;
    statusbar: string;
    onPhoto: string;
  };
  scrim: readonly [string, string];
  chart: {
    muted: string;
  };
  studio: readonly string[];
};

const shared = {
  ember: {
    base: palette.ember,
    onText: palette.ink,
    textOnDark: palette.emberTextOnDark,
    deep: palette.emberDeep,
    glow: alpha.emberGlow,
  },
  scrim: [alpha.scrimTop, alpha.scrimBottom] as const,
  studio: palette.studio,
};

export const lightColorsV2: ColorsV2 = {
  bg: palette.linen,
  surface: {
    raised: palette.white,
    raised2: palette.white,
    muted: palette.muted,
    track: palette.track,
    skeleton: palette.canvas,
    wearPlate: palette.canvas,
    field: palette.muted,
  },
  divider: palette.divider,
  border: {
    card: palette.cardBorder,
    onDark: alpha.borderOnDark,
    onDarkStrong: alpha.borderOnDarkStrong,
  },
  outline: {
    strong: palette.outline,
    control: palette.outlineControl,
  },
  text: {
    primary: palette.ink,
    secondary: palette.inkSecondary,
    tertiary: palette.inkTertiary,
    bodySoft: palette.inkBodySoft,
    disabled: palette.inkTertiary,
  },
  cta: {
    primary: palette.ink,
    primaryText: palette.white,
    commit: palette.ember,
    commitText: palette.ink,
  },
  ember: shared.ember,
  recovery: {
    base: palette.recovery,
    light: palette.recoveryLight,
    tintBg: palette.recoveryTintBg,
    tintText: palette.recoveryTintText,
    surface: palette.recoverySurface,
    glow: alpha.recoveryGlow,
    gradient: gradients.recovery,
  },
  ellie: {
    linen: gradients.ellieLinenLight,
    linenAlt: gradients.ellieLinenAlt,
    textSecondary: palette.ellieTextSecondary,
    orb: gradients.ellieOrb,
    halo: alpha.ellieHalo,
    shadow: alpha.ellieShadow,
    input: alpha.ellieInputLight,
  },
  overlay: alpha.overlayLight,
  glass: {
    nav: alpha.glassNavLight,
    tab: alpha.glassTabLight,
    statusbar: alpha.glassStatusLight,
    onPhoto: alpha.glassOnPhoto,
  },
  scrim: shared.scrim,
  chart: {
    muted: palette.chartMuted,
  },
  studio: shared.studio,
};

export const darkColorsV2: ColorsV2 = {
  bg: palette.dark,
  surface: {
    raised: palette.darkRaised,
    raised2: palette.darkRaised2,
    muted: palette.darkMuted,
    track: palette.darkTrack,
    skeleton: palette.darkRaised2,
    wearPlate: palette.darkRaised,
    field: palette.darkTrack,
  },
  divider: palette.darkDivider,
  border: {
    card: palette.darkTrack,
    onDark: alpha.borderOnDark,
    onDarkStrong: alpha.borderOnDarkStrong,
  },
  outline: {
    strong: palette.darkOutline,
    control: palette.darkOutlineControl,
  },
  text: {
    primary: palette.ivory,
    secondary: palette.ivorySecondary,
    tertiary: palette.ivoryTertiary,
    bodySoft: palette.ivoryBodySoft,
    disabled: palette.darkOutlineControl,
  },
  cta: {
    primary: palette.ivory,
    primaryText: palette.ink,
    commit: palette.ember,
    commitText: palette.ink,
  },
  ember: shared.ember,
  recovery: {
    base: palette.recovery,
    light: palette.recoveryLight,
    tintBg: alpha.recoveryTintBgDark,
    tintText: palette.recoveryTintTextDark,
    surface: palette.recoverySurface,
    glow: alpha.recoveryGlow,
    gradient: gradients.recovery,
  },
  ellie: {
    linen: gradients.ellieLinenDark,
    linenAlt: gradients.ellieLinenDark,
    textSecondary: palette.ellieTextSecondaryDark,
    orb: gradients.ellieOrb,
    halo: alpha.ellieHaloDark,
    shadow: alpha.ellieShadow,
    input: alpha.ellieInputDark,
  },
  overlay: alpha.overlayDark,
  glass: {
    nav: alpha.glassNavDark,
    tab: alpha.glassTabDark,
    statusbar: alpha.glassStatusDark,
    onPhoto: alpha.glassOnPhoto,
  },
  scrim: shared.scrim,
  chart: {
    muted: palette.darkOutlineControl,
  },
  studio: shared.studio,
};
