module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@env$': '<rootDir>/src/types/__mocks__/env.ts',
  },
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|react-native|@react-navigation|@react-native-async-storage|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-url-polyfill|@supabase/supabase-js)/)',
  ],
};
