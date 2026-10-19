import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockService = {
  getSavedRoutes: jest.fn(async () => [{ id: 'r1' }, { id: 'r2' }]),
  getActivity: jest.fn(async (id: string) => ({ id, points: [] })),
  generateRoute: jest.fn(async () => ({ id: 'g1', points: [] })),
};
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ session: { user: { id: 'u1' } } }) }));
jest.mock('../src/services/route/useRouteService', () => ({ getRouteService: () => mockService }));

import {
  generateRouteKey,
  useGeneratedRoute,
  usePlannedRoutes,
  useRouteActivity,
} from '../src/features/route/useRouteData';
import type { RouteActivity, RouteGenerationParams } from '../src/features/route/routeTypes';

const settle = async () => {
  for (let i = 0; i < 8; i += 1) {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
};

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});

function mount(hook: () => unknown) {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  const Probe = () => {
    hook();
    return null;
  };
  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  return () => act(() => renderer!.unmount());
}

const params = (lat: number, seed = 0): RouteGenerationParams => ({
  sport: 'running',
  origin: { lat, lon: -70.66 },
  targetKm: 5,
  kind: 'loop',
  elevation: 'low',
  surface: 'any',
  seed,
});

afterAll(() => client.clear());

describe('Ruta: entering a second time does not ask again (B-13)', () => {
  it('Tus rutas: one call for two visits', async () => {
    let leave = mount(() => usePlannedRoutes());
    await act(settle);
    leave();
    leave = mount(() => usePlannedRoutes());
    await act(settle);
    leave();
    expect(mockService.getSavedRoutes).toHaveBeenCalledTimes(1);
  });

  it('an activity already in memory (just finished) is not fetched; another one once', async () => {
    const finished = { id: 'a1', points: [] } as unknown as RouteActivity;
    let leave = mount(() => useRouteActivity('a1', finished));
    await act(settle);
    leave();
    expect(mockService.getActivity).not.toHaveBeenCalled();
    leave = mount(() => useRouteActivity('a2'));
    await act(settle);
    leave();
    leave = mount(() => useRouteActivity('a2'));
    await act(settle);
    leave();
    expect(mockService.getActivity).toHaveBeenCalledTimes(1);
  });

  it('generate-route: same rounded origin and parameters → answered from memory', async () => {
    expect(generateRouteKey(params(-33.45012))).toEqual(generateRouteKey(params(-33.45031)));
    expect(generateRouteKey(params(-33.452))).not.toEqual(generateRouteKey(params(-33.45)));
    let leave = mount(() => useGeneratedRoute(params(-33.45012)));
    await act(settle);
    leave();
    leave = mount(() => useGeneratedRoute(params(-33.45031)));
    await act(settle);
    leave();
    expect(mockService.generateRoute).toHaveBeenCalledTimes(1);
    // "Otra opción" (another seed) is a new request; going back to seed 0 is not.
    leave = mount(() => useGeneratedRoute(params(-33.45, 1)));
    await act(settle);
    leave();
    leave = mount(() => useGeneratedRoute(params(-33.45, 0)));
    await act(settle);
    leave();
    expect(mockService.generateRoute).toHaveBeenCalledTimes(2);
  });
});
