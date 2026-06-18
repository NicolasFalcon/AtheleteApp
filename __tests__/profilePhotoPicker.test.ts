jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

import { NativeModules, TurboModuleRegistry } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { openProfilePhotoLibrary } from '../src/lib/profilePhotoPicker';

const mockedLaunchImageLibrary = launchImageLibrary as jest.MockedFunction<
  typeof launchImageLibrary
>;

describe('profile photo picker', () => {
  const getSpy = jest.spyOn(TurboModuleRegistry, 'get');

  beforeEach(() => {
    mockedLaunchImageLibrary.mockReset();
    getSpy.mockReturnValue({} as never);
  });

  afterAll(() => {
    getSpy.mockRestore();
  });

  it('opens the linked native photo library', async () => {
    mockedLaunchImageLibrary.mockResolvedValue({ didCancel: true });

    await expect(
      openProfilePhotoLibrary({ mediaType: 'photo' }),
    ).resolves.toEqual({ didCancel: true });
  });

  it('returns a controlled error when the native module is missing', async () => {
    getSpy.mockReturnValue(null);
    const previousModule = NativeModules.ImagePicker;
    NativeModules.ImagePicker = null;

    await expect(
      openProfilePhotoLibrary({ mediaType: 'photo' }),
    ).rejects.toThrow('El selector de fotos no está disponible');

    NativeModules.ImagePicker = previousModule;
  });
});
