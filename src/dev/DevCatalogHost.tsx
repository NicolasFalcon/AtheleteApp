import { useEffect, useRef, useState } from 'react';
import {
  DevSettings,
  Linking,
  Platform,
  Settings,
  StyleSheet,
  View,
} from 'react-native';
import { useToast } from '@app/components/v2';
import {
  DevOnboardingWalkthrough,
  type WalkthroughStart,
} from '@app/dev/DevOnboardingWalkthrough';
import {
  HOME_MODE_LABELS,
  cycleHomeModeOverride,
} from '@app/dev/homeModeOverride';
import { V2CatalogScreen } from '@app/dev/V2CatalogScreen';

type DevTool = 'catalog' | 'onboarding';

type DevToolState = { tool: DevTool; start?: WalkthroughStart };

const DEV_URLS = {
  catalog: 'athelete://dev/catalog',
  onboarding: 'athelete://dev/onboarding',
  welcome: 'athelete://dev/welcome',
} as const;

function queryParam(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// athelete://dev/catalog
// athelete://dev/onboarding[?step=0…7]
// athelete://dev/welcome[?status=error]
function toolFromUrl(url: string | null): DevToolState | null {
  if (!url) {
    return null;
  }
  if (url.startsWith(DEV_URLS.catalog)) {
    return { tool: 'catalog' };
  }
  if (url.startsWith(DEV_URLS.welcome)) {
    return {
      tool: 'onboarding',
      start: { welcome: true, failSave: queryParam(url, 'status') === 'error' },
    };
  }
  if (url.startsWith(DEV_URLS.onboarding)) {
    const step = queryParam(url, 'step');
    return {
      tool: 'onboarding',
      start: step !== null ? { step: Number(step) } : undefined,
    };
  }
  return null;
}

// Development-only tools, rendered as an overlay above the navigator (inside
// the toast provider) so they do not touch navigation or existing screens.
// Open them from the React Native dev menu ("Catálogo v2", "Recorrer
// onboarding") or with `xcrun simctl openurl booted athelete://dev/<tool>`
// (see toolFromUrl for the onboarding / welcome query parameters).
export function DevCatalogHost() {
  const [state, setState] = useState<DevToolState | null>(null);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    DevSettings.addMenuItem('Catálogo v2', () => setState({ tool: 'catalog' }));
    DevSettings.addMenuItem('Recorrer onboarding', () =>
      setState({ tool: 'onboarding' }),
    );
    // Visual override only: cycles the Inicio hero modes, writes nothing.
    DevSettings.addMenuItem('Ver modos de Inicio', () => {
      const mode = cycleHomeModeOverride();
      toastRef.current.show(
        mode
          ? `Inicio · ${HOME_MODE_LABELS[mode]} (vista dev)`
          : 'Inicio · modo real',
      );
    });

    // iOS launch argument (no "Open in…" prompt), e.g.
    // xcrun simctl launch booted <bundle> -devTool athelete://dev/welcome
    const launchTool =
      Platform.OS === 'ios'
        ? toolFromUrl(Settings.get('devTool') ?? null)
        : null;
    if (launchTool) {
      setState(launchTool);
    }

    Linking.getInitialURL()
      .then(url => {
        const initial = toolFromUrl(url);
        if (initial) {
          setState(initial);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      const next = toolFromUrl(event.url);
      if (next) {
        // New key so a second link remounts the tool at its start.
        setState(null);
        setTimeout(() => setState(next), 0);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!state) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {state.tool === 'catalog' ? (
        <V2CatalogScreen onClose={() => setState(null)} />
      ) : (
        <DevOnboardingWalkthrough
          start={state.start}
          onClose={() => setState(null)}
        />
      )}
    </View>
  );
}
