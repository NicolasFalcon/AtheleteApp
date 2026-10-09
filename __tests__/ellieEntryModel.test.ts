import {
  ELLIE_ENTRY,
  blockFrame,
  haloFrame,
  tabIconCenterY,
} from '../src/features/ellie/v2/ellieEntryModel';

describe('ELLIE cover entry (prototype values)', () => {
  it('uses the prototype timings', () => {
    expect(ELLIE_ENTRY.halo.duration).toBe(520);
    expect(ELLIE_ENTRY.halo.bezier).toEqual([0.22, 0.9, 0.24, 1]);
    expect(ELLIE_ENTRY.block).toMatchObject({ duration: 500, delay: 100, rise: 10 });
  });

  it('the halo starts at the tab (24 pt, 90 %) and ends in place (128 pt)', () => {
    const start = haloFrame(0, 780, 200);
    expect(start.scale).toBeCloseTo(24 / 128);
    expect(start.opacity).toBeCloseTo(0.9);
    expect(start.translateY).toBe(580);
    expect(haloFrame(1, 780, 200)).toEqual({ translateY: 0, scale: 1, opacity: 1 });
  });

  it('label, voice and answers rise 10 pt as one block', () => {
    expect(blockFrame(0)).toEqual({ translateY: 10, opacity: 0 });
    expect(blockFrame(1)).toEqual({ translateY: 0, opacity: 1 });
  });

  it('finds the tab icon from the floating bar', () => {
    expect(tabIconCenterY(852, 24, 64)).toBe(788);
  });
});
