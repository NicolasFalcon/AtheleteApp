import type { SocialService } from '@app/services/social/socialService';
import { supabaseSocialService } from '@app/services/social/supabaseSocialService';

// The data source Comunidad uses: always the real one (Supabase).
export function getSocialService(): SocialService {
  return supabaseSocialService;
}
