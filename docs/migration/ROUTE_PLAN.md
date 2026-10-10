# Ruta (Running y Ciclismo) · plan de implementación

Fecha: 2026-10-09 · Solo reconocimiento: sin código, sin dependencias nuevas, sin pedir nada al backend.
Fuente: handoff §11B y "Planear ruta (v2.9)", índice ROUTE_01 a ROUTE_25, `Route.dc.html` / `RouteDark.dc.html`. Contexto: [`V2_12_DELTA.md`](V2_12_DELTA.md) bloque H.

## 0. Inventario

- **25 IDs**, todos con captura. Con Light y Dark: 01, 02, 03, 04, 08 a 22 y 25. **Escena oscura en ambos modos (una sola captura válida):** 05 (en curso Running), 06 (Cycling), 07 (pausa), 23 (siguiendo ruta) y 24 (desviado).
- 01 a 08 son de v2.12; **09 a 25 son nuevos (v2.13)** y ya estaban pendientes de captura.
- El texto de §11B no cambió respecto de lo leído antes (no hay marcas v2.13 en Ruta). Cambios silenciosos fuera de Calorías y Ruta: no detectables sin copia anterior (ver CALORIES_PLAN §0).

| Grupo | IDs |
|---|---|
| Salir ahora | 01 selector · 02 preparar Running · 03 preparar Cycling · 04 privacidad (hoja) · 05/06 en curso · 07 pausa · 08/09 resultado · 10 compartir fuera 9:16 |
| Entradas desde otras pantallas | HOME_15 a 17 (card de Inicio: invitación y "Ruta completada hoy" Running / Cycling) · SOCIAL_16 y ROUTE_11 (post con mapa y detalle desde Comunidad) · ROUTE_12 (Perfil · Actividad reciente) · Progreso "Al aire libre · Este mes" · retos por km ("50 km en octubre", Fase 4) |
| Planear | 13 configuración (Generar ruta con Halo) · 14 generando · 15 ruta generada · 16 otra alternativa · 17 creación manual · 18 editar puntos · 19 preview · 20 Tus rutas · 21 vacío |
| Con ruta planeada | 22 GPS listo con ruta · 23 siguiendo ruta · 24 desviado · 25 resultado con ruta planeada |

## 1. Flujos

1. **Salir ahora:** Inicio (card "Tu ruta") → selector → Preparar (GPS listo, deporte, privacidad) → Comenzar → En curso (distancia display 112, tiempo, ritmo o velocidad, FC y desnivel) → Pausa / Continuar → Finalizar → Resultado (mapa de portada 500/560 pt, parciales, perfil de desnivel en bici, banda de ELLIE) → Compartir en Comunidad (post con mapa) o Compartir fuera (pieza 9:16: Mapa, Foto, Minimal; Historia, WhatsApp, Guardar, Más) → aparece en Perfil, Progreso y la card de Inicio ("tu ruta real").
2. **Planear ruta:** configuración (distancia 3/5/10/21/Otra o 20/40/60/100 en bici, Recorrido, Desnivel, Superficie) → **con ELLIE** (generar, "Otra opción") **o a mano** (tocar el mapa; ATHELETE une por calles; deshacer; editar y arrastrar puntos) → preview ("Usar esta ruta", Editar, Guardar) → GPS listo con la ruta punteada → seguimiento (planeada tenue, real Ember, "de 5,24 km") → **Desviado de ruta** ("Te alejaste de la ruta · A 200 m", "Volver a la ruta": guía punteada al punto más cercano; nunca pausa ni bloquea; sin giro a giro) → resultado con "Ruta planeada 5,24 km · Recorrido real 5,41 km".
3. **Tus rutas:** lista dentro de Ruta (Usar, Cambiar nombre, Eliminar); vacío con "Planear ruta". **Siempre privadas.**
4. **Privacidad:** Solo yo / Amigos / Público; "Ocultar inicio y final" ON por defecto; las piezas externas siempre recortan.

Fuera de V1 (el diseño lo dice): clubs, segmentos, rankings, heatmaps, navegación y ubicación en vivo.

## 2. Datos y propuesta de backend (sin pedirlo aún)

