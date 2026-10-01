import { useEffect, useState } from 'react';
import { DevSettings, Linking, StyleSheet, View } from 'react-native';
import { DevOnboardingWalkthrough } from '@app/dev/DevOnboardingWalkthrough';
import { V2CatalogScreen } from '@app/dev/V2CatalogScreen';

type DevTool = 'catalog' | 'onboarding';

const DEV_URLS: Record<DevTool, string> = {
  catalog: 'athelete://dev/catalog',
  onboarding: 'athelete://dev/onboarding',
};

function toolFromUrl(url: string | null): DevTool | null {
  if (!url) {
    return null;
  }
  const match = (Object.keys(DEV_URLS) as DevTool[]).find(tool =>
    url.startsWith(DEV_URLS[tool]),
  );
  return match ?? null;
}

// Development-only tools, rendered as an overlay above the navigator (inside
// the toast provider) so they do not touch navigation or existing screens.
// Open them from the React Native dev menu ("Catálogo v2", "Recorrer
// onboarding") or with `xcrun simctl openurl booted athelete://dev/<tool>`.
export function DevCatalogHost() {
  const [tool, setTool] = useState<DevTool | null>(null);

  useEffect(() => {
    DevSettings.addMenuItem('Catálogo v2', () => setTool('catalog'));
    DevSettings.addMenuItem('Recorrer onboarding', () => setTool('onboarding'));

    Linking.getInitialURL()
      .then(url => {
        const initial = toolFromUrl(url);
        if (initial) {
          setTool(initial);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      const next = toolFromUrl(event.url);
      if (next) {
        setTool(next);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!tool) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {tool === 'catalog' ? (
        <V2CatalogScreen onClose={() => setTool(null)} />
      ) : (
        <DevOnboardingWalkthrough onClose={() => setTool(null)} />
      )}
    </View>
  );
}
