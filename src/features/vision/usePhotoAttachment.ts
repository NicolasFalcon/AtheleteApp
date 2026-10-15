import { useCallback, useRef, useState } from 'react';
import { uploadVisionImage } from '@app/features/vision/imageUpload';
import type { PickedPhoto } from '@app/features/vision/picker';
import { useAuth } from '@app/hooks/useAuth';

export type PhotoAttachment = {
  // The shrunk local file (preview, no download needed).
  uri: string;
  // Where it is in storage, once uploaded: what is sent as `image_path`.
  path: string | null;
  status: 'uploading' | 'ready' | 'failed';
};

// The photo waiting in the composer of the chat: it is uploaded as soon as it
// is picked (to <uid>/), so sending is just a message with its `image_path`.
export function usePhotoAttachment() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const [attachment, setAttachment] = useState<PhotoAttachment | null>(null);
  const token = useRef(0);
  const source = useRef<string | null>(null);

  const upload = useCallback(
    async (uri: string) => {
      if (!userId) {
        return;
      }
      token.current += 1;
      const mine = token.current;
      source.current = uri;
      setAttachment({ uri, path: null, status: 'uploading' });
      try {
        const sent = await uploadVisionImage({ kind: 'chat', userId, uri });
        if (mine === token.current) {
          setAttachment({ uri: sent.uri, path: sent.path, status: 'ready' });
        }
      } catch {
        if (mine === token.current) {
          setAttachment({ uri, path: null, status: 'failed' });
        }
      }
    },
    [userId],
  );

  const attach = useCallback((photo: PickedPhoto) => upload(photo.uri), [upload]);
  const retry = useCallback(() => (source.current ? upload(source.current) : Promise.resolve()), [upload]);
  const clear = useCallback(() => {
    token.current += 1;
    source.current = null;
    setAttachment(null);
  }, []);

  return { attachment, attach, retry, clear };
}
