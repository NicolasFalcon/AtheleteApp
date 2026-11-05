module.exports = api => {
  const isTest = api.env('test');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      !isTest
        ? [
            'module:react-native-dotenv',
            {
              moduleName: '@env',
              path: api.env('production') ? '.env.production' : '.env',
              safe: false,
              allowUndefined: true,
            },
          ]
        : null,
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@app': './src',
          },
        },
      ],
      // Must stay last (Reanimated 4 / worklets).
      'react-native-worklets/plugin',
    ].filter(Boolean),
  };
};