- **`route_activities`:** `id, user_id, sport ('running'|'cycling'), started_at, ended_at, moving_sec, distance_m, avg_pace_sec_km / avg_speed_kmh, elevation_gain_m, avg_hr, calories, splits jsonb ([{km, sec}]), elevation_profile jsonb, polyline (texto codificado o `geography`), polyline_simplified, visibility ('me'|'friends'|'public'), hide_endpoints bool default true, planned_route_id null, ended_status ('finished'|'discarded'), source ('app')`. Política: el dueño lee y escribe; los demás solo a través de la RPC de lectura.
- **`planned_routes` (Tus rutas):** `id, user_id, name, sport, polyline, distance_m, elevation_gain_m, surface, kind ('loop'|'out_and_back'|'point_to_point'), origin ('ellie'|'manual'), created_at`. Siempre solo del dueño.
- **Recorte de inicio y final en el servidor:** RPC `get_route_for_viewer(_activity_id)` que devuelve el trazado completo solo al dueño y, a los demás, el trazado **sin los primeros y últimos ~200 m** (recortado en el servidor, nunca en el cliente). El post y las piezas externas solo usan la versión recortada. La polilínea completa **nunca** sale en `get_feed`.
- **Post tipo `route`** (BT-56): `create_post('route', _source_id = activity_id, ...)` toma el adjunto-instantánea del servidor (`sport, distance_km, duration_sec, pace_label, elevation_m, planned_name, new_best` y la polilínea recortada simplificada), como hace con el entreno. Hoy `create_post` solo conoce `workout, record, routine, achievement, challenge, photo`.
- **Generación con ELLIE:** Edge Function `generate-route` (`{ sport, origin {lat,lon}, target_km, kind, elevation ('flat'|'rolling'|'hilly'), surface, seed }` → `{ routes: [{ polyline, distance_m, elevation_gain_m, surface, kind }] }`, 1 ruta por llamada y `seed` para "Otra opción"). Internamente es un servicio de rutas (OpenRouteService, GraphHopper o Mapbox Directions) para el trazado por calles; ELLIE decide los puntos de paso. Límite diario aparte (como Calorías). **Decisión de proveedor y coste pendiente.**
- **Cómo cuenta como entreno:** minutos activos, racha, `workouts` y km para retos. Propongo `route_activities` con `moving_sec` ≥ 10 min y `distance_m` ≥ 1 km como "sesión" para: anillo de entreno de Inicio (minutos), racha, la métrica `workouts` de retos y el evento de gamificación `workout_completed` (una vez por actividad, con `reference_id = activity_id`). Retos por km: nueva métrica `distance_km` (BT-55) alimentada desde `route_activities` (solo Running y Ciclismo, no manual). Core 33: no cuenta (no es un hábito del reto) salvo que producto diga otra cosa. **Pendiente de decidir** (el diseño no lo define).
- **ELLIE:** recibe distancia, ritmo, desnivel y FC de cada actividad en su contexto (`get_ellie_context` / lo que lea `ellie-chat`).
- **Perfil y Progreso:** `get_recent_activities(_user_id, _limit)` (con la miniatura de mapa recortada para otros) y `get_outdoor_month(_user_id)` (km de carrera con delta frente al mes anterior y km en bici).

## 3. Librerías (RN 0.85.2, New Architecture; consulta del 2026-10-09)

| Necesidad | Opción | Lo comprobado | Pendiente de confirmar |
|---|---|---|---|
| Mapa con estilo propio | **`@maplibre/maplibre-react-native` v11** (MIT) | Docs oficiales: "desde v11 solo se admite la nueva arquitectura"; React Native ≥ 0.80 (menos "podría funcionar"); releases recientes v11.5.0 (4-oct-2026), v11.3.4 añadió RN ≥ 0.87. Capas de línea, estilos propios, snapshot | Funcionamiento exacto con RN 0.85.2 (probar en un build) |
| Alternativa | `@rnmapbox/maps` (Mapbox SDK v11) | README: React Native 0.79+ y token de Mapbox obligatorio, uso con precio por consumo | Soporte explícito de Fabric no aparece en el README; verificar en su changelog |
| Fuente de mapas y coste | MapLibre no trae mapas: "para producción, usa tu propio estilo/tiles o un proveedor como **Stadia Maps o MapTiler**" | Recomendado: MapTiler o Stadia con **estilo propio** (lino y carbón, Ember). Planes gratuitos con límite de teselas mensual y de pago después; Mapbox cobra por cargas de mapa y por usuario activo | Precios exactos y límites de uso en la fecha de contratación |
| Ubicación en primer plano | `@react-native-community/geolocation` o `react-native-geolocation-service` | Servicio: Fused Location en Android; el README consultado no habla de background ni de New Architecture | Soporte New Architecture de ambas |
| Ubicación en segundo plano **sin licencia de pago** | **`expo-location` + `expo-task-manager`** (en un proyecto RN sin Expo hay que añadir `expo-modules-core`) | Docs: `startLocationUpdatesAsync` con TaskManager; iOS requiere `UIBackgroundModes: location` y permiso "Siempre"; Android `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE` y `FOREGROUND_SERVICE_LOCATION` | Que `expo-modules-core` conviva con RN 0.85 y la New Architecture del proyecto (cambia la configuración del Podfile y de Gradle) |
| Descartada por coste | `react-native-background-geolocation` (Transistorsoft) | "Los builds de release requieren licencia de pago en iOS y Android" (en debug es gratis) | — |
| Snapshot y compartir | `react-native-view-shot` o el snapshot del propio SDK de mapas; `react-native-share` (MIT; Instagram Stories y WhatsApp) | react-native-share: Stories y WhatsApp; gestiona `LSApplicationQueriesSchemes` en proyectos Expo | New Architecture de `view-shot` y `react-native-share` |
| Pantalla encendida y háptica | `react-native-haptic-feedback` (ya está); un paquete de wake lock | — | Elegir paquete compatible |
| Frecuencia cardíaca | `react-native-health` (HealthKit, iOS) | Apple Health aún no está integrado (fase 7) | Compatibilidad New Architecture |

