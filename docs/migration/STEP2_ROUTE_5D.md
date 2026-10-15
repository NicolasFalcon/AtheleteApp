# Paso 2 · Ruta 5d · GPS real — reconocimiento y plan

Estado observado el 14-10-2026. Solo lectura del árbol y consulta de metadatos/tarballs de npm (descargados a una carpeta temporal, **no instalados**). No se cambió código, dependencias ni configuración. Decisiones cerradas respetadas: permiso solo «Al usar la app», `UIBackgroundModes=location` + indicador azul, recorte de 200 m, desvío 40 m / 60 m durante 10 s.

## Resumen ejecutivo

1. **Expo no está en el proyecto** (ni `expo`, ni `expo-modules-core`; el único hit es `exponential-backoff`). Instalarlo es viable pero **no trivial**: obliga a subir el iOS mínimo de 15.1 a **16.4**, a cambiar la fábrica de React Native del `AppDelegate`, a tocar el `Podfile`, y hay un **conflicto de versiones con Reanimated/Worklets** (ver §1).
2. La interfaz `LocationSource` ya es adecuada; una `RealLocationSource` encaja **casi sin tocar pantallas**. Hacen falta 3 ajustes pequeños en la interfaz (§2).
3. **Dos riesgos que hoy pierden datos** y que el plan debe cubrir sí o sí: (a) el servidor rechaza la actividad entera por `impossible_speed` si el trazado trae un salto GPS, y la pantalla solo muestra un aviso y descarta lo grabado; (b) el estado de la grabación vive solo en memoria (`useReducer`): si el sistema cierra la app a mitad de ruta se pierde todo.
4. Hay restos de la simulación fuera del motor (centro del mapa en Palermo, «GPS ±3 m» fijo) que hay que limpiar en el mismo paso.

---

## 1. Librería

### Estado actual
- `package.json`: React Native **0.85.2**, React 19.2.3, Reanimated ~4.6.0, Worklets ^0.12.2, MapLibre RN 11.5, async-storage 3. Sin ninguna librería de ubicación.
- `Podfile`: sin `use_expo_modules!`. `AppDelegate.swift` crea `RCTReactNativeFactory` y un `RCTDefaultReactNativeFactoryDelegate`, y usa `SceneDelegate` (UIScene).
- Info.plist (1b): `NSLocationWhenInUseUsageDescription`, `UIBackgroundModes = [location, remote-notification]`, sin `NSLocationAlways*`. Correcto para lo decidido.

### Qué trae Expo (verificado en los tarballs)
| | SDK 56 | SDK 57 |
| --- | --- | --- |
| `react-native` que fija | **0.85.3** | 0.86.3 |
| `expo-location` | 56.0.26 | 57.0.21 |
| `expo-task-manager` | 56.0.27 | 57.0.21 |
| iOS mínimo de `expo-modules-core` / `expo-location` / `expo-task-manager` | **16.4** | 16.4 |
| `react-native-worklets` / `reanimated` que fija | 0.8.3 / 4.3.1 | rango hasta 0.10 |

**Recomendación: SDK 56** (RN 0.85.3 es un parche sobre el actual 0.85.2; SDK 57 exigiría subir RN una versión menor, fuera del alcance).

### Implicaciones de instalarlo en RN 0.85
1. **iOS mínimo 15.1 → 16.4.** Es lo único que cambia de forma visible: `min_ios_version_supported`/`IPHONEOS_DEPLOYMENT_TARGET`. Excluye iPhone 6s/7 y similares (iOS 15). Para TestFlight en 2026 es aceptable, pero es decisión tuya.
2. **`AppDelegate.swift`**: el módulo nativo de Expo se carga a través de `ExpoReactNativeFactory` / `ExpoReactNativeFactoryDelegate` (subclases de las de RN). Hay que sustituir `RCTReactNativeFactory`/`RCTDefaultReactNativeFactoryDelegate` por esas dos. **No hace falta heredar de `ExpoAppDelegate`**: ni `expo-location` ni los consumidores de ubicación de `expo-task-manager` dependen de los eventos de `UIApplicationDelegate`. Esto importa porque el wrapper de Expo no menciona UIScene y nuestro `SceneDelegate` (obligatorio con el SDK de iOS 27) debe seguir intacto.
3. **`Podfile`**: añadir el `require` de `expo-modules-autolinking` y `use_expo_modules!` dentro del target. Los pods nuevos: `Expo`, `ExpoModulesCore`, `ExpoModulesJSI`, `ExpoLocation`, `ExpoTaskManager`, `EXConstants`/`UMAppLoader` (dependencias). Aumenta el tiempo de compilación y el tamaño del binario (modesto).
4. **JS**: `metro.config.js` y `babel.config.js` pueden quedarse como están para estos dos módulos; `expo` aporta `requireNativeModule`. Se instala `expo` + `expo-location` + `expo-task-manager` (+ `expo-constants` transitivo).
5. **Swift**: `ExpoModulesCore` compila con Swift 6 (`swift_version 6.0` en los podspecs de Expo); el proyecto usa `SWIFT_VERSION = 5.0` para el target de la app. Cada pod trae su propio ajuste, no debería afectar, pero es un punto a vigilar en el primer build.

