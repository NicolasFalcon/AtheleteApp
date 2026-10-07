import {
  fixtureSocialService,
  socialFixtureStore,
} from '@app/services/social/fixtureSocialService';
import type { SocialService } from '@app/services/social/socialService';
import { supabaseSocialService } from '@app/services/social/supabaseSocialService';

// Which data source Comunidad uses. The real app reads Supabase. In `__DEV__`,
// the dev screens ("Ver pantallas de Comunidad", athelete://dev/social) load a
// fixture scenario, which switches the source to the sample data until the app
// reloads; a release build never uses fixtures.
export function usesFixtures(): boolean {
  return __DEV__ && socialFixtureStore.isActive();
}

export function getSocialService(): SocialService {
  return usesFixtures() ? fixtureSocialService : supabaseSocialService;
}
