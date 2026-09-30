import { useEffect, useState } from 'react';
import { DevSettings, Linking, StyleSheet, View } from 'react-native';
import { V2CatalogScreen } from '@app/dev/V2CatalogScreen';

const CATALOG_URL = 'athelete://dev/catalog';

function isCatalogUrl(url: string | null): boolean {
  return Boolean(url && url.startsWith(CATALOG_URL));
}

// Development-only entry to the v2 primitives catalog. Rendered as an overlay
// above the navigator (inside the sheet and toast providers) so it does not
// touch navigation or existing screens. Open it from the React Native dev menu
// ("Catálogo v2") or with `xcrun simctl openurl booted athelete://dev/catalog`.
export function DevCatalogHost() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    DevSettings.addMenuItem('Catálogo v2', () => setVisible(true));

    Linking.getInitialURL()
      .then(url => {
        if (isCatalogUrl(url)) {
          setVisible(true);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      if (isCatalogUrl(event.url)) {
        setVisible(true);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <V2CatalogScreen onClose={() => setVisible(false)} />
    </View>
  );
}