### Riesgos (ordenados)
- **R1 · Conflicto de pares con Worklets.** `expo-modules-core` declara `react-native-worklets` como par *opcional* `^0.7.4 || ^0.8.0` (SDK 56) y el proyecto tiene `^0.12.2`. A nivel npm, un par opcional con versión instalada fuera de rango puede dar `ERESOLVE`; se resuelve con `overrides` en `package.json` (o `--legacy-peer-deps` solo para esta instalación). A nivel nativo, la integración con Worklets de Expo vive en pods **separados** (`ExpoModulesWorklets`, `ExpoModulesWorkletsAdapter`) y `ExpoModulesCore` los excluye de su propio código; la duda es si el autolinking los añade al detectar Worklets 0.12 y compilan contra sus cabeceras. **No lo usamos**, así que el plan prevé excluirlos si aparecen.
- **R2 · Primer build tras tocar el `AppDelegate`.** Cualquier error de fábrica deja la app sin arrancar. Mitigación: hacerlo aislado en el lote 2a, con un spike que solo compruebe que `Location.getForegroundPermissionsAsync()` responde.
- **R3 · MapLibre y Expo en el mismo Podfile.** Ambos usan `post_install`; el de MapLibre (`$MLRN.post_install`) y el parche de deployment target ya existentes deben convivir con el de Expo. Probable sin problema; a confirmar en el spike.
- **R4 · Versión de RN.** SDK 56 fija 0.85.3. Con 0.85.2 funciona en la práctica (mismo minor), pero conviene subir a 0.85.3 en el mismo lote para no tener avisos de `expo-doctor`.

**Si el spike de R1/R2 falla** se corta ahí (ver alternativa).

### Alternativa si hay bloqueo serio: módulo nativo propio (Swift)
Un `RCTBridgeModule`/TurboModule pequeño (~150–250 líneas) sobre `CLLocationManager`.
- **Pros:** sin Expo, sin subir a iOS 16.4, sin conflicto de pares; control total de `allowsBackgroundLocationUpdates`, `showsBackgroundLocationIndicator`, `pausesLocationUpdatesAutomatically`, `activityType = .fitness`, `distanceFilter`; y sobre todo **puede guardar cada muestra en un archivo desde Swift**, de modo que la recuperación tras un cierre del sistema no depende de que el JS siga vivo.
- **Contras:** código nativo propio que mantener (sin Android), hay que escribir y probar la API de eventos, y el New Architecture (`RCTNewArchEnabled`) obliga a usar el interop de módulos legacy o a escribir un TurboModule/codegen.
- **Otra opción descartada:** `react-native-background-geolocation` (Transistorsoft): muy completa pero de pago para release en Android y con licencia; sobredimensionada. `@react-native-community/geolocation`: sin tarea en segundo plano gestionada ni indicador azul configurable.

**Propuesta:** `expo-location` + `expo-task-manager` (SDK 56) con spike previo; si R1/R2 no se resuelven en el spike, módulo nativo propio. Aun con Expo, la persistencia (§4) se hace en JS dentro de la tarea.

### Qué ofrece `expo-location` para nuestra decisión (verificado en el código iOS)
- `startLocationUpdatesAsync(task, options)` en iOS **solo exige permiso en primer plano** («Al usar la app»); no pide «Siempre». Exige `location` en `UIBackgroundModes` (ya está).
- Opciones útiles: `accuracy` (`BestForNavigation`/`Best`), `distanceInterval`, `showsBackgroundLocationIndicator`, `activityType` (`Fitness`), `pausesUpdatesAutomatically`, `deferredUpdates*`.
- `getForegroundPermissionsAsync()` devuelve `accuracy: 'full' | 'reduced'` (precisa/aproximada) y `canAskAgain`.

---

## 2. Interfaz: cómo encaja `RealLocationSource`

La interfaz actual (`src/features/route/locationSource.ts`):
`getPermission`, `requestPermission`, `getCurrent`, `watch(onFix) → stop`, `now()`, `setMoving?()`. El resto de Ruta solo la conoce a través de `createLocationSource` (`locationSourceFactory.ts`) y de `useRouteTracker`.

### Encaje
- `getPermission`/`requestPermission` → `Location.getForegroundPermissionsAsync/requestForegroundPermissionsAsync`, mapeando a `granted | denied | undetermined`.
- `getCurrent` → `Location.getCurrentPositionAsync({accuracy: Best})` → `RoutePoint {lat, lon, ele: altitude, t: timestamp de la muestra, accuracy}`. **`t` debe ser la hora de la muestra, no la de llegada** (en segundo plano llegan lotes).
- `watch(onFix)`: la API de Expo es asíncrona (`startLocationUpdatesAsync` + tarea). La tarea (`TaskManager.defineTask`) **se define en el ámbito global** (al cargar el módulo JS, antes de montar nada) y reenvía al emisor interno de la fuente. `watch` registra el listener y arranca las actualizaciones; la función de parada las detiene (`stopLocationUpdatesAsync`). Como `watch` devuelve síncronamente `stop`, el arranque asíncrono se encadena internamente.
- `now()` → `Date.now()`.
- `setMoving` → no-op (solo la simulación lo usa).

### Ajustes mínimos a la interfaz (pequeños, no tocan pantallas)
1. `LocationPermission` pasa a incluir **precisión**: p. ej. `getPermission()` devuelve `{ status, precise: boolean, canAskAgain: boolean }` o se añade `getAccuracyAuthorization()`. Necesario para §5. Los usos actuales (`RoutePrepScreen`) solo comparan con `'granted' | 'denied'`; se adaptan en el mismo lote.
2. Un canal de **estado de la fuente** (`onStatus`: `signal`, `permissionRevoked`) o simplemente exponer `lastFixAt`. Hoy la pérdida de señal se deduce del reducer (`SIGNAL_LOST_MS`), lo cual **ya funciona** con una fuente real; basta para el MVP.
3. Un método opcional `resumeFrom(points)` o equivalente para la recuperación (§4); alternativamente la recuperación vive en el hook y no en la fuente (preferible).

