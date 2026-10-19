# Rutinas y catálogo · Contratos backend ↔ app

Todas las RPC se llaman con el JWT del usuario (`supabase.rpc(...)`). Sin sesión → `{ ok:false, error:'unauthorized' }` (con la clave pública, la llamada se rechaza con un error de permisos).

## Modelo único de rutina
Oficiales, editoriales, del usuario y de ELLIE viven en `workout_templates` + `template_exercises`. `origin` lo calcula el backend:
- `official`: `source = 'athelete_official:<slug>'`, públicas, sin dueño.
- `editorial`: `source = 'featured_editorial:<slug>'`. Hoy están todas archivadas (las sustituye F-01).
- `ellie`: `source = 'ellie:<chat_message_id>'` (o `'ellie'` en las antiguas); el dueño es el usuario.
- `user`: `source = 'custom'`; el dueño es el usuario.

Visible si es pública o propia. Solo el dueño edita o borra.
`archived_at` no nulo = archivada: no sale en `list_routines` ni en `get_today_suggestion`, pero `get_routine` la sigue devolviendo (historial, favoritos, enlaces).

Ejercicio de rutina:
- `block`: `warmup | main | cooldown` (por defecto `main`; para el calentamiento de F-06).
- `position`: base 1, el orden en que la app lo envió.
- Orden de lectura: warmup → main → cooldown.

**Para abrir el detalle o pulsar Comenzar, usa siempre `get_routine(id)`, no una lista cacheada** (causa de B-03).

## save_user_routine(_payload jsonb)
```json
{
  "title": "1..80",
  "description": "string? ≤1000",
  "type": "strength | cardio | fullbody | mobility | hiit (por defecto strength)",
  "difficulty": "beginner | intermediate | advanced (por defecto intermediate)",
  "duration": 45,
  "calories": 0,
  "target_muscles": ["chest"],
  "routine_category": "fuerza | tren_superior | tren_inferior | core | cuerpo_completo | movilidad | … (opcional; si falta se deriva de type)",
  "origin": "user | ellie",
  "chat_message_id": "uuid? (rutinas de ELLIE)",
  "exercises": [
    { "exercise_id": "uuid", "block": "main", "sets": 3, "reps": 10,
      "duration": null, "rest_time": 60, "notes": null, "planned_weight_kg": null }
  ]
}
```
- De 1 a 40 ejercicios. Límites: sets 1–20, reps 1–200, duration 0–7200 s, rest_time 0–900 s (por defecto 60).
- Cada `exercise_id` debe existir y estar activo en el catálogo; si no → `exercise_not_found` con la lista `exercise_ids`.
- El nombre del ejercicio lo pone el servidor desde el catálogo.
- **ELLIE:** envía `chat_message_id = message.id` del mensaje con `tool.type = 'generate_workout_plan'` y `exercises` = `tool_data.exercises`. Un mensaje = una rutina: si se guarda otra vez, devuelve la misma con `replayed: true`. El mensaje debe ser del usuario y de ese tipo; si no → `chat_message_not_found`.

→ `{ ok:true, replayed:false, routine }` (`routine` con el formato de `get_routine`).

## update_user_routine(_id uuid, _payload jsonb)
Mismo payload. Reemplaza los ejercicios. Solo rutinas propias y no archivadas.
→ `{ ok:true, routine }` · `routine_not_found`.

## delete_user_routine(_id uuid)
→ `{ ok:true, archived:false }` si se borra. El historial de sesiones conserva `workout_title`.
→ `{ ok:true, archived:true }` si una publicación la comparte: se archiva en vez de borrarse.
Quita la rutina de favoritos en ambos casos.

## get_routine(_id uuid)
```json
{ "ok": true, "routine": {
  "id": "uuid", "title": "…", "description": null, "type": "strength", "difficulty": "intermediate",
  "duration": 45, "calories": 300, "target_muscles": [], "routine_category": "tren_superior",
  "origin": "official | editorial | ellie | user", "is_mine": false, "can_edit": false, "archived": false,
  "thumb_key": "movekit/thumbs/<slug>.webp", "created_at": "iso", "updated_at": "iso",
  "exercises": [{ "id": "uuid", "exercise_id": "uuid", "block": "main", "position": 1, "name": "…",
    "sets": 3, "reps": 10, "duration": null, "rest_time": 60, "notes": null, "planned_weight_kg": null,
    "thumb_key": "movekit/thumbs/<slug>.webp", "tracking_metrics": ["reps","weight"], "is_unilateral": false }]
}}
```
Nombres en `profiles.language` (si falta la traducción, en inglés). Error: `routine_not_found`.

## list_routines(_scope text = 'all', _limit int = 20, _cursor text = null)
- `_scope`: `all | official | mine`. `_limit` ≤ 50. Sin archivadas.
- Orden: más recientes primero.
→ `{ ok, items: [{ id, title, type, difficulty, duration, calories, routine_category, origin, is_mine, target_muscles, exercise_count, thumb_key, created_at }], next_cursor }`
Para la página siguiente, pasa `next_cursor`; si es `null`, no hay más. La miniatura viene incluida, sin pedir ejercicio por ejercicio.

