# SOCIAL_B_CHECKPOINT · Comunidad · tanda UI-B (personas) · 2026-10-06

**Estado:** ✅ COMPLETADO (capturas Light/Dark hechas y comparadas, 2026-10-07)

Alcance: `docs/migration/SOCIAL_PLAN.md` (tanda B + bloquear). Solo interfaz con datos de ejemplo: **sin lecturas ni escrituras al backend**. Sin commits, sin dependencias nuevas.

## Reglas de esta tanda
- Fuente visual única: `migration-source/ATHELETE Alive Minimalism/` (SOCIAL_05, SOCIAL_06, SOCIAL_14, STATE_04 + hub de `Social.dc.html`).
- Datos: `src/dev/socialFixtures.ts` con tipos que coinciden con `supabase.ts` y las RPC sociales.
- Acciones tras la interfaz `SocialService` (`services/social/socialService.ts`) con `TODO(social-wire)`.
- Foto de perfil: a quien no es amigo solo iniciales (DA-xx), nunca la foto real.
- Sección 8 de SOCIAL_PLAN: tolerar filas ausentes de `get_social_profiles` y respetar las reglas de negocio.
- BT-43: `src/constants/legal.ts` con `TERMS_URL` y `SUPPORT_EMAIL` placeholder (`TODO(testflight)`).

## Plan
- [x] 0 · Modelo puro, tipos, servicio, fixtures y tests (usuario, relación y acciones).
- [x] 1 · Primitivos v2: `AvatarStack`, `PersonRow`, `PersonAvatar`.
- [x] 2 · Hub de Comunidad (Feed · Retos · Amigos) con Feed y Retos como placeholder.
- [x] 3 · Amigos: lista, solicitudes recibidas y enviadas, búsqueda por usuario exacto, estados (sin amigos, sin resultados, cargando, error).
- [x] 4 · Elegir o editar nombre de usuario.
- [x] 5 · Perfil de otro usuario (todos los estados de relación y privacidad).
- [x] 6 · Privacidad social.
- [x] 7 · Invitar amigos.
- [x] 8 · Bloquear (confirmación) y lista de bloqueados.
- [x] 9 · Herramientas dev (`athelete://dev/social?screen=…`, menú "Ver pantallas de Comunidad").
- [x] 10 · Ajustes → filas de Comunidad activas; MIGRATION_PROGRESS (DA, D, TODO(social-wire)); BACKEND_TODO (BT-43).
- [x] 11 · tsc, eslint, jest y capturas Light/Dark.

## Hecho
- 0 · `features/social/{socialTypes,socialModel,useSocial}.ts`, `services/social/{socialService,fixtureSocialService}.ts`, `dev/socialFixtures.ts` (8 escenarios), `constants/legal.ts`. Test `socialModel.test.ts` (28 casos: usuario, relación y acciones, foto, perfil, lista, privacidad, invitaciones).
- 1 · `PersonAvatar` (foto real solo si amigo), `AvatarStack`, `PersonRow` + `PersonStateButton` + `PersonRequestActions` en `components/v2`.
- 2 · Hub `screens/tabs/CommunityScreen.tsx`: cabecera, Segmented Feed · Retos · Amigos con insignias; Feed (STATE_04 sin amigos / placeholder) y Retos (placeholder). Puerta del nombre de usuario.
- 3 · `features/social/v2/FriendsView.tsx`: recibidas, amigos, enviadas, búsqueda exacta, cargando, error, sin amigos, sin resultados.
- 4 · `SocialUsernameScreen` (crear / editar).
- 5 · `SocialProfileScreen` (relaciones: amigos, ninguna, cerrada, enviada, recibida, bloqueado, perfil ausente) + `ProfileParts`.
- 6 · `SocialPrivacyScreen` (audiencia, 7 interruptores, vista previa, cuenta social, legal).
- 8 · Bloquear (hoja de confirmación en el perfil) y `SocialBlockedScreen`.
- 7 · `SocialInviteScreen` (enlace de un uso, compartir usuario, enlaces activos, límite de 5).
- 9 · `dev/devSocialScreens.ts` (36 estados), URL `athelete://dev/social?screen=<key>` y menú "Ver pantallas de Comunidad" en `DevCatalogHost`.
- 10 · Ajustes: "Amigos y retos" y "Privacidad social" activas. `MIGRATION_PROGRESS` (DA-119 a DA-125, D-79 a D-87, lista de `TODO(social-wire)`). `BACKEND_TODO`: BT-43 (se cierra antes de TestFlight).
- 11 · `tsc` limpio; `jest` 33 suites / 269 tests (28 nuevos en `socialModel.test.ts`); `eslint` sin errores nuevos (el único error, `QuizResultScreen.tsx:124` react-hooks/exhaustive-deps, es anterior a esta tanda).

## Capturas (2026-10-07)
Hechas: 36 estados × Light y Dark = 72 PNG en `~/athelete-captures/social/` (fuera del repo). Las pantallas dev con datos de ejemplo abren **sin sesión** (solo `__DEV__`): `RootNavigator` las registra en el flujo de auth y `DevFixtureTabs` pone la tab bar real con solo Comunidad.

Método (el modo no se cambia con `simctl ui appearance`: la app lo lee de un argumento de arranque):
```
BID='org.reactjs.native.--PRODUCT-NAME-rfc1034identifier-'
for mode in light dark; do
  xcrun simctl terminate booted $BID; xcrun simctl launch booted $BID -themeMode $mode; sleep 14
  for key in <claves de devSocialScreens.ts>; do
    xcrun simctl openurl booted "athelete://dev/social?screen=$key"; sleep 2.5
    xcrun simctl io booted screenshot ~/athelete-captures/social/${key}_${mode}.png
  done
done
```

Comparación con la referencia (Light y Dark):
- **SOCIAL_05 · Amigos (`friends`)**: cabecera, segmentos con insignias, grupos y filas coinciden. Diferencias: placeholder "Buscar por nombre de usuario" (D-85); línea de ayuda bajo la búsqueda (no está en el diseño); solicitudes con "@usuario" en lugar de "3 amigos en común" (BT-46); avatares ilustrados / iniciales en lugar de fotos (DA-119); "Aceptar" sin icono, como el diseño.
- **SOCIAL_06 · Perfil (`profileFriend`)**: trío, récords con "NUEVO", retos en común y actividad coinciden; hero sin foto (D-80) y botón "Amigos" en vidrio con "Retar" blanco, como el diseño. En Dark la tarjeta de actividad lleva un filete de 1 pt porque la placa casi se funde con el fondo.
- **SOCIAL_14 · Privacidad (`privacy`)**: coincide (audiencia, 7 filas, interruptor de peso apagado, "Así te ven tus amigos"); el control de audiencia sin iconos (D-86). Añade las filas de cuenta social y normas (D-82).
- **STATE_04 · Feed sin amigos (`feedEmpty`)**: título, frase, "Buscar amigos" y "Invitar con un enlace" (icono de compartir a la izquierda) coinciden; los tres retratos son círculos neutros (nadie es amigo). Sin la tarjeta "Mientras tanto" (reto oficial, tanda C) ni la flecha atrás (es una pestaña).
- Sin referencia (D-79, D-81, D-83): nombre de usuario, invitar, bloqueados y los estados de error, cargando y vacío.

Cambios hechos a partir de las capturas: botones del hero en vidrio, barra de estado clara sobre el hero, sin iniciales en los retratos vacíos, sin icono en "Aceptar", `POP_TO_TOP` de las herramientas dev, tokens de invitación distintos y la línea de privacidad de un perfil público.