**Permisos iOS (`Info.plist`):** `NSLocationWhenInUseUsageDescription` (hoy vacío), `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes` → `location`, `NSPhotoLibraryAddUsageDescription` (guardar la pieza 9:16) y, si se usa HealthKit, `NSHealthShareUsageDescription`. Apple pedirá justificar "Siempre". **Android:** `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` (notificación del servicio) y una declaración en Play Console. Android sigue sin compilarse en este proyecto (§8.1).

## 4. Simulador frente a iPhone

| Simulador (GPX simulado y datos) | Solo iPhone |
|---|---|
| Todas las pantallas con datos de ejemplo; mapa y capas; planificador (configuración, manual, edición, preview, Tus rutas); resultado, post y detalle; compartir con la pieza 9:16 hasta guardar en Fotos | GPS real y su precisión; pausa automática al detenerse; parciales por km |
| Seguimiento con una ruta GPX (Xcode: City Run, Bicycle Ride, o un archivo propio): ritmo, distancia, desvío y pausa | **Ubicación en segundo plano** con pantalla bloqueada y durante 30 a 60 min; consumo de batería |
| Permisos (conceder, denegar) | "Siempre" y su aviso del sistema; reinicio de la app con una actividad en curso (recuperación) |
| | Frecuencia cardíaca con Apple Watch; compartir a Historias y WhatsApp |
| | Rendimiento del mapa con un recorrido de miles de puntos |

## 5. Fases

1. **Decisiones y librerías** (sin código): proveedor de mapas y su estilo, proveedor de rutas, expo-location frente a otra opción; ver §6.
2. **Modelo y UI con datos de ejemplo:** tipos, métricas (ritmo, velocidad, parciales, desnivel), post `route` (ya hecho en Comunidad con fixtures), card de Inicio completa, Perfil y Progreso.
3. **Backend (lote único con Calorías):** `route_activities`, `planned_routes`, RPC de lectura con recorte, post `route`, `generate-route`.
4. **Salir ahora** en el simulador: mapa, ubicación en primer plano, preparar, en curso, pausa, resultado, guardado.
5. **Planear:** ELLIE y manual, Tus rutas, GPS listo, seguimiento y desvío.
6. **Compartir:** post en Comunidad (con recorte) y pieza 9:16.
7. **Segundo plano y QA en iPhone:** ubicación con pantalla bloqueada, batería, recuperación; después Android.
8. **Integraciones:** minutos, racha, `workouts`, retos por km (BT-55) y contexto de ELLIE.

## 6. Decisiones pendientes

1. MapLibre con MapTiler o Stadia (estilo propio) frente a Mapbox, y el coste esperado a la escala del lanzamiento.
2. Servicio de rutas para el trazado por calles y la generación (OpenRouteService, GraphHopper o Mapbox Directions) y su coste.
3. Ubicación en segundo plano: `expo-location` (gratis, requiere `expo-modules-core`) frente a pagar Transistorsoft.
4. Cómo cuenta Ruta como entreno (umbral, racha, `workout_completed`) y si Core 33 la cuenta.
5. Cuántos metros se recortan al inicio y al final (propongo 200 m) y si se fuerza siempre.
6. Retención de la polilínea completa y borrado al eliminar la cuenta.

## 7. Orden recomendado (con Calorías)

Ver [`CALORIES_PLAN.md`](CALORIES_PLAN.md) §7: Calorías primero (simulador), un único lote de backend para ambas, y Ruta después (iPhone y decisiones de coste).
