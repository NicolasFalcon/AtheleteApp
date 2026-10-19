# ROUTE + RETOS OFICIALES · Contratos backend (Lovable)

Fuente: resúmenes de Lovable (Parte 1 · Ruta, Parte 2 · Retos oficiales y récords de ruta) y el contrato pedido, que Lovable confirmó "sin cambios".
Estilo común: RPC SECURITY DEFINER; respuestas {ok:true, ...} o {error:'codigo'}; sin acceso para anon; RLS en todas las tablas nuevas.
Marcado [confirmar]: forma exacta no verificada con una respuesta real; la app debe tolerar variaciones.

---

## PARTE 1 · RUTA

### Tablas
- route_activities: id, user_id, client_id (único por usuario; idempotencia), sport ('running'|'cycling'), title, started_at, ended_at, moving_sec (tiempo activo sin pausas), pauses jsonb [{from,to}] en epoch ms, distance_m, elevation_gain_m, avg_hr (null), calories (null), splits jsonb [{km, sec}], track (polilínea completa: [[lat,lon,ele,t_ms,acc],...]), planned_route_id (null), visibility ('me'|'friends'|'public'), hide_endpoints (por defecto true), created_at.
  - El track completo NUNCA sale del servidor a otro usuario; terceros solo por RPC.
- planned_routes (siempre privadas, solo el dueño): id, user_id, name, sport, points, distance_m, elevation_gain_m (null), kind ('loop'|'out_and_back'|'point_to_point'), surface ('mixed'|'asphalt'|'trail'), origin ('ellie'|'manual'), created_at. Límite ~100 por usuario.
- route_generation_usage: uso diario de generate-route.
- social_settings (privacidad): route_default_visibility, route_hide_endpoints_default (true), route_auto_pause (true).

### RPC
- save_route_activity(_payload jsonb) → {ok, activity_id, counted_as_workout, points_awarded}
  - Payload: client_id, sport, title, started_at, ended_at, moving_sec, pauses, track, planned_route_id?, visibility?, hide_endpoints?, local_date (fecha local del dispositivo; si falta, se usa la UTC).
  - El servidor recalcula distancia, desnivel y parciales; no confía en las cifras del cliente.
  - Mismo client_id → devuelve la misma actividad.
  - Errores: invalid_sport, track_too_short (< 2 puntos), track_too_long (> 50.000 puntos), duration_too_long (> 24 h), moving_exceeds_duration, impossible_speed (running > 12 m/s, cycling > 25 m/s).
- update_route_activity_privacy(_activity_id, _visibility, _hide_endpoints). Pasar a 'me' borra su post de Comunidad.
- delete_route_activity(_activity_id). Revierte el entreno, sus minutos y sus aportes a retos no completados; recalcula los récords automáticos que salieran de ella.
- get_route_for_viewer(_activity_id)
  - Dueño: trazado completo, métricas y parciales.
  - Otros: según visibilidad ('public' cualquiera; 'friends' amistad aceptada; 'me' → not_allowed) y bloqueos (→ not_allowed). Con hide_endpoints, el trazado se recorta en el servidor 200 m al inicio y al final (medidos sobre el recorrido); si el total ≤ 400 m sale vacío. Simplificado (~300 puntos). Sin track completo, sin pausas y sin tiempos por punto.
  - Devuelve también: sport, title, started_at, moving_sec, distance_m, elevation_gain_m, splits, planned_route_name, owner {id, name, avatar_path}. [confirmar nombres exactos]
- get_recent_activities(_user_id, _limit): Perfil. Dueño = completas; otros = recortadas y simplificadas, con las mismas reglas.
- get_outdoor_month(_user_id) → {run_km, run_delta_km (vs mes anterior), bike_km}.
- get_today_route_activity() → última actividad de hoy del usuario o null (card de Inicio).
- save_planned_route(_payload), rename_planned_route(_id, _name), delete_planned_route(_id), get_my_planned_routes(). El servidor recalcula distance_m.

### Una Ruta cuenta como entreno
- Umbral: moving_sec ≥ 600 y distance_m ≥ 1000.
- Se crea una fila COMPLETADA en workout_sessions (source='route', route_activity_id, duration = minutos activos, sin workout_id). Así suma al anillo, la racha, get_progress_summary, social_activity y los retos de workouts y minutes_trained con la lógica existente.
- Evento workout_completed (50 pts) otorgado por el servidor, reference_id = activity_id.
- No cuenta para strength_sessions, mobility_minutes ni Core 33.
- save_route_activity solo añade además el aporte distance_km (sin doble conteo de workouts ni minutos).
- La app debe mostrar las sesiones con source='route' como Ruta (no como rutina vacía).

### Post de tipo route
- create_post('route', _source_id = activity_id). Solo el dueño; con visibilidad 'me' → route_private.
- Publicar dos veces la misma actividad → {ok:true, created:false, post_id: <el mismo>}.
- Adjunto (instantánea tomada en el servidor): sport, distance_km, duration_sec, pace_label ("5:24 /km", running) o avg_speed_kmh (cycling), elevation_m, planned_name, new_best ({distance_key, best_sec} o null) y polilínea YA recortada y simplificada, sin tiempos por punto.
- get_feed y get_post devuelven ese adjunto. Si se borra la actividad, se borra su post.