`useRouteTracker` y `routeTracker.ts` (máquina de estados pura) **no cambian de forma**; solo se endurece el filtrado (§3). `createLocationSource` devuelve siempre `RealLocationSource`; sus parámetros `sport`/`plan` desaparecen porque la simulación era lo único que los usaba.

---

## 3. Calidad del trazado

### Qué hace hoy `routeTracker.ts` (se conserva como base)
- Descarta fixes con `accuracy > 50 m` (`MAX_ACCURACY_M`).
- Ignora pasos `< 2 m` (`MIN_STEP_M`) como jitter.
- Señal perdida tras 10 s sin fix (`SIGNAL_LOST_MS`) → solo informa en la UI.
- Los fixes se ignoran si el estado no es `recording`.

### Huecos que hay que cerrar (lote 2b)
| Hueco | Por qué importa | Propuesta |
| --- | --- | --- |
| **Sin filtro de saltos** | El servidor rechaza **toda** la actividad con `impossible_speed` (carrera > 12 m/s, bici > 25 m/s). Un solo salto GPS (túneles, edificios) la pierde, y hoy `RouteActiveScreen` ante un rechazo solo muestra un aviso y hace `popToTop` (se descarta lo grabado). | Descartar un fix si la velocidad al último punto aceptado supera 12 m/s (carrera) / 25 m/s (bici) con margen (p. ej. 90 %); **proteger también `dt ≤ 0`**. Además, ante `impossible_speed` guardar la actividad localmente en lugar de perderla (ver §4). |
| **Jitter parado** | Con paso mínimo fijo de 2 m, la deriva del GPS parado (precisión 5–10 m) suma distancia fantasma. | Umbral dinámico: `max(2 m, 0,5 × accuracy)` o ignorar el paso si es menor que la incertidumbre de ambas muestras. |
| **Precisión de entrada** | 50 m es permisivo para un trazado fino. | 30 m para aceptar en carrera/bici, 50 m solo para el primer fix. A calibrar con las rutas de Xcode (precisión simulada ~5 m) y con una salida real. |
| **Intervalo por distancia** | Sin `distanceInterval` el sistema emite ~1 Hz: trazado denso, más batería y más puntos (límite servidor 50 000). | `distanceInterval: 5 m` (carrera) / `10 m` (bici), `accuracy: BestForNavigation`, `activityType: Fitness`. Una actividad de 3 h a 1 Hz son ~11 000 puntos: sin riesgo, pero el filtro reduce peso y batería. |
| **Auto-pausa** | La preferencia **existe** (chip «Pausa automática», `route_auto_pause` en `social_settings`, `session.autoPause`) pero **ningún código la usa**: el tracker no pausa solo. | Implementarla en el reducer: tras N s con velocidad < umbral (carrera ~0,8 m/s durante 8–10 s; bici ~1,5 m/s) pasa a `paused` marcando la pausa como automática; se reanuda al superar el umbral. Debe poder desactivarse con el chip. Tests puros sobre el reducer. |
| **Altitud** | `elevationGain` usa `ele`; las muestras de `ele` de GPS son ruidosas. | Mantener el cálculo del servidor como autoridad (la app lo recalcula igual) y suavizar o umbralizar (`threshold` ya existe, = 1 m). Sin cambios obligados. |

### Hardcodes de la simulación que hay que quitar
- `RoutePrepScreen`: `GpsChip accuracyM={4}` fijo → usar la precisión real del último fix.
- `RouteActiveScreen`: subtítulo `'GPS ±3 m'` fijo → precisión real.
- `RouteMap.tsx` línea ~114: centro por defecto en Palermo (`[-58.4208, -34.581]`) → sin centro hasta tener posición (o último punto conocido).

---

## 4. Ciclo de vida

### Comportamiento esperado de iOS con «Al usar la app» + `location` en segundo plano
- **Segundo plano / iPhone bloqueado:** con `startLocationUpdatesAsync` y el modo `location`, el proceso sigue recibiendo ubicación y aparece el indicador azul (`showsBackgroundLocationIndicator: true`). El JS corre mientras llegan muestras; los temporizadores de pantalla (`setInterval` de 500 ms del hook) pueden suspenderse. **El tiempo no depende de ellos:** el reloj del tracker se calcula con marcas (`now = source.now()`/`t` de la muestra) y se corrige en el siguiente fix/tick. Hay que verificar que `trackerActiveSec` no se queda corto tras un bloqueo largo (el patrón es el mismo que se arregló en 1c para Sesión).
- **Cierre por el sistema a mitad de ruta:** con «Al usar la app» **iOS no relanza la app** para entregar ubicación (el relanzamiento por ubicación exige «Siempre»). Y si la persona cierra la app deslizándola, tampoco. Por tanto **hoy se pierde la grabación completa** (estado solo en `useReducer`) y con la nueva fuente seguiría igual. **Hay que persistir.**

