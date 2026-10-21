#!/usr/bin/env node
// Renders the ATHELETE sound events (handoff v2.15 §25.8) to audio files.
//
// The synthesis is the prototype's own `ath-sound.js`, loaded unchanged in
// headless Chrome with an OfflineAudioContext in place of the live one, so the
// files match the prototype exactly (oscillators, envelopes, volumes, reverb,
// compressor). Randomness (reverb and noise) uses a fixed seed per event, so
// every run gives the same files.
//
// Output (src/assets/sounds/):
//   <event>.wav  16-bit PCM, 44.1 kHz stereo (Android)
//   <event>.caf  the same audio, Core Audio format (iOS), via `afconvert`
// Every file is trimmed (leading and trailing silence) and all share ONE gain
// so the loudest event peaks at -1 dBFS: the hierarchy between events (a quiet
// tick under a loud "complete") stays as designed.
//
// Usage: node scripts/render-sounds.js [--chrome <path>] [--source <ath-sound.js>]
// Needs macOS (afconvert) and Google Chrome.

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const WebSocket = require('ws');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const SOURCE = arg('--source', path.join(ROOT, 'migration-source/ATHELETE Alive Minimalism/ath-sound.js'));
const OUT_DIR = path.join(ROOT, 'src/assets/sounds');

const SAMPLE_RATE = 44100;
const RENDER_SECONDS = 5;
const PEAK_DBFS = -1;
const START_THRESHOLD = 1e-4; // -80 dB
const END_THRESHOLD = 10 ** (-60 / 20);
const FADE_OUT_MS = 20;

// Every file and the ath-sound.js call that produces it.
// - tick-urgent-<s>: s = seconds left (5…2); the pitch rises as s falls.
// - point-<k>: k = step of the E5–B6 scale (0…7); the pan alternates with k.
// - complete-<tier>: low · mid · perfect.
const EVENTS = [
  ['tick', 'S.tick(0)'],
  ['tick-urgent-5', 'S.tick(1, 5)'],
  ['tick-urgent-4', 'S.tick(1, 4)'],
  ['tick-urgent-3', 'S.tick(1, 3)'],
  ['tick-urgent-2', 'S.tick(1, 2)'],
  ['tick-final', 'S.tick(2)'],
  ['correct', 'S.correct(0)'],
  ['correct-streak', 'S.correct(3)'],
  ['wrong', 'S.wrong()'],
  ...Array.from({ length: 8 }, (_, k) => [`point-${k}`, `S.point(${k}, 8)`]),
  ['impact', 'S.impact()'],
  ['complete-low', "S.complete('low')"],
  ['complete-mid', "S.complete('mid')"],
  ['complete-perfect', "S.complete('perfect')"],
  ['day-close', 'S.dayClose()'],
];

// Runs in the page: renders one event and returns its channels as base64.
const HARNESS = `
window.__athSource = ${JSON.stringify(fs.readFileSync(SOURCE, 'utf8'))};
window.__render = async (name, call, sampleRate, seconds) => {
  let seed = 0;
  for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let ctx = null;
  window.AudioContext = class extends OfflineAudioContext {
    constructor() { super(2, Math.round(sampleRate * seconds), sampleRate); ctx = this; }
  };
  window.webkitAudioContext = undefined;
  window.fetch = () => Promise.reject(new Error('offline'));
  delete window.AthSound;
  (0, eval)(window.__athSource);
  const S = window.AthSound;
  S.setMuted(false);
  eval(call);
  if (!ctx) throw new Error('no context for ' + name);
  const buffer = await ctx.startRendering();
  const b64 = arr => {
    const bytes = new Uint8Array(arr.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  return { l: b64(buffer.getChannelData(0)), r: b64(buffer.getChannelData(1)) };
};
true;
`;

function fromBase64(b64) {
  const buf = Buffer.from(b64, 'base64');
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

async function launchChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ath-sound-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!fs.existsSync(portFile)) {
    chrome.kill();
    throw new Error('Chrome did not start (DevToolsActivePort missing)');
  }
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 512 * 1024 * 1024 });
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  let nextId = 1;
  const pending = new Map();
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const evaluate = expression =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, msg => {
        const result = msg.result;
        if (msg.error || result?.exceptionDetails) {
          reject(new Error(JSON.stringify(msg.error || result.exceptionDetails)));
        } else {
          resolve(result.result.value);
        }
      });
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true },
      }));
    });
  const close = async () => {
    ws.close();
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill();
    await exited;
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // A temporary Chrome profile left behind is harmless.
    }
  };
  return { evaluate, close };
}

function trim(l, r) {
  const level = i => Math.max(Math.abs(l[i]), Math.abs(r[i]));
  let start = 0;
  while (start < l.length && level(start) < START_THRESHOLD) start++;
  let end = l.length - 1;
  while (end > start && level(end) < END_THRESHOLD) end--;
  const fade = Math.round((FADE_OUT_MS / 1000) * SAMPLE_RATE);
  end = Math.min(l.length - 1, end + fade);
  const L = l.slice(start, end + 1);
  const R = r.slice(start, end + 1);
  for (let i = 0; i < fade && i < L.length; i++) {
    const g = i / fade;
    L[L.length - 1 - i] *= g;
    R[R.length - 1 - i] *= g;
  }
  return { L, R };
}

function peakOf({ L, R }) {
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  return peak;
}

function wav({ L, R }, gain) {
  const frames = L.length;
  const data = Buffer.alloc(frames * 4);
  const pcm = v => Math.max(-32768, Math.min(32767, Math.round(v * gain * 32767)));
  for (let i = 0; i < frames; i++) {
    data.writeInt16LE(pcm(L[i]), i * 4);
    data.writeInt16LE(pcm(R[i]), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(2, 22); // stereo
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

async function main() {
  const chrome = await launchChrome();
  const rendered = [];
  try {
    await chrome.evaluate(HARNESS);
    for (const [name, call] of EVENTS) {
      const { l, r } = await chrome.evaluate(
        `__render(${JSON.stringify(name)}, ${JSON.stringify(call)}, ${SAMPLE_RATE}, ${RENDER_SECONDS})`,
      );
      rendered.push({ name, ...trim(fromBase64(l), fromBase64(r)) });
    }
  } finally {
    await chrome.close();
  }

  const loudest = Math.max(...rendered.map(peakOf));
  const gain = 10 ** (PEAK_DBFS / 20) / loudest;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];
  for (const item of rendered) {
    const wavPath = path.join(OUT_DIR, `${item.name}.wav`);
    const cafPath = path.join(OUT_DIR, `${item.name}.caf`);
    fs.writeFileSync(wavPath, wav(item, gain));
    execFileSync('afconvert', ['-f', 'caff', '-d', 'LEI16', wavPath, cafPath]);
    const peak = peakOf(item) * gain;
    rows.push({
      file: item.name,
      seconds: (item.L.length / SAMPLE_RATE).toFixed(2),
      peakDb: (20 * Math.log10(peak)).toFixed(1),
      wavKb: Math.round(fs.statSync(wavPath).size / 1024),
      cafKb: Math.round(fs.statSync(cafPath).size / 1024),
    });
  }
  console.log(`gain ${(20 * Math.log10(gain)).toFixed(1)} dB · ${rows.length} events`);
  console.table(rows);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
