import { haversine } from '@app/features/route/routeGeo';
import type { LatLng, RoutePoint, RouteSport } from '@app/features/route/routeTypes';

// Where positions come from. The screens only know this interface:
//  - 5a: `SimulatedLocationSource` replays a sample polyline over time.
//  - 5c/5d: an expo-location implementation ("Al usar la app" + background
//    updates while recording). The screens do not change.
// TODO(route-wire): ExpoLocationSource (5c/5d).

export type LocationPermission = 'undetermined' | 'granted' | 'denied';

export interface LocationSource {
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  // One fix for "GPS listo ± N m"; null when there is none yet.
  getCurrent(): Promise<RoutePoint | null>;
  // Starts delivering fixes; returns the stop function.
  watch(onFix: (fix: RoutePoint) => void): () => void;
  // The clock of the source (ms). The simulation may run faster than real time.
  now(): number;
  // Whether the person is moving (a simulation stands still while paused).
  setMoving?(moving: boolean): void;
}

export type SimulatedGap = { atSec: number; forSec: number };

export type SimulatedLocationOptions = {
  polyline: ReadonlyArray<LatLng>;
  sport: RouteSport;
  // m/s; defaults to ~5:00 /km running, ~27 km/h cycling.
  speedMs?: number;
  // Virtual seconds per real second (10 = ten times faster).
  speedup?: number;
  // How often a fix is emitted (real ms).
  tickMs?: number;
  permission?: LocationPermission;
  accuracyM?: number;
  // No fixes between atSec and atSec + forSec of virtual movement (GPS gap).
  gaps?: SimulatedGap[];
  // A detour: from `startM` for `lengthM` metres the position is `offsetM`
  // metres to the side of the track (for "Desviado de ruta").
  detour?: { startM: number; lengthM: number; offsetM: number };
  // Never ends (loops back to the start) instead of stopping at the end.
  loop?: boolean;
  // Metres of the track already covered when the source is created.
  startM?: number;
};

const DEFAULT_SPEED: Record<RouteSport, number> = { running: 1000 / 302, cycling: 27.3 / 3.6 };

export class SimulatedLocationSource implements LocationSource {
  private readonly line: LatLng[];
  private readonly cumulative: number[];
  private readonly total: number;
  private readonly opts: SimulatedLocationOptions;
  private permission: LocationPermission;
  private virtualNow: number;
  private travelled = 0;
  private movedSec = 0;
  private moving = true;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: SimulatedLocationOptions, startAt: number = Date.now()) {
    this.opts = opts;
    this.line = [...opts.polyline];
    this.cumulative = [0];
    for (let i = 1; i < this.line.length; i += 1) {
      this.cumulative.push(this.cumulative[i - 1] + haversine(this.line[i - 1], this.line[i]));
    }
    this.total = this.cumulative[this.cumulative.length - 1] ?? 0;
    this.permission = opts.permission ?? 'granted';
    this.virtualNow = startAt;
    this.travelled = opts.startM ?? 0;
  }

  async getPermission() {
    return this.permission;
  }

  async requestPermission() {
    // A simulated "undetermined" is granted when asked; "denied" stays denied
    // until `grantPermission()` (what "Abrir Ajustes" would do).
    if (this.permission === 'undetermined') {
      this.permission = 'granted';
    }
    return this.permission;
  }

  grantPermission() {
    this.permission = 'granted';
  }

  async getCurrent() {
    return this.permission === 'granted' ? this.fixAt(this.travelled) : null;
  }

  now() {
    return this.virtualNow;
  }

  setMoving(moving: boolean) {
    this.moving = moving;
  }

  // Where the person is `meters` along the track (with the detour applied).
  position(meters: number): LatLng {
    const along = this.opts.loop && this.total > 0 ? meters % this.total : Math.min(meters, this.total);
    let i = 1;
    while (i < this.cumulative.length - 1 && this.cumulative[i] < along) {
      i += 1;
    }
    const a = this.line[i - 1] ?? this.line[0];
    const b = this.line[i] ?? a;
    const span = this.cumulative[i] - this.cumulative[i - 1];
    const t = span > 0 ? (along - this.cumulative[i - 1]) / span : 0;
    let lat = a.lat + (b.lat - a.lat) * t;
    let lon = a.lon + (b.lon - a.lon) * t;

    const d = this.opts.detour;
    if (d && along >= d.startM && along <= d.startM + d.lengthM) {
      // Ramp the offset in and out so the track bends instead of jumping.
      const ramp = Math.min(1, (along - d.startM) / 40, (d.startM + d.lengthM - along) / 40);
      const dx = b.lon - a.lon;
      const dy = b.lat - a.lat;
      const norm = Math.hypot(dx, dy) || 1;
      const offsetDeg = (d.offsetM * Math.max(0, ramp)) / 111_195;
      lat += (-dx / norm) * offsetDeg;
      lon += (dy / norm) * offsetDeg;
    }
    return { lat, lon };
  }

  private fixAt(meters: number): RoutePoint {
    const p = this.position(meters);
    return { ...p, t: this.virtualNow, accuracy: this.opts.accuracyM ?? 4 };
  }

  private inGap() {
    return (this.opts.gaps ?? []).some(
      g => this.movedSec >= g.atSec && this.movedSec < g.atSec + g.forSec,
    );
  }

  watch(onFix: (fix: RoutePoint) => void) {
    const tickMs = this.opts.tickMs ?? 1000;
    const speedup = this.opts.speedup ?? 1;
    const speed = this.opts.speedMs ?? DEFAULT_SPEED[this.opts.sport];
    this.stop();
    this.timer = setInterval(() => {
      const stepSec = (tickMs / 1000) * speedup;
      this.virtualNow += stepSec * 1000;
      if (this.moving) {
        this.travelled += speed * stepSec;
        this.movedSec += stepSec;
      }
      if (this.permission === 'granted' && !this.inGap()) {
        onFix(this.fixAt(this.travelled));
      }
    }, tickMs);
    return () => this.stop();
  }

  private stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // The simulation reached the end of the track.
  get finished() {
    return !this.opts.loop && this.travelled >= this.total;
  }
}
