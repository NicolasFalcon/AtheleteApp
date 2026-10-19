// Development-only measurements of the catalog (Lote 1 · B-05): time until
// the first page of exercises is on screen and weight of each answer. They
// are printed in the Metro console as `[perf] …`; nothing in release.

const enabled = typeof __DEV__ !== 'undefined' && __DEV__;

let screenStart: number | null = null;
let firstPageLogged = false;

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Approximate size of a JSON answer (UTF-8 of its text).
export function jsonBytes(value: unknown): number {
  try {
    const text = JSON.stringify(value) ?? '';
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    }
    return bytes;
  } catch {
    return 0;
  }
}

export const catalogPerf = {
  // The exercise list opened.
  screenOpened(): void {
    if (!enabled) {
      return;
    }
    screenStart = Date.now();
    firstPageLogged = false;
  },

  // The first rows are on screen.
  firstPageShown(rows: number): void {
    if (!enabled || firstPageLogged || screenStart === null || rows === 0) {
      return;
    }
    firstPageLogged = true;
    console.log(`[perf] Ejercicios · primera página visible en ${Date.now() - screenStart} ms (${rows} filas)`);
  },

  answer(name: string, startedAt: number, body: unknown, extra = ''): void {
    if (!enabled) {
      return;
    }
    console.log(`[perf] ${name} · ${Date.now() - startedAt} ms · ${kb(jsonBytes(body))}${extra ? ` · ${extra}` : ''}`);
  },

  fromDisk(name: string): void {
    if (enabled) {
      console.log(`[perf] ${name} · desde el teléfono (0 KB de red)`);
    }
  },
};
