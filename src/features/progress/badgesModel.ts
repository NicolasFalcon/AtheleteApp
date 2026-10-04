import { MONTH_ABBR } from '@app/features/progress/progressModel';
import { ALL_BADGES } from '@app/shared';

// Logros (ACHIEVEMENTS_01 / 02): the badges on the shelves of the design.
// Everything measurable comes from the server (BT-24): the category of each
// badge and its progress (current / target / earned) are the answer of
// rpc('get_badge_progress'); nothing is kept by hand in the app.

export type ShelfKey = 'constancia' | 'retos' | 'fuerza' | 'habitos' | 'otros';

// Order and title of the shelves (presentation only). A category the app
// does not know goes to "Otros" instead of being lost.
const SHELF_ORDER: { key: ShelfKey; title: string }[] = [
  { key: 'constancia', title: 'Constancia' },
  { key: 'retos', title: 'Retos' },
  { key: 'fuerza', title: 'Fuerza' },
  { key: 'habitos', title: 'Hábitos y conocimiento' },
  { key: 'otros', title: 'Otros' },
];

export type BadgeInfo = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

// One row of get_badge_progress.
export type BadgeProgressRow = {
  badgeId: string;
  category: string | null;
  current: number;
  target: number;
  earned: boolean;
  earnedAt?: string;
  title?: string;
  description?: string;
  icon?: string;
};

const asNumber = (value: unknown): number => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

// Tolerant reading: the RPC may answer the list directly or inside
// `{ badges: [...] }`; rows without an id are dropped.
export function parseBadgeProgress(raw: unknown): BadgeProgressRow[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { badges?: unknown }).badges)
    ? ((raw as { badges: unknown[] }).badges)
    : [];
  return list
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map(row => ({
      badgeId: asString(row.badge_id) ?? asString(row.id) ?? '',
      category: asString(row.category) ?? null,
      current: Math.max(0, asNumber(row.current)),
      target: Math.max(0, asNumber(row.target)),
      earned: row.earned === true,
      earnedAt: asString(row.earned_at),
      title: asString(row.title),
      description: asString(row.description),
      icon: asString(row.icon),
    }))
    .filter(row => row.badgeId !== '');
}

export type BadgeProgress = { current: number; target: number; ratio: number };

export type ShelfItem = {
  badge: BadgeInfo;
  earned: boolean;
  earnedAt?: string;
  progress: BadgeProgress | null;
  // Under the medal: the date when earned, "6 de 7" when locked with progress.
  sub: string;
};

export type Shelf = {
  key: ShelfKey;
  title: string;
  earnedCount: number;
  items: ShelfItem[];
};

export function shortBadgeDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return `${date.getDate()} ${MONTH_ABBR[date.getMonth()]}`;
}

// The shelves from the RPC rows. `earnedAt` (user_badges) fills the date when
// the row does not carry it. The count "N / total" comes from the rows.
export function buildShelves(
  rows: BadgeProgressRow[],
  earnedAt: Record<string, string | undefined> = {},
): { shelves: Shelf[]; earnedCount: number; total: number } {
  const items = rows.map(row => {
    const known = ALL_BADGES.find(badge => badge.id === row.badgeId);
    const when = row.earnedAt ?? earnedAt[row.badgeId];
    const progress: BadgeProgress | null =
      !row.earned && row.target > 0
        ? {
            current: Math.min(row.target, row.current),
            target: row.target,
            ratio: Math.min(row.target, row.current) / row.target,
          }
        : null;
    const item: ShelfItem & { category: ShelfKey } = {
      badge: {
        id: row.badgeId,
        title: row.title ?? known?.title ?? row.badgeId,
        description: row.description ?? known?.description ?? '',
        icon: row.icon ?? known?.icon ?? '',
      },
      earned: row.earned,
      earnedAt: row.earned ? when : undefined,
      progress,
      sub: row.earned
        ? shortBadgeDate(when)
        : progress
        ? `${progress.current} de ${progress.target}`
        : '',
      category: SHELF_ORDER.some(shelf => shelf.key === row.category)
        ? (row.category as ShelfKey)
        : 'otros',
    };
    return item;
  });

  const shelves = SHELF_ORDER.map<Shelf>(shelf => {
    const own = items
      .filter(item => item.category === shelf.key)
      .map(({ category: _category, ...item }) => item);
    return {
      key: shelf.key,
      title: shelf.title,
      earnedCount: own.filter(item => item.earned).length,
      items: own,
    };
  }).filter(shelf => shelf.items.length > 0);

  return {
    shelves,
    earnedCount: items.filter(item => item.earned).length,
    total: items.length,
  };
}
