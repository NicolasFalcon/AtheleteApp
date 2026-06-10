import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasSeenVisualOnboarding,
  markVisualOnboardingAsSeen,
} from '@app/lib/visualOnboarding';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    clear: jest.fn(async () => {
      mockStorage.clear();
    }),
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

describe('visual onboarding persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('starts unseen and persists completion', async () => {
    await expect(hasSeenVisualOnboarding()).resolves.toBe(false);

    await markVisualOnboardingAsSeen();

    await expect(hasSeenVisualOnboarding()).resolves.toBe(true);
  });
});
