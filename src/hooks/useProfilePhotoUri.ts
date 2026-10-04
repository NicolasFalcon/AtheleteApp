import { useEffect, useState } from 'react';
import { resolveProfilePhotoUri } from '@app/services/supabase/profile-photo';

// The displayable uri of a stored photo reference (signed URL of the bucket
// or a local file); null while it resolves or when there is none.
export function useProfilePhotoUri(reference?: string | null) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!reference) {
      setUri(null);
      return;
    }
    resolveProfilePhotoUri(reference)
      .then(value => active && setUri(value))
      .catch(() => active && setUri(null));
    return () => {
      active = false;
    };
  }, [reference]);

  return uri;
}
