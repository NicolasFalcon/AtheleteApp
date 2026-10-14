import { isRouteSession, sessionDisplayTitle } from '../src/shared/domain/types';

describe('sessions with source = route', () => {
  it('reads as Ruta, never as an empty routine', () => {
    expect(isRouteSession({ source: 'route' })).toBe(true);
    expect(isRouteSession({ source: null })).toBe(false);
    expect(isRouteSession({})).toBe(false);
    expect(sessionDisplayTitle({ source: 'route', workoutTitle: '' })).toBe('Ruta');
    expect(sessionDisplayTitle({ source: 'route', workoutTitle: '  ' })).toBe('Ruta');
    expect(sessionDisplayTitle({ source: 'route', workoutTitle: 'Carrera de tarde' })).toBe('Carrera de tarde');
    expect(sessionDisplayTitle({ source: null, workoutTitle: 'Pierna' })).toBe('Pierna');
  });
});
