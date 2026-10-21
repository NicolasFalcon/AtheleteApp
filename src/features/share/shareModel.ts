// Compartir en Instagram (handoff v2.16 §26): the data of the stickers, the
// rules the prototype does not show (background by the photo's brightness,
// "+N récords", the route trio without elevation) and the texts in es / en.
// Pure: nothing here renders or touches the device.

export type ShareLanguage = 'es' | 'en';
export type StickerVariant = 'full' | 'min';
export type StickerTone = 'light' | 'dark' | 'glass';
export type ZoneKey = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs' | 'glutes';

// The 7 segments of the muscle bar, in the order of "Por zona".
export const ZONE_ORDER: ZoneKey[] = ['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'glutes'];
const ZONE_LABELS: Record<ShareLanguage, Record<ZoneKey, string>> = {
  es: { chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', arms: 'Brazos', core: 'Core', legs: 'Piernas', glutes: 'Glúteos' },
  en: { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms', core: 'Core', legs: 'Legs', glutes: 'Glutes' },
};

export type WorkoutSticker = {
  kind: 'workout';
  date: Date;
  title: string;
  durationSec: number;
  volumeKg: number | null;
  reps: number | null;
  kcal: number | null;
  // The record with the biggest improvement, and how many more there were.
  record: { text: string; extra: number } | null;
  zones: ZoneKey[];
};

export type RouteSticker = {
  kind: 'route';
  date: Date;
  title: string;
  sport: 'running' | 'cycling';
  distanceM: number;
  movingSec: number;
  elevationGainM: number | null;
  // Already trimmed at both ends (rule 26.10.5).
  points: { lat: number; lon: number }[];
};

export type StickerData = WorkoutSticker | RouteSticker;

// ── Formats ─────────────────────────────────────────────────────────────────
const MONTHS: Record<ShareLanguage, string[]> = {
  es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};

// "7 OCT"
export function stickerDate(date: Date, language: ShareLanguage): string {
  return `${date.getDate()} ${MONTHS[language][date.getMonth()]}`;
}

// 42:08 or 1:05:12
export function clockText(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(x).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

export function thousands(value: number, language: ShareLanguage): string {
  return Math.round(value).toLocaleString(language === 'es' ? 'es-ES' : 'en-US');
}

// "8,42" (es) / "8.42" (en)
export function kmText(distanceM: number, language: ShareLanguage): string {
  const km = (Math.max(0, distanceM) / 1000).toFixed(2);
  return language === 'es' ? km.replace('.', ',') : km;
}

export function paceText(distanceM: number, movingSec: number): string {
  if (distanceM < 10 || movingSec <= 0) {
    return '—';
  }
  const perKm = movingSec / (distanceM / 1000);
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

export function speedText(distanceM: number, movingSec: number, language: ShareLanguage): string {
  if (movingSec <= 0) {
    return '—';
  }
  const kmh = (distanceM / 1000 / movingSec) * 3600;
  const text = kmh.toFixed(1);
  return language === 'es' ? text.replace('.', ',') : text;
}

// ── Workout ─────────────────────────────────────────────────────────────────
export type RecordCandidate = {
  exerciseName: string;
  valueText: string;
  // Relative improvement over the previous best (null: first mark ever).
  improvement: number | null;
};

// The record of the sticker (26.2): the biggest improvement, plus "+N".
// A first mark (no previous) counts as the biggest.
export function pickRecord(records: RecordCandidate[]): WorkoutSticker['record'] {
  if (records.length === 0) {
    return null;
  }
  const score = (record: RecordCandidate) => (record.improvement === null ? Infinity : record.improvement);
  const best = [...records].sort((a, b) => score(b) - score(a))[0];
  return { text: `${best.exerciseName} ${best.valueText}`.trim(), extra: records.length - 1 };
}

export function improvementOf(value: number | null, previous: number | null): number | null {
  if (value === null || previous === null || previous <= 0) {
    return null;
  }
  return (value - previous) / previous;
}

// bodyPart of the catalog → the 7 zones (anything else is left out).
export function zonesOf(bodyParts: (string | null | undefined)[]): ZoneKey[] {
  const set = new Set(bodyParts.filter((part): part is ZoneKey => ZONE_ORDER.includes(part as ZoneKey)));
  return ZONE_ORDER.filter(zone => set.has(zone));
}

export function zonesLine(zones: ZoneKey[], language: ShareLanguage): string {
  return zones.map(zone => ZONE_LABELS[language][zone]).join(' · ');
}

// The trio of a sticker: workout volume · reps · kcal; route time · pace
// (speed when cycling) · elevation, in two columns without elevation.
export function stickerTrio(data: StickerData, language: ShareLanguage): { value: string; label: string }[] {
  const t = SHARE_COPY[language];
  if (data.kind === 'workout') {
    return [
      { value: data.volumeKg !== null && data.volumeKg > 0 ? thousands(data.volumeKg, language) : '—', label: t.volume },
      { value: data.reps !== null && data.reps > 0 ? thousands(data.reps, language) : '—', label: t.reps },
      { value: data.kcal !== null && data.kcal > 0 ? thousands(data.kcal, language) : '—', label: 'kcal' },
    ];
  }
  const trio = [
    { value: clockText(data.movingSec), label: t.time },
    data.sport === 'cycling'
      ? { value: speedText(data.distanceM, data.movingSec, language), label: 'km/h' }
      : { value: paceText(data.distanceM, data.movingSec), label: t.pace },
  ];
  if (data.elevationGainM !== null && data.elevationGainM > 0) {
    trio.push({ value: `+${Math.round(data.elevationGainM)}`, label: t.elevation });
  }
  return trio;
}

// The key figure of the Mínimo variant.
export function minFigure(data: StickerData, language: ShareLanguage): { value: string; unit: string } {
  return data.kind === 'workout'
    ? { value: clockText(data.durationSec), unit: 'min' }
    : { value: kmText(data.distanceM, language), unit: 'km' };
}

// ── Sizes (26.8) ────────────────────────────────────────────────────────────
export const STICKER_MARGIN = 24;

export function stickerSize(data: StickerData, variant: StickerVariant): { width: number; height: number } {
  if (variant === 'min') {
    return { width: 232, height: 72 };
  }
  if (data.kind === 'route') {
    return { width: 300, height: 400 };
  }
  return { width: 300, height: data.record ? 368 : 326 };
}

export const COMBINED = { width: 1080, height: 1920, stickerCenterY: 1150, fullWidth: 720, minWidth: 560 };

// ── Background of the sticker (26.5) ────────────────────────────────────────
export type PhotoKind = 'none' | 'dark' | 'mid' | 'light';

// Relative luminance 0–1 → the kind of photo.
export function photoKindOf(luminance: number | null): PhotoKind {
  if (luminance === null) {
    return 'mid';
  }
  return luminance >= 0.6 ? 'light' : luminance <= 0.32 ? 'dark' : 'mid';
}

// Claro for dark photos, Oscuro for light ones, Translúcido for mid tones
// and without a photo. A choice of the person for that kind of photo is
// remembered and wins next time.
export function defaultTone(kind: PhotoKind, remembered: Partial<Record<PhotoKind, StickerTone>>): StickerTone {
  if (remembered[kind]) {
    return remembered[kind] as StickerTone;
  }
  return kind === 'dark' ? 'light' : kind === 'light' ? 'dark' : 'glass';
}

// Average luminance of RGBA pixels (sRGB, Rec. 709 weights).
export function luminanceOf(rgba: Uint8Array | number[]): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i + 2 < rgba.length; i += 4) {
    total += (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
    count += 1;
  }
  return count ? total / count : 0.5;
}

// ── Texts ───────────────────────────────────────────────────────────────────
export const SHARE_COPY = {
  es: {
    title: 'Compartir',
    hint: 'El sticker va aparte: en Historias lo mueves y lo escalas.',
    photo: 'Foto',
    camera: 'Cámara',
    gallery: 'Galería',
    noPhoto: 'Sin foto',
    sticker: 'Sticker',
    full: 'Completo',
    min: 'Mínimo',
    tones: {
      light: 'Fondo claro · para fotos oscuras',
      dark: 'Fondo oscuro · para fotos claras',
      glass: 'Translúcido · para tonos medios',
    } as Record<StickerTone, string>,
    stories: 'Historias de Instagram',
    download: 'Descargar',
    more: 'Más',
    community: 'Comunidad',
    workoutDone: 'ENTRENO COMPLETADO',
    time: 'tiempo',
    volume: 'kg volumen',
    reps: 'repeticiones',
    pace: 'ritmo /km',
    elevation: 'm desnivel',
    record: 'Récord',
    moreRecords: (n: number) => `+${n} ${n === 1 ? 'récord' : 'récords'}`,
    opening: 'Abriendo Instagram',
    saved: 'Guardada en Fotos · 1080 × 1920',
    noInstagramEyebrow: 'Historias',
    noInstagramTitle: 'No encontramos Instagram',
    noInstagramText: 'Guarda la imagen en Fotos y súbela desde Instagram cuando quieras. El sticker va incluido.',
    saveImage: 'Guardar imagen',
    otherWays: 'Compartir de otra forma',
    notNow: 'Ahora no',
    photosDeniedTitle: 'Sin permiso para Fotos',
    photosDeniedText: 'Para guardar la imagen, permite que ATHELETE añada fotos en Ajustes.',
    openSettings: 'Abrir Ajustes',
    error: 'No pudimos preparar la imagen. Inténtalo otra vez.',
    routePrivate: 'Esta ruta es privada (Solo yo). Cambia su privacidad para publicarla en Comunidad.',
  },
  en: {
    title: 'Share',
    hint: 'The sticker goes separately: in Stories you move and resize it.',
    photo: 'Photo',
    camera: 'Camera',
    gallery: 'Gallery',
    noPhoto: 'No photo',
    sticker: 'Sticker',
    full: 'Full',
    min: 'Minimal',
    tones: {
      light: 'Light background · for dark photos',
      dark: 'Dark background · for light photos',
      glass: 'Translucent · for mid tones',
    } as Record<StickerTone, string>,
    stories: 'Instagram Stories',
    download: 'Download',
    more: 'More',
    community: 'Community',
    workoutDone: 'WORKOUT COMPLETED',
    time: 'time',
    volume: 'kg volume',
    reps: 'reps',
    pace: 'pace /km',
    elevation: 'm elevation',
    record: 'Record',
    moreRecords: (n: number) => `+${n} ${n === 1 ? 'record' : 'records'}`,
    opening: 'Opening Instagram',
    saved: 'Saved to Photos · 1080 × 1920',
    noInstagramEyebrow: 'Stories',
    noInstagramTitle: "We couldn't find Instagram",
    noInstagramText: 'Save the image to Photos and post it from Instagram whenever you like. The sticker is included.',
    saveImage: 'Save image',
    otherWays: 'Share another way',
    notNow: 'Not now',
    photosDeniedTitle: 'No access to Photos',
    photosDeniedText: 'To save the image, allow ATHELETE to add photos in Settings.',
    openSettings: 'Open Settings',
    error: "We couldn't prepare the image. Try again.",
    routePrivate: 'This route is private (Only me). Change its privacy to post it in Community.',
  },
} as const;
