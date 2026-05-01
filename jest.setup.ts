jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  const insets = {top: 0, left: 0, right: 0, bottom: 0};
  const frame = {x: 0, y: 0, width: 390, height: 844};
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);

  return {
    SafeAreaFrameContext,
    SafeAreaInsetsContext,
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      React.createElement(
        SafeAreaFrameContext.Provider,
        {value: frame},
        React.createElement(
          SafeAreaInsetsContext.Provider,
          {value: insets},
          React.createElement(View, null, children),
        ),
      ),
    SafeAreaView: ({children, ...props}: {children: React.ReactNode}) =>
      React.createElement(View, props, children),
    initialWindowMetrics: {
      frame,
      insets,
    },
    useSafeAreaFrame: () => frame,
    useSafeAreaInsets: () => insets,
  };
});

jest.mock('react-native-screens', () => {
  const React = require('react');
  const {View} = require('react-native');

  const MockScreen = ({children}: {children: React.ReactNode}) =>
    React.createElement(View, null, children);

  return {
    enableScreens: jest.fn(),
    Screen: MockScreen,
    ScreenContainer: MockScreen,
    NativeScreen: MockScreen,
    ScreenStack: MockScreen,
    ScreenStackHeaderConfig: MockScreen,
    ScreenStackHeaderSubview: MockScreen,
  };
});
