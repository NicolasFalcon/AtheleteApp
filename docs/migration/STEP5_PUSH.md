# Paso 5 · Push en la app

Contrato: `docs/backend/PUSH_SHAPES.md` (única fuente). Estado al 15-10-2026: hecho en código; **sin probar en iPhone**. Verificado: `tsc` y `eslint` limpios, 849 tests (79 suites), bundle de Release y build Debug de iOS (simulador) correctos.

## Librería
`expo-notifications` **56.0.26** (la que fija `bundledNativeModules` del SDK 56). `pod install`: ExpoNotifications 56.0.26.

## Nativo
- El AppDelegate no hereda de `ExpoAppDelegate`. Los *subscribers* de Expo (incluido el de expo-notifications) sí se registran solos (`EXAppDelegatesLoader +load`) y expo-notifications ya pone su `NotificationCenterManager` como delegado de `UNUserNotificationCenter` (toques y notificaciones con la app abierta llegan sin código nuestro). Lo que **no** llegaba eran los callbacks de APNs del `UIApplicationDelegate`.
- Añadido a mano en `AppDelegate.swift` el reenvío a `ExpoAppDelegateSubscriberManager` de: `didRegisterForRemoteNotificationsWithDeviceToken`, `didFailToRegisterForRemoteNotificationsWithError` y `didReceiveRemoteNotification(fetchCompletionHandler:)`. Import: `internal import ExpoModulesCore` (el mismo nivel que `Expo`).
- `aps-environment` (entitlements) y `UIBackgroundModes` (`remote-notification` ya estaba) sin tocar. Ojo: el entitlement dice `development`; para TestFlight / App Store el perfil de distribución con firma automática lo cambia a `production` al archivar.

## Permiso
- Pantalla previa v2 (`PushPermissionHost`, hoja «Entérate cuando importa»): nunca al arrancar. Se pide desde: fin del onboarding (`ProfileSetupCompleteScreen`), primera visita a Comunidad, bandeja social y Notificaciones de Inicio. Una sola vez por persona (`@athelete/push-prompt-asked/<uid>`), solo si el sistema está en «sin preguntar»; «Ahora no» se respeta (queda Ajustes).
- Ajustes › Notificaciones push (nueva pantalla `NotificationSettings`): estado del permiso, «Activar» o «Abrir Ajustes» si está denegado; se refresca al volver de Ajustes del sistema.

## Token
- `getDevicePushTokenAsync` (token APNs nativo, hex) → `register_push_token`. `apns_env`: **production solo en Release con `APP_ENV=production`**, sandbox en el resto (`pushEnv.ts`).
- Se registra al arrancar con sesión, al iniciar sesión, al volver a primer plano y cuando iOS entrega un token nuevo (`addPushTokenListener`).
- `unregister_push_token` **antes** de `signOut` (AuthProvider, `signOutAfterUnregister`, tope de 3 s, nunca bloquea) y antes de eliminar la cuenta.
- La versión de la app no se envía (`_app_version` null): no hay librería de versión instalada; es opcional en el contrato.

## Toque en una notificación
`usePushEvents` (montado en `App.tsx`): toque con la app abierta, en segundo plano o cerrada (`getLastNotificationResponse`, espera a que el navegador esté listo y haya sesión; cada respuesta se procesa una vez).
- friend_request → Amigos · friend_accepted → perfil · post_like / post_comment → detalle del post (si llega como `comment`, el post se lee de la fila de la notificación) · challenge_* y official_* → `SocialChallenge` (la misma pantalla sirve retos de amigos y oficiales) · content_removed → bandeja.
- Si el post o el reto ya no existe (o no se puede leer, o sin red) → bandeja.
- Tipos nuevos añadidos al modelo de la bandeja: challenge_completed, challenge_ending, official_completed, official_new.

