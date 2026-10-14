# Ruta · fase 5c · conexión al backend real + Retos oficiales (app) — checkpoint

Fecha: 2026-10-13 · Rama `feature-migration` · Sin migraciones, sin `npx supabase`, sin escrituras reales hechas desde aquí (las prueba el equipo).
Fuentes: [`ROUTE_RPC_SHAPES.md`](../backend/ROUTE_RPC_SHAPES.md), [`ROUTE_PLAN.md`](ROUTE_PLAN.md), `src/types/supabase.ts`, referencia SOCIAL_15.

## Qué hay

**Ruta (real)**
- `supabaseRouteService` implementa `RouteService`. `useRouteService` devuelve el real; el de ejemplo solo tras un deep link dev (`isRouteSampleActive`, falso en release).
- **Guardar**: `save_route_activity` con `client_id` (idempotente), `local_date` del dispositivo, track completo `[lat,lon,ele,t,acc]`, pausas y métricas. Se lee de vuelta (`get_route_for_viewer`) para mostrar las cifras que recalcula el servidor y `counted_as_workout` / `points_awarded` en el resultado.
- **Cola local** (AsyncStorage `athelete.route.saveQueue.v1`): se escribe *antes* de llamar; sin red (o 25 s sin respuesta) queda en cola con reintento exponencial (30 s → 1 h) y el **mismo `client_id`**. Se envía al abrir la app y al volver a primer plano (`useRouteQueueFlush`). Rechazos del servidor (`impossible_speed`…) no se reintentan y se muestran. La actividad pendiente se ve en el resultado como "Guardada en este dispositivo".
- **Leer**: `get_route_for_viewer` (dueño completo; otros, trazado ya recortado: la app no vuelve a recortar), `get_recent_activities` + `get_outdoor_month` (Perfil), `get_today_route_activity` (card de Inicio, estado "tu ruta real"). Hooks en `useRouteData`.
- **Privacidad**: `update_route_activity_privacy` desde la hoja del resultado (confirmación al pasar a "Solo yo" si estaba compartida) y `delete_route_activity` con confirmación. Los valores por defecto (`route_default_visibility`, `route_hide_endpoints_default`, `route_auto_pause`) se leen/escriben en `social_settings` (`useRouteDefaults`).
- **Tus rutas**: `save_planned_route`, `rename_planned_route`, `delete_planned_route` (con confirmación), `get_my_planned_routes`; el fallo de lectura ya no se confunde con "vacío".
- **ELLIE**: `generate-route` real con sesión, "Otra opción" = otra `seed`, errores mapeados (`invalid_params`, `no_route_found`, `rate_limited`, `provider_unavailable`, `unsupported_kind` + `unauthorized`/`network`) y atribución ORS en generación, vista previa y GPS listo con ruta generada.
- **Comunidad**: `create_post('route', activity_id)`; `created:false` → "Ya la habías compartido"; `route_private` abre la privacidad. El adjunto real (polilínea recortada, `pace_label`/`avg_speed_kmh`, `new_best`) se dibuja con la composición de la Fase 3 (`routePostGeometry`); sin polilínea → "Recorrido oculto". `ROUTE_POSTS_ENABLED = true`. Tocar el mapa en el detalle abre la actividad (recortada para otros).
- **Récords**: `get_route_personal_bests` y `set_route_personal_best` (registro manual) en Perfil, bloque "Récords de ruta" (`RouteBests`).
- **Sesiones `source='route'`**: `WorkoutSession.source/routeActivityId`; se muestran como Ruta (Inicio "ruta" en el hero hecho, notificaciones, contexto de ELLIE); la sesión de una rutina ya no recoge la Ruta de hoy.