## get_today_suggestion(_tz text = null)
`_tz` opcional; si no, se usa `profiles.timezone` (por defecto `America/Santiago`).
```json
{ "ok": true, "source": "rules | weekly_plan | none",
  "suggestion": { "routine_id": "uuid", "title": "…", "routine_category": "tren_inferior",
    "zone": "upper | lower | core | full | mobility | cardio | other",
    "difficulty": "intermediate", "duration": 45, "origin": "official",
    "reason": "Ayer hiciste tren superior", "reason_code": "first | trained_today | alternate_<zona> | balance",
    "last_zone": "upper", "date": "YYYY-MM-DD" } }
```
Reglas:
1. Si existe el plan semanal (F-02) con entrada para hoy, manda ese (`source: 'weekly_plan'`).
2. No repite rutinas completadas en las últimas 48 h.
3. Prioriza zonas distintas a las entrenadas en esas 48 h.
4. Si hoy ya entrenó, prioriza movilidad.
5. Se acerca a `training_level` y a `preferred_session_minutes`.
6. Excluye rutinas que necesiten equipo que el usuario no tiene. Cuenta solo barra, mancuernas, cable, máquinas, bandas y kettlebell; si `available_equipment` está vacío, no filtra.
7. Prefiere las rutinas propias.
8. La misma sugerencia durante todo el día.
`reason` sale en el idioma del perfil (`es`/`en`). `suggestion: null` con `source: 'none'` si no hay ninguna candidata.

## Catálogo
### catalog_version()
→ `{ ok, version: "md5", exercises: 582 }`. Guarda el catálogo en el dispositivo y pide la lista de nuevo solo si cambia `version`.

### list_exercises(_muscle, _equipment, _pattern, _difficulty, _q, _locale, _cursor, _limit = 30)
- Filtros por slug: músculo (`muscles.slug`), equipo (`equipment.slug`), patrón (`movement_patterns.slug`), `_difficulty` (`beginner|intermediate|advanced`).
- `_q`: búsqueda por nombre o alias en el idioma pedido y en inglés.
- `_locale`: `es|en` (por defecto, el del perfil). `_limit` ≤ 100.
- Orden alfabético por nombre.
→ `{ ok, locale, items: [{ id, slug, name, difficulty, primary_muscle, equipment: ["dumbbell","bench"], thumb_key }], next_cursor }`

### get_exercise(_id uuid, _locale text = null)
→ `{ ok, exercise: { id, slug, difficulty, locale, tracking_metrics, is_unilateral, pr_eligible, name, aliases, short_description, long_description, instructions, common_mistakes, benefits, use_cases, tags, muscles: [{ slug, role, name }], equipment: [{ slug, name }], patterns: [slug], media: [{ kind: 'video'|'poster'|'thumb', key, mime_type, width, height, file_size_bytes, duration_seconds }] } }` · `exercise_not_found`.

## Media · función exercise-media-url
`POST /functions/v1/exercise-media-url` con JWT, `{ keys: string[] (1..100) }` → `{ urls: { [key]: { url, expires_at } }, missing: string[] }`.
- Claves válidas: `movekit/videos/*.mp4`, `movekit/posters/*.png|jpg|webp`, `movekit/thumbs/*.webp`.
- Caducidad: 1 h para todo, también para las miniaturas (cambiable en el servidor sin tocar la app). Respeta `expires_at`.
- Firma solo las claves de la página visible: una llamada por página de 30.
- Miniatura: WebP de 400×~223 px, unos 2 KB (máx. ~3 KB). Póster original: ~3 MB. Usa `thumb_key` en listas y tarjetas, y el póster solo en el detalle.

## Errores
| error | cuándo |
|---|---|
| unauthorized | sin sesión |
| invalid_input (+`field`) | `title`, `type`, `difficulty`, `exercises`, `exercises[]`, `chat_message_id`, `scope`, `cursor` |
| exercise_not_found (+`exercise_ids`) | algún ejercicio no existe o no está activo |
| routine_not_found | no existe, no es visible o no es tuya (al editar o borrar) |
| chat_message_not_found | `chat_message_id` no es un plan de ELLIE tuyo |

## Escritura directa (transitoria)
La app todavía puede escribir directamente en `workout_templates` y `template_exercises`. Pásate a las RPC: esos permisos se quitarán en el endurecimiento.

## Cambios Lote 2
### list_exercises(_muscle, _equipment, _pattern, _difficulty, _q, _locale, _cursor, _limit = 30, _muscles text[] = null)
- `_muscles`: lista de slugs de músculo (máx. 20); el ejercicio entra si trabaja **cualquiera** de ellos. Se combina con `_muscle` (que sigue funcionando igual). Más de 20 → `invalid_input` con `field: "muscles"`.

### list_exercises(..., _muscles text[] = null, _equipments text[] = null)
- `_equipments`: lista de slugs de equipo (máx. 10); el ejercicio entra si usa **cualquiera** de ellos. Se combina con `_equipment` (que sigue funcionando igual). Más de 10 → `invalid_input` con `field: "equipments"`.