### generate-route (Edge Function)
- Entrada: {sport: 'running'|'cycling', origin: {lat, lon}, target_km, kind: 'loop'|'out_and_back'|'point_to_point', elevation: 'low'|'balanced'|'any', surface: 'any'|'asphalt'|'trail', seed: int}.
- Salida: {routes: [{polyline: [[lat,lon],...], distance_m, elevation_gain_m, surface, kind}]}; una ruta por llamada; otra seed = "Otra opción".
- Errores: invalid_params, no_route_found, rate_limited, provider_unavailable, unsupported_kind.
- Exige JWT de usuario. Límite por usuario (~20/día). Caché de 24 h. Clave ORS solo en el servidor (ORS_API_KEY).
- Atribución obligatoria en la app: "© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors".
- Las rutas generadas no se guardan hasta save_planned_route.
- Prueba real contra ORS pendiente: hacerla desde la app con sesión.

### Otros
- delete-account también borra route_activities, planned_routes y route_generation_usage.

---

## PARTE 2 · RETOS OFICIALES

### Métricas
- distance_km: solo por save_route_activity (no por add_manual_contribution). Se acumula en metros; se completa con goal × 1000. my_progress llega en km con 2 decimales. Columnas opcionales sport (null = running y cycling) y description. Borrar la actividad quita su aporte salvo en retos ya completados.
- exercise_reps: al completar una sesión suma las reps del ejercicio (exercise_id del catálogo MoveKit); no cuentan series de calentamiento. No admite aporte manual.
- strength_sessions: cuenta rutinas con routine_category en 'fuerza', 'tren_superior', 'tren_inferior' o 'core'. 'cuerpo_completo' y 'movilidad' no cuentan.
- mobility_minutes: rutinas de categoría 'movilidad'.
- Categorías de las 12 rutinas oficiales V1: 6 tren_superior, 3 tren_inferior, 3 cuerpo_completo.
- strength_sessions cuenta: fuerza, tren_superior, tren_inferior, core y cuerpo_completo. No cuentan movilidad ni otras.

### Puntos e insignia
- Al completar un reto oficial el servidor otorga official_challenge_completed (puntos = social_challenges.points) y la insignia badge_id, una sola vez por usuario y reto (se llama en social_contribution_progress).
- Retos entre amigos: 0 puntos.
- La app NO puede registrar official_challenge_completed ni social_challenge_completed (error server_only_event).
- Insignias actuales: official_12_strength y official_300_mobility (categoría 'retos'). Arte provisional.

### get_my_challenges
- Claves: active, invitations, recently_completed, official, official_upcoming (nueva).
- Por reto (active, recently_completed, official, official_upcoming): participants_count, my_status, unit ('km'|'reps'|'min'|'sessions'), exercise_name (localizado), badge {id, title, icon}, cover_url, people {total, preview: [{user_id, name, avatar_key, profile_photo_url, is_me}] hasta 3, yo primero}, leader {user_id, name, progress, is_me}. Solo yo y amigos no bloqueados.
- official: oficiales activos ya empezados. official_upcoming: aún no empiezan; se puede inscribir antes (my_status 'joined' o null); los aportes solo cuentan dentro del periodo. Al empezar, la tarea horaria avisa una vez a los inscritos (challenge_started).
- Portadas: bucket privado challenge-covers (lectura para cualquier usuario con sesión; subida solo moderadores o servidor). La app firma cover_path con createSignedUrls; no usa cover_url directamente.

---

## RÉCORDS DE RUTA
- Tabla route_personal_bests (solo lectura del dueño): user_id, sport, distance_key ('1k'|'5k'|'10k'|'21k'|'42k'), best_sec, activity_id, source ('auto'|'manual'), achieved_at.
- Automáticos: mejor tramo REAL del trazado (ventana deslizante con tiempos por punto, descontando pausas; descarta puntos con precisión > 50 m y tramos imposibles: más rápido que 2:30 min/km corriendo o que 72 km/h en bici). Solo si la actividad mide al menos esa distancia.
- Manual: set_route_personal_best(sport, distance_key, time_sec, achieved_at). Mismos límites de velocidad. Un manual solo lo reemplaza un automático más rápido.
- Borrar la actividad de un récord automático lo recalcula con las demás (o lo borra si no queda ninguna). Los manuales no se tocan.
- get_route_personal_bests() → {ok, bests: [{sport, distance_key, best_sec, activity_id, source, achieved_at}]}.
- new_best en el post de ruta: la distancia más larga cuyo récord salió de esa actividad, o null.

## create_post('route', activity_id)
- El post sale siempre con `audience: "friends"`, aunque la actividad tenga `visibility: "public"`. `visibility: "me"` sigue devolviendo `route_private`.
- Volver a compartir una ruta cuyo post se borró crea uno nuevo (`created:true`); antes devolvía el id del borrado.
- `visibility: "public"` en `save_route_activity` se sigue aceptando, pero hoy equivale a amigos.