### Propuesta de recuperación (lote 2b)
1. **Buffer persistente** de la actividad en curso en AsyncStorage (clave por usuario): `{ clientId, sport, startedAt, pauses, plan (id o puntos), settings de privacidad, points[] }`. Se escribe **desde la tarea de ubicación** cada lote de muestras (no dependiendo de que la pantalla esté montada) y en cada pausa/reanudación. Con Expo la tarea es JS, así que escribe en el mismo almacenamiento que la app; con módulo nativo propio sería un archivo desde Swift.
2. **`client_id` creado al empezar** (ya es el mecanismo de idempotencia del guardado y de la cola de Ruta): reintentos y recuperación no duplican.
3. **Al abrir la app con sesión iniciada**, si hay buffer sin cerrar: tarjeta/aviso «Tienes una actividad sin terminar» con *Recuperar y guardar* / *Descartar*. Recuperar reconstruye `TrackerState` (se sigue o se cierra en la última muestra) y entra por el flujo normal de guardado. Primero se recupera, solo después se pide nada más.
4. **Rechazo del servidor (`impossible_speed`, `moving_exceeds_duration`…):** conservar la actividad en cola local marcada con error (mismo patrón que la cola de Sesión del 1c: no reintentar en bucle) y avisar, en vez de `popToTop` y descartar.
5. La cola de guardado de Ruta (`routeQueue`, `useRouteQueueFlush`) ya reintenta al arrancar y al volver a primer plano con el mismo `client_id`; se reutiliza tal cual.

### Batería
- Parar `stopLocationUpdatesAsync` **siempre** al terminar, al descartar, al desmontar la pantalla de grabación y si el buffer se cierra por recuperación; hoy `useRouteTracker` ya limpia el `watch` al salir de `recording`/`paused`, pero con tarea en segundo plano la parada debe ser explícita e idempotente y tener una prueba.
- **En pausa**: reducir (o detener) las actualizaciones y reanudarlas al continuar; si se detienen, la auto-pausa necesita la última muestra para reanudar (en pausa manual no hace falta). Decisión recomendada: pausa manual detiene las actualizaciones; auto-pausa las mantiene con `accuracy` más baja.
- `pausesUpdatesAutomatically: false` (si no, iOS puede dejar de entregar muestras al detectar que estamos parados y rompe la auto-pausa propia).
- Fuera de la grabación (pantalla «Salir ahora») solo se usa una posición puntual (`getCurrent`), nunca actualizaciones continuas.

---

## 5. Permisos

### Estado actual
- `RoutePrepScreen` ya tiene el estado **denegado** con título «Necesitamos tu ubicación», texto y botón «Abrir Ajustes» (`Linking.openSettings()`), diseño v2. Existe; hoy solo se alcanza con la simulación forzada.
- El permiso se pide **al pulsar Comenzar** (`start()` → `requestPermission`). El mapa de la pantalla previa y la posición se leen solo si ya está `granted`.

### Qué falta
| Caso | Propuesta |
| --- | --- |
| **Pantalla previa (rationale)** | Una pantalla/hoja v2 antes del diálogo del sistema: qué usamos (tu posición y tu recorrido mientras usas la app), que no es «Siempre», botón «Continuar» que lanza el diálogo. Se muestra solo si `undetermined`. Decidir si va en `RoutePrepScreen` (estado nuevo) o como hoja. |
| **Denegado** | Ya existe; verificar texto exacto con el diseño y que **no** se vuelva a pedir el diálogo (iOS no lo muestra otra vez: solo Ajustes). Si `canAskAgain=false` mostrar este estado directamente. Al volver de Ajustes (`AppState → active`) reevaluar sin pedir nada. |
| **Restringido** (control parental/MDM) | Mismo estado que denegado con texto distinto («La ubicación está restringida en este iPhone»). Opcional para TestFlight. |
| **Ubicación imprecisa** (`accuracy: 'reduced'`) | Hoy no se detecta. Mostrar aviso en la pantalla previa y **bloquear «Comenzar»** (un trazado a ~1–20 km de precisión no sirve) con botón «Abrir Ajustes» («Ubicación precisa»). iOS permite pedir precisión temporal con `NSLocationTemporaryUsageDescriptionDictionary` (clave nueva, no está en el Info.plist): decidir si se usa; la propuesta mínima es solo abrir Ajustes. |
| **Revocado durante la grabación** | La fuente emite el cambio de estado; el tracker conserva lo grabado, avisa y ofrece guardar lo que hay. |
| **Servicios de ubicación apagados** | `ensureLocationServicesEnabled` de Expo lanza error; capturarlo y mostrar el estado denegado. |

Info.plist: `NSLocationWhenInUseUsageDescription` ya cubre el diálogo. No se añade nada de «Siempre».

---

## 6. «Ir ahora», seguir una ruta planificada y aviso de desvío

### Qué existe ya
- **Planificar:** Planear ruta (RouteGen con ELLIE / RouteManual a mano) → RoutePreview → «Usar» → vuelve a RoutePrep con `routeStore.plan` → Comenzar. Tus rutas (RouteSaved) también hace «Usar». Home abre RoutePrep con `routeStore.reset()` (salir ahora).
- **Seguir el plan:** `RouteActiveScreen` dibuja el plan punteado (`plan=`) y, si hay desvío, una línea guía hasta el punto más cercano (`guide`).
- **Desvío:** `updateDeviation` en `routeGeo.ts` implementa exactamente lo decidido (40 m corriendo, 60 m en bici, 10 s seguidos), `trackerReducer` lo evalúa en cada fix contra `nearestOnRoute`, la UI muestra el banner «Te alejaste de la ruta · A N m · tu recorrido se sigue registrando». **Lógica pura y con tests** (`routeTracker.test.ts`); no bloquea ni pausa nada.

