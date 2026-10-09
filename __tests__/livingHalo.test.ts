import {
  HALO_SETTLE_MS,
  HALO_SIZES,
  HALO_TARGETS,
  haloKey,
  haloLabel,
  haloMayAnimate,
  resolveHaloSize,
  resolveHaloTargets,
} from '../src/components/v2/livingHaloModel';
import {
  VOICE_ORDER,
  isVoiceBusy,
  nextVoiceState,
} from '../src/features/ellie/v2/voiceSceneModel';

describe('Living Halo · states', () => {
  it('resolves named sizes and passes numbers through', () => {
    expect(resolveHaloSize('mini')).toBe(HALO_SIZES.mini);
    expect(resolveHaloSize('voice')).toBe(176);
    expect(resolveHaloSize(40)).toBe(40);
  });

  it('settles with the handoff times', () => {
    expect(HALO_SETTLE_MS).toEqual({
      idle: 550,
      listening: 300,
      thinking: 300,
      speaking: 250,
    });
  });

  it('keeps speaking halo under 17 % and the arc fully lit only when thinking', () => {
    expect(HALO_TARGETS.speaking.halo).toBeLessThanOrEqual(0.17);
    expect(HALO_TARGETS.thinking.arc).toBe(1);
    expect(HALO_TARGETS.idle.halo).toBe(0);
    expect(HALO_TARGETS.listening.ring).toBeGreaterThan(HALO_TARGETS.idle.ring);
  });

  it('renders offline as the still idle sphere', () => {
    expect(haloKey('offline')).toBe('idle');
    expect(haloLabel('offline')).toBe('ELLIE sin conexión');
  });

  it('tab mode: inactive has no glow, active a soft halo, neither breathes', () => {
    const off = resolveHaloTargets('idle', { enabled: true, active: false });
    const on = resolveHaloTargets('idle', { enabled: true, active: true });
    expect(off.halo).toBe(0);
    expect(off.breath).toBe(0);
    expect(on.halo).toBeGreaterThan(0);
    expect(on.halo).toBeLessThanOrEqual(0.19);
    expect(on.breath).toBe(0);
    // Outside tab mode the state wins.
    expect(resolveHaloTargets('thinking', { enabled: false, active: true })).toBe(
      HALO_TARGETS.thinking,
    );
  });

  it('only animates loops when motion is allowed', () => {
    expect(haloMayAnimate({ state: 'idle', tab: false, reduceMotion: false })).toBe(true);
    expect(haloMayAnimate({ state: 'idle', tab: false, reduceMotion: true })).toBe(false);
    expect(haloMayAnimate({ state: 'idle', tab: true, reduceMotion: false })).toBe(false);
    expect(haloMayAnimate({ state: 'offline', tab: false, reduceMotion: false })).toBe(false);
  });
});

describe('Voice scene · state walk', () => {
  it('goes idle → listening → thinking → speaking → idle', () => {
    expect(VOICE_ORDER.map(s => s)).toEqual(['idle', 'listening', 'thinking', 'speaking']);
    expect(nextVoiceState('idle')).toBe('listening');
    expect(nextVoiceState('listening')).toBe('thinking');
    expect(nextVoiceState('thinking')).toBe('speaking');
    expect(nextVoiceState('speaking')).toBe('idle');
  });

  it('shows the stop button in every state but idle', () => {
    expect(isVoiceBusy('idle')).toBe(false);
    expect(isVoiceBusy('listening')).toBe(true);
    expect(isVoiceBusy('speaking')).toBe(true);
  });
});
