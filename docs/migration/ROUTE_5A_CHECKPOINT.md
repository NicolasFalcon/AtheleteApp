# Ruta · fase 5a · mapa real y UI completa con datos de ejemplo — checkpoint

Fecha: 2026-10-10 · Rama `feature-migration` · iOS (iPhone 17 Pro, simulador) · **Sin backend y sin GPS real.**
Fuentes: [`ROUTE_PLAN.md`](ROUTE_PLAN.md), `Route.dc.html`, ROUTE_01 a ROUTE_25 del índice visual v2.13 (capturas en `references/`).

## Qué hay

- **Mapa real**: `@maplibre/maplibre-react-native` 11.5.0 (única dependencia nueva). Compila y corre en iOS con la New Architecture (RN 0.85.2). **Android sin probar.**
- **Teselas**: OpenFreeMap (vectorial OpenMapTiles, sin clave). Estilo propio (lino, carbón y Ember; Light y Dark) en **un solo archivo**: [`mapStyle.ts`](../../src/features/route/mapStyle.ts).
- **Capa de mapa**: [`RouteMap.tsx`](../../src/features/route/RouteMap.tsx) (ruta Ember con halo, tramos ocultos punteados, ruta planeada punteada, guía de regreso, posición con halo, extremos, puntos a mano, anillo de objetivo, cámara por ajuste o centro).
- **Lógica pura** (con tests): `routeGeo` (haversine, distancia, ritmo y velocidad, tiempo activo con pausas, desnivel, punto más cercano, desvío 40 m / 60 m durante 10 s, recorte 200 m, límites), `routeTracker` (reductor listo/grabando/pausa/terminado, precisión ≤ 50 m, paso ≥ 2 m, señal perdida 10 s), `routeSummary` (parciales, actividad desde el tracker, tramos ocultos), `routeFormat`.
- **Sin GPS real**: `LocationSource` ([`locationSource.ts`](../../src/features/route/locationSource.ts)) con `SimulatedLocationSource` (reproduce una polilínea con velocidad, pausas, huecos, desvío y estados de permiso). Las pantallas solo conocen la interfaz; [`locationSourceFactory.ts`](../../src/features/route/locationSourceFactory.ts) es el único lugar que cambia en 5c/5d.
- **Sin backend**: `RouteService` ([`routeService.ts`](../../src/services/route/routeService.ts)) con implementación de ejemplo en `src/dev/routeFixtures.ts` (7 polilíneas reales de Palermo, `routeSamplePolylines.ts`). Selector único: `useRouteService`.
- **Pantallas** (`src/screens/route/`): `RoutePrep` (Salir ahora / Planear, estados de ubicación y mapa), `RouteGen`, `RouteManual`, `RoutePreview`, `RouteSaved`, `RouteActive` (grabando, pausa, desvío, sin señal), `RouteResult` (dueño y espectador), `RouteShare`. Hoja de privacidad, tarjeta de Inicio "tu ruta real" (`RouteDoneCard`) y "Actividad reciente" en Perfil (`RecentActivity`).
- **La app real no muestra datos de ejemplo**: la card de Ruta de Inicio sigue siendo la invitación y abre `RouteSoon`; Perfil no muestra la sección. Todo se ve solo con `athelete://dev/route?screen=<clave>`.

## Mapa de referencias → clave dev

| ID | Clave (`athelete://dev/route?screen=…`) |
|---|---|
| ROUTE_01 / 02 / 03 | `select` / `prepRun` / `prepBike` |
| ROUTE_04 | `privacy` |
| ROUTE_05 / 06 / 07 | `activeRun` / `activeBike` / `pause` |
| ROUTE_08 / 09 | `resultRun` / `resultBike` |
| ROUTE_10 | `share` |
| ROUTE_11 | `resultViewer` |
| ROUTE_12 | `profile` |
| ROUTE_13 a 16 | `planConfig` / `planGenerating` / `planResult` / `planAlt` |
| ROUTE_17 / 18 / 19 | `planManual` / `planEdit` / `planPreview` |
| ROUTE_20 / 21 | `saved` / `savedEmpty` |
| ROUTE_22 / 23 / 24 / 25 | `gpsReady` / `follow` / `offRoute` / `resultPlanned` |
| Estados sin diseño | `permissionDenied`, `noSignal`, `mapOffline` |
| Inicio | `homeCardActive` (tu ruta real, solo ejemplo) / `homeCardInvite` |
| Extra | `planConfigBike` |

## Verificación

- `tsc --noEmit` limpio; `jest`: 50 suites, 540 tests (32 nuevos: `routeGeo` 21, `routeTracker` 11); eslint sin errores en lo nuevo (avisos de estilos en línea, como en el resto del proyecto).
- Simulador: capturas Light y Dark de las pantallas contra las referencias (ver "Diferencias conocidas").
- Compilación iOS completa con MapLibre (Podfile: `$MLRN.post_install(installer)`).

## Diferencias conocidas respecto al diseño