### Qué falta
1. **Con fuente real el desvío nunca se ha probado**: solo con `detour` de la simulación. Se prueba con rutas de Xcode (City Run) generando un plan que no coincide con el movimiento simulado.
2. **Aviso fuera de pantalla:** el banner solo se ve con la app delante. En segundo plano/bloqueado no hay nada. Propuesta: háptica (`react-native-haptic-feedback`, ya instalada) al entrar y al salir del desvío cuando la app está activa; una notificación local en segundo plano **requiere permiso de notificaciones y librería de notificaciones locales**, que no están (hoy solo Push remoto) → fuera del alcance de 5d salvo que lo pidas.
3. **Progreso sobre el plan:** distancia restante / porcentaje completado no se calculan (solo `planDistanceM` actual). Útil para la pantalla de grabación; opcional.
4. **Origen de la generación:** `RouteGenScreen` usa `session.origin ?? SIMULATED_ORIGIN`. Con fuente real debe **bloquear la generación si no hay posición** (estado «Ubicación no disponible»). Lo mismo para el centro de `RouteManualScreen`.
5. **Modo seguir sin plan** y «Ir ahora» a una ruta guardada: ya cubierto por el flujo anterior; no hay pantalla distinta de «Ir ahora» además de Comenzar.
6. **Pausa automática** (§3) y sus interacciones con el desvío (no evaluar desvío en pausa: ya ocurre porque los fixes se ignoran fuera de `recording`).

---

## 7. Archivos

### A borrar (motor simulado)
- `src/features/route/simulatedTrack.ts` (origen y dos tracks de Palermo).
- La clase `SimulatedLocationSource`, `SimulatedLocationOptions`, `SimulatedGap` y `DEFAULT_SPEED` dentro de `src/features/route/locationSource.ts` (el archivo se queda con la interfaz y los tipos).
- Los 4 tests de `SimulatedLocationSource` en `__tests__/routeTracker.test.ts` (líneas ~132–190): se sustituyen por una `FakeLocationSource` de test en `__tests__/fixtures/` que cubra el contrato de la interfaz y por tests de `RealLocationSource` con el módulo de Expo mockeado. **Se mantienen** los tests del reducer del tracker (no dependen de la simulación).
- Referencias a `SIMULATED_ORIGIN`/`SIMULATED_TRACKS`: `RoutePrepScreen`, `RouteGenScreen`, `RouteManualScreen`, `locationSourceFactory.ts`.

### A tocar
| Archivo | Cambio |
| --- | --- |
| `package.json`, `ios/Podfile`, `ios/Podfile.lock`, `ios/Athelete.xcodeproj/project.pbxproj` | Dependencias Expo (SDK 56), `use_expo_modules!`, deployment target 16.4 |
| `ios/Athelete/AppDelegate.swift` | `ExpoReactNativeFactory` + `ExpoReactNativeFactoryDelegate`; sin tocar `SceneDelegate` |
| `src/features/route/locationSource.ts` | Interfaz con precisión/estado; fuera la simulación |
| `src/features/route/RealLocationSource.ts` (nuevo) + `locationTask.ts` (nuevo, `defineTask` global) | Fuente real, tarea de segundo plano, persistencia |
| `src/features/route/locationSourceFactory.ts` | Devuelve la fuente real |
| `src/features/route/routeTracker.ts` | Filtro de saltos/velocidad, umbral dinámico de paso, auto-pausa |
| `src/features/route/useRouteTracker.ts` | Parada explícita, recuperación |
| `src/features/route/routeStore.ts` / nuevo `activeRecording.ts` | Buffer persistente de la actividad en curso |
| `src/screens/route/RoutePrepScreen.tsx` | Rationale, denegado/impreciso/restringido, precisión real, bloquear «Comenzar» sin posición |
| `src/screens/route/RouteActiveScreen.tsx` | Precisión real, rechazo del servidor sin perder datos, háptica de desvío |
| `src/screens/route/RouteGenScreen.tsx`, `RouteManualScreen.tsx` | Sin origen simulado |
| `src/features/route/RouteMap.tsx` | Sin centro fijo en Palermo |
| `src/app/App.tsx` o un hook nuevo | Aviso/recuperación de actividad sin terminar al abrir la app |
| `src/features/route/v2/*` (hoja de permisos) | Rationale y estados |
| `__tests__/routeTracker.test.ts` + nuevos | Ver §3 y §4 |
| `docs/migration/*` | Checkpoint de 5d y QA con ubicación simulada de Xcode |

### Lotes propuestos
- **2a · Fuente real + permisos.** Spike de Expo (SDK 56, iOS 16.4, `AppDelegate`, `Podfile`, resolución de pares con Worklets) con criterio de corte claro; `RealLocationSource` en primer plano (`getCurrent` + `watchPositionAsync`/tarea), permisos con rationale, denegado, impreciso y revocado; limpiar `simulatedTrack` y el motor simulado; quitar los hardcodes (centro Palermo, ±3 m); bloquear generación/comenzar sin posición. Verificación: tests con módulo mockeado + prueba con *City Run* en el simulador.
- **2b · Grabación robusta y recuperación.** Tarea en segundo plano con indicador azul, `distanceInterval`, filtro de saltos y umbral dinámico, auto-pausa, parada garantizada, buffer persistente con `client_id`, recuperación al abrir, y **no perder la actividad ante `impossible_speed`**. Verificación: tests puros del reducer y de la cola; prueba real en iPhone (bloqueo, segundo plano, cierre forzado).
- **2c · Seguir ruta + desvío.** Validar desvío con fuente real, háptica, progreso restante opcional, caso «Ubicación no disponible» en generación/manual, QA completo con rutas de Xcode.

### Notas para las pruebas con el simulador
- Xcode ofrece **City Run**, **City Bicycle Ride** y **Freeway Drive**. Freeway Drive va a velocidades de coche (> 25 m/s): sirve para probar el **filtro de velocidad**, pero **no** para una actividad de bici, que el servidor rechazaría con `impossible_speed`. Para bici usar City Bicycle Ride.
- La precisión simulada ronda los 5 m, así que no ejercita bien el filtro de baja precisión ni la «ubicación imprecisa»; esos casos se prueban con tests puros y en dispositivo.
- El simulador no reproduce el cierre por memoria ni el relanzamiento: la recuperación se prueba con un cierre forzado y, mejor, en iPhone.

