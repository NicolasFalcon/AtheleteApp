import { NativeModules, TurboModuleRegistry } from 'react-native';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';

const PICKER_UNAVAILABLE_MESSAGE =
  'El selector de fotos no está disponible. Cierra y vuelve a abrir la app después de instalar la versión más reciente.';

function isImagePickerLinked(): boolean {
  return Boolean(
    TurboModuleRegistry.get('ImagePicker') || NativeModules.ImagePicker,
  );
}

export async function openProfilePhotoLibrary(
  options: ImageLibraryOptions,
): Promise<ImagePickerResponse> {
  if (!isImagePickerLinked()) {
    throw new Error(PICKER_UNAVAILABLE_MESSAGE);
  }

  try {
    return await launchImageLibrary(options);
  } catch {
    throw new Error(
      'No pudimos abrir la galería. Revisa el permiso de Fotos e inténtalo nuevamente.',
    );
  }
}