**Retos oficiales (app)**
- Vista **Retos oficiales** (`SocialOfficialList`, SOCIAL_15): destacado de 580 pt, "Más retos para este mes" (foto ancha + dos columnas alternadas) y "Lo que viene" (carrusel; "Avisarme" = inscribirse antes de empezar, `my_status='joined'` → "Te avisaremos").
- `get_my_challenges`: `cover_path` firmado con `createSignedUrls` (bucket privado `challenge-covers`), `people {total, preview}`, `leader`, `badge`, `unit`, `exercise_name`, `official_upcoming`. Ya no hay N llamadas a `get_challenge_board` para la lista (solo el detalle).
- Retos de km: `distance_km` (solo oficial; progreso con 2 decimales, coma decimal). Reps: nombre del ejercicio del servidor.
- Badges: iconos placeholder en **un solo sitio** (`officialBadge.ts`, `TODO(badges-oficiales)`).
- La app **no envía** `official_challenge_completed` ni `social_challenge_completed` (no están en `GamificationEventType`; nota en `gamification.ts`); puntos e insignia se leen del servidor.
- Inicio: la sección de reto y su CTA "sin reto" van a Retos oficiales (`TODO(retos-oficiales)` retirado); el "amigo que va delante" sale de `leader`.

**Otros arreglos necesarios por el `supabase.ts` regenerado**
- `exercises.name` ya no existe: `attachmentSources` usa `exercise_display_name`.
- Fixtures de `social_settings` con los 3 campos de ruta.

## Decisiones

- **D-162** · Cola de guardado escrita antes de la llamada y reintentos con el mismo `client_id`; timeout de 25 s = "sin red". Una actividad en cola no se puede borrar en servidor (se quita de la cola) ni compartir.
- **D-163** · El motor de ubicación sigue **simulado** (5d). Su reloj corre más rápido que el real, así que `alignToNow` desplaza la salida entera (inicio, fin, pausas y tiempos) para que termine "ahora" y el servidor no vea fechas futuras. Con GPS real no cambia nada.
- **D-164** · Calorías: `null` hasta que el servidor las calcule (se quitó la estimación local).
- **D-165** · "Avisarme" de Lo que viene = inscripción previa (`join_official_challenge`); tocar de nuevo = `leave_challenge`. Si el servidor no lo admite para retos no empezados se verá el error en el toast.
- **D-166** · Récords de ruta: el diseño solo muestra el "Nuevo récord" del resultado; la lista y el registro manual van en Perfil bajo "Actividad reciente" (sin diseño propio, a confirmar).
- **D-167** · Las covers remotas se pasan por un filtro gris (`filter: grayscale`) por si no vienen en B/N.

## Pendiente / [confirmar] con backend

- Formas exactas marcadas [confirmar] en `ROUTE_RPC_SHAPES.md`: la app lee con tolerancia (claves `track|points|polyline`, array u objeto, `splits [{km,sec}]` acumulado o por tramo, `owner.id|user_id`) pero conviene fijarlas. **Payload de `save_planned_route`**: enviamos `points` como `[[lat,lon],…]`, `kind`, `surface`, `origin`, `distance_m`, `elevation_gain_m` (confirmar).
- `get_route_for_viewer`: ¿devuelve `new_best` al dueño? Si no, el resultado conserva el récord local (hoy `null`).
- `leave_challenge` para retos oficiales no empezados; `status` de `official_upcoming` (se acepta cualquiera como `pending`).
- Imagen estática del mapa en la card de Inicio (sigue siendo mapa vivo) y compartir fuera (9:16): `TODO(route-share)`.
- `TODO(route-snap)` (ajuste a calles y altitud de rutas a mano), `TODO(route-tiles)`, `TODO(route-5d)`.
- La hoja de privacidad de Prep usa un trazado de ejemplo como miniatura ilustrativa.
- Sin pantalla de Progreso "Al aire libre" (DA-201); el mes se ve en Perfil.

## Tests (lógica pura)

`routeQueue` (cola con `client_id`, reintento, flush), `routeWire` (RPC de Ruta, generate-route, guardado, splits), `routeRecords` (sec → ritmo y tiempo, entrada manual), `officialChallenges` (mapeo de `get_my_challenges`, progreso km/reps, composición de la lista, adjunto de post de ruta, geometría), `routeSessions`.
Total: 56 suites, 600+ tests; `tsc` limpio.