## Decisiones cerradas (14-10-2026)
1. **iOS mínimo 16.4:** sí.
2. **Expo SDK 56, con spike previo.** Expo se usará además para `expo-notifications` (push) y posiblemente otros módulos (ELLIE, cámara). **Si el spike falla por culpa de Worklets, se vuelve al módulo propio en Swift.**
3. **Desvío:** por ahora solo vibración con la app abierta. El aviso local en segundo plano se añade con `expo-notifications` cuando se hagan las push (sin librerías extra).
4. **Ubicación imprecisa:** bloquear «Comenzar» y mandar a Ajustes (sin precisión temporal).
5. **Actividad rechazada por el servidor:** se guarda en local con el error (sin reintento en bucle). Además se filtran los saltos de GPS en el cliente para que el rechazo casi nunca ocurra.

Consecuencia para el spike del lote 2a: como Expo se quedará para más módulos, el spike debe comprobar también que `expo-notifications` y la cámara no añaden requisitos que choquen con Worklets 0.12 (solo reconocimiento, sin implementarlos).

## Lote 2-0 · Spike Expo — resultado (14-10-2026)

**Veredicto: el spike pasa los 4 criterios.** No hizo falta volver al módulo nativo propio.

### Instalado (versiones exactas, `package.json`)
`expo 56.0.23`, `expo-modules-core 56.0.27`, `expo-location 56.0.26`, `expo-task-manager 56.0.27` (todas exactas). Transitivos relevantes: `expo-constants 56.0.27`, `expo-modules-jsi`, `expo-modules-autolinking 56.0.23`, `unimodules-app-loader`. React Native sigue en **0.85.2** (SDK 56 fija 0.85.3; no se tocó, sin avisos de build).
- **`overrides`** en `package.json`: `expo-modules-core → react-native-worklets: $react-native-worklets` (el par de Expo es `^0.7.4 || ^0.8.0`, el proyecto usa 0.12.2).
- **`expo-modules-core` como dependencia directa.** Sin ella npm lo dejaba anidado en `node_modules/expo/node_modules/` y `expo-location` no podía resolverlo (Metro habría fallado). Con ella queda en la raíz.
- `npm install` no dio `ERESOLVE`. Hay avisos `EBADENGINE` de Node 20 (el proyecto pide ≥ 22.11) que ya existían.

### Cambios nativos
- **Podfile:** `require` de `expo/scripts/autolinking`; `platform :ios, '16.4'` (constante `APP_MIN_IOS`, que también usa el parche de deployment target de los pods); `use_expo_modules!`; `use_native_modules!` ahora recibe el comando de autolinking de Expo (así no se enlaza nada dos veces). Sin cambios en el `post_install` de MapLibre.
- **`project.pbxproj`:** `IPHONEOS_DEPLOYMENT_TARGET` 15.1 → **16.4** (Debug y Release, proyecto y target; 4 sitios).
- **`AppDelegate.swift`:** `internal import Expo`, `ExpoReactNativeFactory` y `ExpoReactNativeFactoryDelegate` en lugar de las de RN. `SceneDelegate`, enlaces y orientación intactos. (El import sin `internal` falla: «ambiguous implicit access level».) No se hereda de `ExpoAppDelegate`; por tanto los *subscribers* de `UIApplicationDelegate` de Expo no se ejecutan. Para ubicación en primer plano/segundo plano no hacen falta; la restauración automática de tareas al relanzar en segundo plano de `expo-task-manager` tampoco aplica con «Al usar la app» (iOS no relanza).
- **`PrivacyInfo.xcprivacy`:** la agregación de manifiestos de CocoaPods añadió razones de los módulos de Expo: FileTimestamp `0A2A.1`, y la categoría DiskSpace (`E174.1`, `85F4.1`). Es automático y correcto; se conserva.
- **Temporal:** `src/app/App.tsx` registra en Debug `[spike] expo-location OK <status> <accuracy> task-manager function` (marcado `TODO(spike-2-0)`; pendiente de quitar cuando lo confirmes en el iPhone).

### Criterios
1. **`pod install`:** sin errores. Pods nuevos: Expo, ExpoModulesCore, ExpoModulesJSI, ExpoLocation, ExpoTaskManager, EXConstants, ExpoAsset, ExpoFileSystem, ExpoFont, ExpoKeepAwake, ExpoDomWebView, ExpoLogBox, UMAppLoader y **ExpoModulesWorklets / ExpoModulesWorkletsAdapter** (el autolinking sí los añadió). **Sin duplicados: una sola `RNWorklets 0.12.2` y una sola `RNReanimated 4.6.0`**; el adaptador de Expo depende de ese mismo `RNWorklets`.
2. **Builds:** Debug (simulador, `xcodebuild`) **BUILD SUCCEEDED**; Release (iphoneos, sin firma) **BUILD SUCCEEDED**, binario con `minos 16.4`, `main.jsbundle` de 8,2 MB embebido. El mensaje `error: the following command failed with exit code 0` que sale al final es ruido de Xcode sin efecto.
3. **`tsc` limpio, `eslint` limpio, 619 tests en verde.**
4. **Bundle:** `react-native bundle` (dev, cache limpia) resuelve `expo-location` y `expo-task-manager`. La prueba en ejecución real queda para el iPhone (log `[spike]`).

