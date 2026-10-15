import {
  deviceTimezone,
  syncProfileTimezone,
  timezoneUpdateNeeded,
  type TimezoneStore,
} from '../src/features/profile/timezoneSync';

const store = (stored: string | null) => {
  const write = jest.fn(async () => undefined);
  const impl: TimezoneStore = { read: async () => stored, write };
  return { impl, write };
};

describe('timezone', () => {
  it('needs an update when the stored zone is empty or different', () => {
    expect(timezoneUpdateNeeded(null, 'America/Mexico_City')).toBe(true);
    expect(timezoneUpdateNeeded('America/Santiago', 'America/Mexico_City')).toBe(true);
    expect(timezoneUpdateNeeded('America/Mexico_City', 'America/Mexico_City')).toBe(false);
    expect(timezoneUpdateNeeded(null, null)).toBe(false);
  });

  it('writes the device zone only when it differs', async () => {
    const different = store('America/Santiago');
    expect(await syncProfileTimezone('u1', 'America/Mexico_City', different.impl)).toBe('America/Mexico_City');
    expect(different.write).toHaveBeenCalledWith('u1', 'America/Mexico_City');

    const same = store('America/Mexico_City');
    expect(await syncProfileTimezone('u1', 'America/Mexico_City', same.impl)).toBeNull();
    expect(same.write).not.toHaveBeenCalled();

    const empty = store(null);
    await syncProfileTimezone('u1', 'Europe/Madrid', empty.impl);
    expect(empty.write).toHaveBeenCalledWith('u1', 'Europe/Madrid');
  });

  it('does nothing without a device zone, and never throws', async () => {
    const none = store('America/Santiago');
    expect(await syncProfileTimezone('u1', null, none.impl)).toBeNull();
    expect(none.write).not.toHaveBeenCalled();
    const broken: TimezoneStore = {
      read: async () => {
        throw new Error('offline');
      },
      write: async () => undefined,
    };
    await expect(syncProfileTimezone('u1', 'Europe/Madrid', broken)).resolves.toBeNull();
  });

  it('reads the IANA zone of the device from Intl', () => {
    const zone = deviceTimezone();
    expect(zone === null || typeof zone === 'string').toBe(true);
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone: 'America/Bogota' }) }) as unknown as Intl.DateTimeFormat,
    );
    expect(deviceTimezone()).toBe('America/Bogota');
    spy.mockRestore();
  });
});
