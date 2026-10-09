import { isWearDevScreen, openWearDevScreen } from '@app/dev/devWearScreens';
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
import { cycleHomeModeOverride } from '@app/dev/homeModeOverride';
import {
  isWorkoutsDevScreen,
  openNextWorkoutsDevScreen,
  openWorkoutsDevScreen,
} from '@app/dev/devWorkoutsScreens';
import {
  isProgressDevScreen,
  openNextProgressDevScreen,
  openProgressDevScreen,
} from '@app/dev/devProgressScreens';
import {
  isCore33DevScreen,
  openCore33DevScreen,
  openNextCore33DevScreen,
} from '@app/dev/devCore33Screens';
import {
  isQuizDevScreen,
  openNextQuizDevScreen,
  openQuizDevScreen,
} from '@app/dev/devQuizScreens';
import {
  isSocialDevScreen,
  openNextSocialDevScreen,
  openSocialDevScreen,
} from '@app/dev/devSocialScreens';
import {
  isNutritionDevScreen,
  openNextNutritionDevScreen,
  openNutritionDevScreen,
} from '@app/dev/devNutritionScreens';
import {
  isProfileDevScreen,
  openNextProfileDevScreen,
  openProfileDevScreen,
} from '@app/dev/devProfileScreens';
import {
  isEllieDevScreen,
  openEllieDevScreen,
  openNextEllieDevScreen,
} from '@app/dev/devEllieScreens';
import {
  isSessionDevScreen,
  openNextSessionDevScreen,
  openSessionDevScreen,
} from '@app/dev/devSessionScreens';
import { resetCore33InviteDismissals } from '@app/features/core33/useCore33InviteDismissals';
import { DevCore33CardPreview } from '@app/dev/DevCore33CardPreview';
import { V2CatalogScreen } from '@app/dev/V2CatalogScreen';

type DevTool = 'catalog' | 'onboarding' | 'core33Card';

type DevToolState = {
  tool: DevTool;
  start?: WalkthroughStart;
  darkFirst?: boolean;
};

const DEV_URLS = {
  catalog: 'athelete://dev/catalog',
  onboarding: 'athelete://dev/onboarding',
  welcome: 'athelete://dev/welcome',
  core33Card: 'athelete://dev/core33-card',
} as const;

function queryParam(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// athelete://dev/catalog
// athelete://dev/onboarding[?step=0…8]
// athelete://dev/welcome[?status=error]
// athelete://dev/workouts?screen=<key>[&zone=<key>]: navigates (no overlay).
function openWorkoutsFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/workouts')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'routines';
  if (isWorkoutsDevScreen(screen)) {
    openWorkoutsDevScreen(screen, { zone: queryParam(url, 'zone') }).catch(
      () => {},
    );
  }
  return true;
}

// athelete://dev/session?screen=<key>: navigates (no overlay).
function openSessionFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/session')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'active';
  if (isSessionDevScreen(screen)) {
    openSessionDevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/progress?screen=<key>: navigates (no overlay).
function openProgressFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/progress')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'summary';
  if (isProgressDevScreen(screen)) {
    openProgressDevScreen(screen, {
      scroll: Number(queryParam(url, 'scroll')) || undefined,
    }).catch(() => {});
  }
  return true;
}