### Riesgo residual
`ExpoModulesWorklets` compila contra Worklets 0.12 sin errores, pero **no se ha ejecutado**: si Reanimated/Worklets se comportaran mal en tiempo de ejecución, sería lo primero a sospechar. Por eso la prueba en iPhone incluye las animaciones. Si falla de verdad, la salida es excluir esos dos pods del autolinking antes de volver al módulo propio.

### Qué probar en el iPhone
1. Que la app arranca (Debug por Metro) y en la consola de Metro sale `[spike] expo-location OK undetermined/… full task-manager function`.
2. Animaciones de Reanimated: **LivingHalo** (ELLIE y modo voz) y **EllieActionButton**; también transiciones y la barra de pestañas.
3. Que los deep links `athelete://` siguen funcionando (SceneDelegate): abrir un enlace de amigo con la app cerrada y abierta.
4. Que mapa (MapLibre), fotos de perfil y háptica siguen igual.

## Lote 2a · Fuente real y permisos — hecho (14-10-2026)

- **Fuente real:** `RealLocationSource.ts` implementa la nueva `LocationSource` (`getAccess`, `requestAccess`, `getCurrent`, `watch(onFix, onEvent)`, `now`). Usa `expoLocationApi.ts` (envoltorio con `require` perezoso, inyectable en tests) y `locationTask.ts`, que hace `TaskManager.defineTask` al cargar el bundle (`index.js` lo importa) y reenvía las muestras a un bus. Opciones de `startLocationUpdatesAsync`: `BestForNavigation`, `ActivityType.Fitness`, `distanceInterval: 5`, `showsBackgroundLocationIndicator: true`, `pausesUpdatesAutomatically: false`; solo permiso «Al usar la app». Detener el `watch` detiene también las actualizaciones de la plataforma. `t` de cada punto = hora de la muestra (en segundo plano llegan en lote).
- **Latido:** con filtro de 5 m, parado no llegan fixes y eso no es «sin GPS». Cada 4 s se consulta la última posición conocida (≤ 8 s) y se emite `alive`, que renueva la señal sin añadir punto. Misma comprobación detecta el permiso revocado.
- **Permisos (RoutePrepScreen):** pantalla previa v2 («Tu ubicación, solo mientras entrenas» + Continuar) → diálogo del sistema; denegado y restringido (servicios apagados o restringidos; iOS no distingue ambos) con «Abrir Ajustes»; ubicación imprecisa → bloquea «Comenzar» con explicación y Ajustes. Se vuelve a leer al volver de Ajustes. **Revocado a mitad de ruta:** el tracker pasa a pausa, conserva lo grabado y la pantalla de grabación avisa con enlace a Ajustes.
- **Restos eliminados:** `SimulatedLocationSource`, `simulatedTrack.ts` (borrado), todos los `TODO(route-5d)`, centro de mapa en Palermo (ahora «Buscando tu ubicación…» hasta tener posición), «GPS ±3 m» y `accuracyM={4}` (precisión real del último fix), `SIMULATED_ORIGIN` como origen de generación (la generación espera la posición; sin ella muestra «Ubicación no disponible» con Ajustes) y el log `TODO(spike-2-0)` de `App.tsx`.
- **Tests:** `realLocationSource.test.ts` (+ `fixtures/fakeLocationApi.ts`, stub de `expo-task-manager` en jest): estados de permiso, sin segundo diálogo, ciclo de arranque/parada, latido, revocación. Se retiraron los 4 tests de `SimulatedLocationSource` (la lógica que probaban ya no existe). 625 tests, `tsc` y `eslint` limpios.

## Lote 2b · Grabación robusta y recuperación — hecho (14-10-2026)

