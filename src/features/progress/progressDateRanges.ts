export type ProgressRange = 'week' | 'month';

export function buildProgressDateRange(range: ProgressRange): Date[] {
  if (range === 'month') {
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return date;
    });
  }

  const monday = new Date();
  const day = monday.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  monday.setDate(monday.getDate() - daysFromMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function formatProgressDayLabel(date: Date, range: ProgressRange) {
  if (range === 'month') {
    return String(date.getDate());
  }

  return date
    .toLocaleDateString('es-CL', { weekday: 'short' })
    .replace('.', '')
    .slice(0, 3);
}

export function formatProgressTooltipLabel(date: Date) {
  return date
    .toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
    .replace('.', '');
}
