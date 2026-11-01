import type { DiscomfortAnswer } from '@app/services/ellie/ellieService';

// ELLIE · discomfort_check (ELLIE_PROPOSALS_SHAPES, Implementación real):
// before a routine, ELLIE asks whether an active discomfort is still there.
// The chips are sent as the user's message, with discomfort_answer.

export const DISCOMFORT_STILL = 'Sí, sigue';
export const DISCOMFORT_FINE = 'Ya estoy bien';
export const DISCOMFORT_OTHER = 'Tengo otra molestia';

export const DISCOMFORT_CHIPS = [DISCOMFORT_STILL, DISCOMFORT_FINE, DISCOMFORT_OTHER] as const;

// The zones of "Tengo otra molestia".
export const DISCOMFORT_ZONES = ['hombro', 'rodilla', 'espalda', 'codo', 'otra'] as const;

// A discomfort that is new (another zone), still there, or gone.
export type DiscomfortReply = DiscomfortAnswer & { other: boolean };

export function zoneLabel(zone: string): string {
  const text = zone.replace(/[-_]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : zone;
}

// What a chip sends: its text and the answer. "Tengo otra molestia" needs a
// zone first (null until chosen).
export function discomfortMessage(
  chip: string,
  zones: string[],
  otherZone?: string,
): { text: string; reply: DiscomfortReply } | null {
  const zone = zones[0] ?? 'otra';
  if (chip === DISCOMFORT_STILL) {
    return { text: chip, reply: { zone, status: 'active', other: false } };
  }
  if (chip === DISCOMFORT_FINE) {
    return { text: chip, reply: { zone, status: 'resolved', other: false } };
  }
  if (chip === DISCOMFORT_OTHER && otherZone) {
    return {
      text: `${DISCOMFORT_OTHER}: ${zoneLabel(otherZone)}`,
      reply: { zone: otherZone, status: 'active', other: true },
    };
  }
  return null;
}

// The answer a stored user message gave (the history keeps only its text).
export function discomfortFromText(text: string, zones: string[]): DiscomfortReply | null {
  const trimmed = text.trim();
  if (trimmed.startsWith(DISCOMFORT_OTHER)) {
    const zone = trimmed.slice(DISCOMFORT_OTHER.length).replace(/^[:\s]+/, '').toLowerCase();
    return { zone: zone || 'otra', status: 'active', other: true };
  }
  return discomfortMessage(trimmed, zones)?.reply ?? null;
}

// "Hombro · sigue con molestia".
export function discomfortSummary(reply: DiscomfortReply): string {
  const state = reply.other
    ? 'nueva molestia'
    : reply.status === 'resolved'
      ? 'ya está bien'
      : 'sigue con molestia';
  return `${zoneLabel(reply.zone)} · ${state}`;
}