- **Filtros (`routeTracker.ts`)**, contra el último punto aceptado: precisión > 50 m y tiempo no creciente → se ignoran; **salto imposible** (velocidad implícita > 12 m/s corriendo / 25 m/s en bici, **×0,95** de margen contra redondeos del servidor) → se descarta y el siguiente se mide desde el último bueno; si el primer punto fue el malo, tras 5 saltos seguidos se re-ancla; **deriva parado**: con velocidad implícita < 0,8 m/s un paso solo cuenta si supera `max(precisión, 5 m)` (andando o más rápido vale el mínimo de 2 m). Ningún tramo aceptado puede ser rechazado por `impossible_speed` (hay un test que lo comprueba con saltos aleatorios).
- **Auto-pausa** (preferencia ya existente, ahora aplicada). Con el filtro de 5 m «parado» = ningún punto nuevo aceptado, así que: corriendo **8 s** sin movimiento de ≥ 5 m (≈ por debajo de 0,6 m/s, más lento que caminar), en bici **6 s**; la pausa empieza en el último movimiento (la parada no cuenta) y solo si el GPS sigue vivo (sin señal no es «parado»). **Reanuda** con dos fixes consecutivos a ≥ 10 m de donde paró y a ≥ 1,0 m/s (corriendo) / 1,8 m/s (bici): la deriva del GPS no la reanuda. Una pausa manual nunca reanuda sola. El título de la pausa dice «PAUSA AUTOMÁTICA».
- **Buffer persistente (`activeRecording.ts`):** el estado completo del tracker + `client_id` (fijado al empezar), privacidad y plan, en AsyncStorage por usuario. Se escribe **como mucho cada 5 s** (con escritura final diferida), **al instante** en cada pausa/reanudación/cambio de estado y al pasar la app a segundo plano. Nunca se escribe un estado terminado. Se borra solo cuando el servicio ya tiene la actividad (guardada, en cola o en «rechazadas»).
- **Recuperación (`RouteRecoveryGate`, montado en `App.tsx`):** al abrir con sesión, si hay una salida sin terminar: **Continuar** (vuelve en pausa en el último instante guardado; el tiempo con la app cerrada no cuenta), **Guardar** (la cierra en el último instante y la guarda; < 100 m se descarta con aviso) o **Descartar** (con confirmación). Después, si hay actividades rechazadas, muestra **Reintentar / Descartar**.
- **Rechazo del servidor:** ya no se descarta. `saveActivity` y la cola pasan la actividad a una lista local de rechazadas (`rejectedSaves.ts`, clave `athelete.route.rejectedSaves.v1`) con el error; en la pantalla de grabación aparece «No se pudo guardar tu actividad» con **Reintentar** (si era `impossible_speed` se recortan antes los tramos imposibles) o **Descartar**. Nuevos métodos del servicio: `getRejected`, `retryRejected`, `discardRejected`. Un rechazo de una actividad que estaba en la cola de reintento también va a esa lista (no vuelve a la cola: sin bucles). Errores de red siguen yendo a la cola de reintento de siempre (mismo `client_id`, sin duplicados).
- **Parar las actualizaciones:** al terminar, al descartar, al cerrar sesión (`RouteRecoveryGate`) y al arrancar la app si quedó una tarea de una ejecución anterior sin grabación pendiente.
- **Valores elegidos:** `distanceInterval` 5 m · `BestForNavigation` · persistencia 5 s · latido 4 s · señal perdida 10 s (sin cambios) · auto-pausa 8 s / 6 s · reanudar 1,0 / 1,8 m/s y ≥ 10 m · deriva `max(precisión, 5 m)` bajo 0,8 m/s · límites de velocidad 12 / 25 m/s ×0,95.
- **Tests nuevos:** `routeTrackerFilters.test.ts` (saltos, límite de bici, margen, tramos válidos, re-anclaje, deriva, auto-pausa y reanudación, restauración), `routeRecovery.test.ts` (ida y vuelta del buffer, throttling, escritura inmediata, cierre), `routeRejectedSave.test.ts` (rechazo que no descarta, red → cola, rechazo tardío de la cola, reintento limpio, offline, descartar, fallo inesperado deja el buffer). El test de desvío existente se ajustó a velocidades plausibles (antes saltaba 78 m en 1 s). 661 tests, `tsc` y `eslint` limpios.

## Lote 2c · Seguir ruta y desvío — hecho (14-10-2026)

- **Salir ahora / seguir una ruta planificada** con la ubicación real: el plan (generado, a mano o de «Tus rutas») entra por RoutePrep → Comenzar como antes; ahora la pantalla previa avisa si el inicio de la ruta está a más de 200 m («El inicio de la ruta está a X km de ti»).
- **Progreso restante:** el tracker mide `planAlongM` (metros del plan recorridos, nunca retrocede) buscando solo en la franja alrededor de donde ya estás (−100 m / +800 m), de modo que un circuito que acaba donde empieza o una ida y vuelta no «saltan» atrás. Solo cuenta si el fix está a ≤ 100 m del plan. La pantalla de grabación muestra «Faltan X km» y «Llegaste al final de la ruta» a menos de 30 m.
- **Desvío** (40 m corriendo / 60 m en bici durante 10 s, sin cambios): ahora **vibración solo con la app activa** (error al salirse, éxito al volver; `AppState`). El aviso en segundo plano queda como `TODO(push-local)` para la fase de push con `expo-notifications`.
- **Tests:** `routeFollow.test.ts`, con `RealLocationSource` sobre un `expo-location` simulado: las muestras pasan por el bus de la tarea, progreso y restante, desvío corriendo y en bici (umbrales y 10 s), recuperación al volver a la ruta, progreso monótono en ida y vuelta y permiso revocado a mitad de ruta (pausa y conserva lo grabado). 666 tests en 64 suites; `tsc`, `eslint` y el bundle de Release (`react-native bundle --dev false`) sin errores.

## Paso 2 · CERRADO (14-10-2026)

Lotes 2-0, 2a, 2b y 2c hechos. Pendiente solo la prueba en dispositivo (lista en la entrega) y las dependencias de otras fases: aviso local en segundo plano (`TODO(push-local)`), y la decisión de si se quita el bloque `permission-revoked` cuando se integre `expo-notifications`.

### Archivos
- **Borrados:** `src/features/route/simulatedTrack.ts`; la clase `SimulatedLocationSource` (y sus tipos) de `locationSource.ts`; sus 4 tests.
- **Nuevos:** `RealLocationSource.ts`, `expoLocationApi.ts`, `locationTask.ts`, `useLocationAccess.ts`, `activeRecording.ts`, `finishRecording.ts`, `rejectedSaves.ts`, `v2/RouteRecoveryGate.tsx`; tests `realLocationSource`, `routeTrackerFilters`, `routeRecovery`, `routeRejectedSave`, `routeFollow` y fixtures `fakeLocationApi.ts`, `expoTaskManagerStub.ts`.
- **Tocados:** `index.js`, `jest.config.js`, `src/app/App.tsx`, `locationSource.ts`, `locationSourceFactory.ts`, `routeTracker.ts`, `useRouteTracker.ts`, `routeGeo.ts`, `routeStore.ts`, `routeSummary.ts`, `routeMappers.ts` (comentario), `RouteMap.tsx`, `RoutePrepScreen.tsx`, `RouteActiveScreen.tsx`, `RouteGenScreen.tsx`, `RouteManualScreen.tsx`, `routeService.ts`, `supabaseRouteService.ts`, `__tests__/routeTracker.test.ts`.