## Con la app abierta
Banner del sistema (discreto, sin sonido), salvo si ya estás en esa pantalla (bandeja, o el mismo post / reto / perfil). Invalida las queries `['social']` (bandeja y contador).

## Leídas y badge
- `markNotificationsRead` / `markAllNotificationsRead` usan `mark_notifications_read` (antes UPDATE directo de `read_at`); la UI optimista de la bandeja no cambia.
- `unread` de la respuesta → `setBadgeCountAsync`; además el badge sigue al contador de la campana y baja a 0 al cerrar sesión.

## Ajustes
Social, retos y horas de silencio (inicio/fin con − / +) con `set_push_prefs` **solo con los campos que cambian** (cambios seguidos se agrupan 500 ms; si falla, se devuelve el valor y sale aviso).
**Fallo corregido de paso:** `saveNotificationPrefs` (los 3 interruptores de Ajustes) reescribía todo `notification_prefs` y habría borrado la clave `push`; ahora lee y fusiona.

## Locales
- `localReminders.ts` (planificador puro + `applyReminders`) y `useLocalReminders`: se replanifican al cambiar los datos y al volver a primer plano; solo con permiso concedido; se cancelan al cerrar sesión.
- **Hidratación** (`notification_prefs.hydration`): a las 15:00 y 19:00 solo si, a esa hora, vas por debajo del 50 % / 80 % de la meta; nunca dentro de las horas de silencio.
- **Entreno** (`notification_prefs.workouts`): a las 18:00 los días de entreno, que se ven 3 días hacia delante; hoy no si ya entrenaste; si cae en silencio espera a que termine.
- **Falta en el diseño / datos:** el perfil solo guarda *cuántos* días entrena (`trainingDaysPerWeek`), no *cuáles* ni la hora habitual. Uso un reparto típico (3 → lun/mié/vie…) y las 18:00 (`TODO(design)` en `localReminders.ts`). Hace falta decidir dónde se eligen los días y la hora (¿Ajustes › Mi plan?) para sustituirlo.
- **Ruta (`TODO(push-local)` resuelto):** `RouteActiveScreen` lanza una notificación local de desvío si la app no está en primer plano al salir del recorrido y la retira al volver; en primer plano sigue la vibración.

## Archivos
- **Nuevos:** `docs/backend/PUSH_SHAPES.md`, `services/push/pushService.ts`, `features/push/*` (pushEnv, pushRoute, pushNavigation, pushChecks, pushPermission, pushPromptStore, pushCopy, pushPrefsModel, pushRegistration, pushRuntime, notificationsNative, badge, localReminders, routeDeviationNotice, PushPermissionHost, usePushRegistration, usePushEvents, usePushPrompt, usePushPrefs, useLocalReminders), `screens/profile/NotificationSettingsScreen.tsx`, tests `pushRouting`, `pushService`, `localReminders`.
- **Tocados:** `ios/Athelete/AppDelegate.swift`, `ios/Podfile.lock`, `package.json`, `package-lock.json`, `App.tsx`, `AuthProvider.tsx`, `SettingsScreen.tsx`, `ProfileSetupCompleteScreen.tsx`, `CommunityScreen.tsx`, `SocialNotificationsScreen.tsx`, `NotificationsScreen.tsx`, `RouteActiveScreen.tsx`, `notificationModel.ts`, `supabaseSocialService.ts`, `services/supabase/profile.ts`, `types/auth.ts`, `types/navigation.ts`, `constants/routes.ts`, `RootNavigator.tsx`.
- **Borrados:** ninguno.

## Tests
Mapeo type → pantalla (todos los tipos, entidad ausente, comentario), entidad inexistente → bandeja, banner suprimido en la misma pantalla, `apns_env`, registro/unregister (orden antes de cerrar sesión, fallo no bloquea), `set_push_prefs` parcial y en ráfaga, defaults de prefs, fusión que conserva `push`, `mark_notifications_read`, permiso y horas de silencio, planificador de recordatorios y aviso de desvío.