- **Mover un punto**: el diseño dice "Arrastra para moverlo"; `Marker` de MapLibre no se arrastra. Se elige el punto y se toca el mapa; el texto dice "Toca el mapa para moverlo" (D-157).
- **Desnivel de una ruta a mano**: sin fuente de altitud, la tarjeta muestra "—" (TODO de backend).
- **Compartir fuera**: el renderizado a imagen (9:16) y la hoja del sistema no existen (necesitan captura de vista; dependencia fuera de 5a). Los cuatro destinos muestran un aviso.
- **Foto** (plantilla de Compartir): sin selector de fotos; muestra la ruta sobre fondo oscuro.
- **Estados sin diseño** (permiso denegado, sin señal GPS, mapa sin conexión): resueltos dentro del panel o como aviso, con el estilo de las pantallas vecinas (D-158).
- **Bloqueo de pantalla** al grabar: el diseño no lo trae; no se hizo.
- **Atribución** del mapa: el botón "i" de MapLibre (OpenFreeMap, OpenMapTiles y OpenStreetMap lo exigen); aparece en azul del sistema.
- **Bicicleta**: la polilínea de ejemplo mide ~30 km, no los 42 de la referencia.
- No se probó en un iPhone real ni en Android; la señal real, el segundo plano y la precisión son de 5c/5d.

## TODO(route-wire) por lo que necesitará el backend (base del lote de Lovable)

**1. Tablas** (`rg "TODO\(route-wire\)" src`)
- `route_activities`: id, user_id, sport, title, started_at, moving_sec, distance_m, elevation_gain_m, avg_hr, calories, `track` (polilínea completa con t/ele/accuracy), splits (derivables), planned_route_id, visibility (`me|friends|public`), hide_endpoints. Retención y borrado con la cuenta (ROUTE_PLAN §6.6).
- `planned_routes` (Tus rutas, siempre privadas): id, user_id, name, sport, points, distance_m, elevation_gain_m, kind, surface, origin (`ellie|manual`). Métodos: `getSavedRoutes`, `saveRoute`, `renameRoute`, `deleteRoute`.
- Preferencias de privacidad por defecto en el perfil (visibilidad, ocultar extremos, pausa automática).

**2. Funciones del servidor**
- `get_route_for_viewer`: devuelve el trazado **ya recortado 200 m al inicio y al final** a quien no es el dueño (la UI no recorta; el dueño ve todo, con los tramos ocultos punteados).
- `generate_route` (ELLIE + motor de rutas por calles): parámetros de `RouteGenerationParams` (distancia, recorrido, desnivel, superficie, semilla para "Otra opción"); responde con puntos, distancia, desnivel.
- Ajuste a calles y altitud para las rutas a mano (`snap_route`): distancia y desnivel reales.
- Recalcular distancia, desnivel, parciales y calorías al subir una actividad.

**3. Efectos de una Ruta como entreno**
- Cuenta para el anillo de Entreno, la racha, el contador de workouts y los km de los retos; **no** para Core 33; puntos como un entreno (ROUTE_PLAN §2).
- Evento `workout_completed` (o equivalente) al guardar.

**4. Comunidad**
- `create_post('route')` y el post de tipo `route` (BT-56): composición ya hecha en la Fase 3; `shareToCommunity` solo lo llama.
- Detalle desde Comunidad (`resultViewer`) con el trazado recortado.

**5. Inicio, Perfil, Progreso**
- Inicio: `getTodayActivity` (card "tu ruta real") y una imagen estática del mapa (hoy es un mapa vivo en el scroll).
- Perfil: `getRecentActivities` y `getOutdoorMonth` ("Al aire libre"). Progreso "Al aire libre" aún no tiene pantalla en 5a.

**6. Fuera del backend (5c/5d)**
- `ExpoLocationSource`: `expo-location` con "Al usar la app" y ubicación en segundo plano mientras graba; sin permiso "Siempre" en iOS.
- Compartir fuera: captura de la vista 9:16 y hoja del sistema.
- Proveedor de teselas en producción (OpenFreeMap no tiene SLA; ver D-155).

## QA (checklist Ruta 5a)

1. `athelete://dev/route?screen=planConfig`: anillo de objetivo, pills 3/5/10/21/Otra, tres celdas que rotan con un toque, "Tus rutas · 2".
2. "Generar ruta": estado "Generando" ~1,5 s, "Opción 1"; "Otra opción" cambia de ruta; "Usar esta ruta" vuelve con la ruta punteada ("GPS listo con ruta").
3. "Crear a mano": tocar el mapa añade puntos; deshacer; "Editar puntos", elegir un punto, tocar el mapa lo mueve, "Eliminar"; "Listo" abre la vista previa; "Guardar" aparece en Tus rutas.
4. "Comenzar": la grabación simulada avanza; "Pausar" muestra la pantalla de pausa (mapa al 50 %); "Continuar"; "Finalizar" pide confirmación; con menos de 100 m se descarta.
5. Desvío (`offRoute`): "Te alejaste de la ruta" tras 10 s fuera de 40 m (correr) o 60 m (bici); la salida sigue grabando.
6. Resultado: mapa con el trazado completo y los 200 m ocultos punteados en gris; "Compartir en Comunidad" (aviso), "Compartir" abre la pieza.
7. Con la app real (cuenta de QA): Inicio muestra la invitación de Ruta y la card abre "Próximamente"; Perfil sin "Actividad reciente".
8. Light y Dark.
