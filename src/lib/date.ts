export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Buenos días';
  }

  if (hour < 19) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}

export function formatShortDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}
