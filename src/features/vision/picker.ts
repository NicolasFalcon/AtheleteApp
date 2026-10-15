import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// The system picker / camera (react-native-image-picker): one photo or nothing.
// The result is shrunk and re-encoded by imageUpload.ts before it leaves the
// phone, so HEIC and big originals are fine here.
export type PickedPhoto = { uri: string; width?: number; height?: number };

const OPTIONS = {
  mediaType: 'photo' as const,
  selectionLimit: 1,
  includeBase64: false,
  includeExtra: false,
  // Keeps the original quality: we compress ourselves.
  quality: 1 as const,
};

function first(result: { assets?: { uri?: string; width?: number; height?: number }[] }): PickedPhoto | null {
  const asset = result.assets?.[0];
  return asset?.uri ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

export async function pickFromGallery(): Promise<PickedPhoto | null> {
  try {
    return first(await launchImageLibrary(OPTIONS));
  } catch {
    return null;
  }
}

export async function takeWithSystemCamera(): Promise<PickedPhoto | null> {
  try {
    return first(await launchCamera({ ...OPTIONS, saveToPhotos: false }));
  } catch {
    return null;
  }
}
