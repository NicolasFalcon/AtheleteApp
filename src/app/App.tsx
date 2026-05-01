import { StatusBar } from 'react-native';
import { AppProviders } from '@app/app/AppProviders';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { RootNavigator } from '@app/navigation/RootNavigator';

function AppContent() {
  const {isDark, theme} = useAppTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <RootNavigator />
    </>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