// athelete://dev/ellie?screen=<key>: navigates (no overlay).
function openEllieFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/ellie')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'home';
  if (isEllieDevScreen(screen)) {
    openEllieDevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/profile?screen=<key>: navigates (no overlay).
function openProfileFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/profile')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'profile';
  if (isProfileDevScreen(screen)) {
    openProfileDevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/nutrition?screen=<key>: navigates (no overlay).
function openNutritionFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/nutrition')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'real';
  if (isNutritionDevScreen(screen)) {
    openNutritionDevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/core33?screen=<key>: navigates (no overlay).
function openCore33FromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/core33')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'day17';
  if (isCore33DevScreen(screen)) {
    openCore33DevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/quiz?screen=<key>: navigates (no overlay).
function openQuizFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/quiz')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'data';
  if (isQuizDevScreen(screen)) {
    openQuizDevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/wear?screen=<key>: navigates (no overlay).
function openWearFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/wear')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'collection';
  if (isWearDevScreen(screen)) {
    openWearDevScreen(screen).catch(() => {});
  }
  return true;
}

// athelete://dev/social?screen=<key>: navigates (no overlay).
function openSocialFromUrl(url: string | null): boolean {
  if (!url || !url.startsWith('athelete://dev/social')) {
    return false;
  }
  const screen = queryParam(url, 'screen') ?? 'friends';
  if (isSocialDevScreen(screen)) {
    openSocialDevScreen(screen).catch(() => {});
  }
  return true;
}

function toolFromUrl(url: string | null): DevToolState | null {
  if (
    !url ||
    openWorkoutsFromUrl(url) ||
    openSessionFromUrl(url) ||
    openProgressFromUrl(url) ||
    openEllieFromUrl(url) ||
    openProfileFromUrl(url) ||
    openNutritionFromUrl(url) ||
    openCore33FromUrl(url) ||
    openQuizFromUrl(url) ||
    openSocialFromUrl(url) ||
    openWearFromUrl(url)
  ) {
    return null;
  }
  if (url.startsWith(DEV_URLS.catalog)) {
    return { tool: 'catalog' };
  }
  if (url.startsWith(DEV_URLS.core33Card)) {
    return {
      tool: 'core33Card',
      darkFirst: queryParam(url, 'mode') === 'dark',
    };
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
      const override = cycleHomeModeOverride();
      toastRef.current.show(
        override
          ? `Inicio · ${override.label} (vista dev)`
          : 'Inicio · modo real',
      );
    });
    DevSettings.addMenuItem('Ver pantallas de Entrenos', () => {
      openNextWorkoutsDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Entrenos · ${label}` : 'Inicia sesión para ver Entrenos',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Progreso', () => {
      openNextProgressDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Progreso · ${label}` : 'Inicia sesión para ver Progreso',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de ELLIE', () => {
      openNextEllieDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `ELLIE · ${label}` : 'Inicia sesión para ver ELLIE',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Core 33', () => {
      openNextCore33DevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Core 33 · ${label}` : 'Inicia sesión para ver Core 33',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Quiz', () => {
      openNextQuizDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Quiz · ${label}` : 'Inicia sesión para ver Quiz',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Comunidad', () => {
      openNextSocialDevScreen()
        .then(label =>
          toastRef.current.show(
            label
              ? `Comunidad · ${label}`
              : 'Inicia sesión para ver Comunidad',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Nutrición', () => {
      openNextNutritionDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Nutrición · ${label}` : 'Inicia sesión para ver Nutrición',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Perfil', () => {
      openNextProfileDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Perfil · ${label}` : 'Inicia sesión para ver Perfil',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    DevSettings.addMenuItem('Ver pantallas de Sesión', () => {
      openNextSessionDevScreen()
        .then(label =>
          toastRef.current.show(
            label ? `Sesión · ${label}` : 'Inicia sesión para ver la Sesión',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo abrir la pantalla'));
    });
    // Clears the "Ahora no" of the Core 33 card (signed-in user); Inicio
    // shows it again right away.
    DevSettings.addMenuItem('Restablecer card de Core 33', () => {
      resetCore33InviteDismissals()
        .then(done =>
          toastRef.current.show(
            done
              ? 'Card de Core 33 restablecida'
              : 'Inicia sesión para restablecer la card',
          ),
        )
        .catch(() => toastRef.current.show('No se pudo restablecer la card'));
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
      ) : state.tool === 'core33Card' ? (
        <DevCore33CardPreview
          darkFirst={state.darkFirst}
          onClose={() => setState(null)}
        />
      ) : (
        <DevOnboardingWalkthrough
          start={state.start}
          onClose={() => setState(null)}
        />
      )}
    </View>
  );
}
