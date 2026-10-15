# VISIÓN · Contratos backend ↔ app (Calorías + Escaneo de máquina)

Proveedor y modelo: los mismos de ELLIE (`google/gemini-3-flash-preview`, secret `LOVABLE_API_KEY` solo en el servidor).
Formato: `{ "ok": true, ... }` o `{ "ok": false, "error": "<código>", "message": "texto en el idioma del usuario" }`.
Todo requiere el JWT del usuario. Sin sesión (o con la clave pública) → 401.
Idioma: `profiles.language` (`es` | `en`). Día: medianoche en `profiles.timezone` (fallback `America/Santiago`).

## 1. Subida de fotos
Bucket privado `ellie-uploads` (5 MB; jpeg, png, webp o heic). Cada usuario solo escribe en su carpeta.
- Comida (Calorías): `<uid>/meals/<uuid>.jpg`
- Máquina: `<uid>/machines/<uuid>.jpg`
- Chat de ELLIE: `<uid>/<uuid>.jpg` (sin cambios)

Limpieza diaria (03:27 UTC): se borran los archivos de `meals/` y `machines/` con más de 24 h que no usa ninguna comida guardada, ningún escaneo ni ningún mensaje. Se conservan las fotos de comidas guardadas, los escaneos de máquina y las fotos del chat.

## 2. POST /functions/v1/ellie-vision
```json
{
  "mode": "meal | machine",
  "image_path": "<uid>/meals/... | <uid>/machines/...",
  "client_request_id": "string 1..64 | null",
  "hint": "string <=200 | null"
}
```
- `hint`: nota opcional del usuario (p. ej. "es medio plato").
- `client_request_id` (solo `machine`): si se repite, devuelve el mismo escaneo (`replayed: true`) y no cobra cupo.

### mode = meal (no guarda nada)
```json
{
  "ok": true,
  "draft": {
    "title": "Pollo a la plancha con arroz y brócoli",
    "meal_type_suggestion": "breakfast | lunch | dinner | snack | null",
    "items": [
      { "name": "Pechuga de pollo a la plancha", "grams": 150, "kcal": 248, "protein": 46, "carbs": 0, "fats": 6 }
    ],
    "totals": { "kcal": 490, "protein": 53, "carbs": 51, "fats": 7 },
    "confidence": 0.9,
    "warnings": ["Los valores pueden variar según el aceite usado."],
    "image_path": "<uid>/meals/..."
  },
  "usage": { "kind": "meal", "used": 1, "limit": 10, "remaining": 9 }
}
```
- Los totales los calcula el servidor sumando los items.
- La app muestra el borrador editable y solo guarda al confirmar, con `save_meal` y `source = 'photo'`.

### mode = machine
```json
{
  "ok": true,
  "scan_id": "uuid",
  "match": "confident | ambiguous",
  "equipment": { "id": "uuid", "slug": "barbell", "name": "Barra" },
  "confidence": 0.9,
  "candidates": [{ "equipment_id": "uuid", "slug": "barbell", "name": "Barra", "confidence": 0.9 }],
  "exercise_ids": ["uuid"],
  "exercises": [{ "id": "uuid", "slug": "barbell-back-squat", "name": "Sentadilla trasera con barra" }],
  "usage": { "kind": "machine", "used": 1, "limit": 10, "remaining": 9 }
}
```
- El modelo solo puede elegir entre los equipos de la tabla `equipment` que le pasa el servidor; si propone algo fuera de esa lista, se descarta.
- `exercise_ids` y `exercises`: todos los ejercicios activos del catálogo que usan ese equipo, con el nombre en el idioma del usuario.
- `confident` = confianza ≥ 0,6. `ambiguous` = confianza < 0,6: `equipment` es null, `exercise_ids` llega vacío y `candidates` trae hasta 3 opciones. El usuario elige una y la app llama:
  - `choose_machine_candidate(_scan_id, _equipment_id)` → `{ ok, equipment_id, exercise_ids }`. Solo acepta equipos que estén en `candidates`; si no, `invalid_input`.
- `candidates` siempre trae las opciones consideradas, también cuando el resultado es `confident`.
- Historial: tabla `machine_scans` (el dueño puede leerla): `id, image_path, equipment_id, confidence, match, candidates, exercise_ids, chosen_equipment_id, client_request_id, created_at`. ELLIE recibe los últimos 5 escaneos como contexto.

### Errores
| HTTP | error | notas |
|---|---|---|
| 400 | invalid_input | `details` por campo |
| 401 | unauthorized | sin JWT de usuario válido |
| 403 | image_forbidden | ruta fuera de `<uid>/meals/` (meal) o `<uid>/machines/` (machine) |
| 404 | image_not_found | |
| 413 | image_too_large | más de 5 MB |
| 415 | image_type | solo jpeg/png/webp/heic |
| 422 | not_food | la foto no muestra comida (meal). **Se devuelve el cupo.** Incluye `usage` |
| 422 | low_confidence | no se reconoce ninguna máquina ni candidato (machine). **Se devuelve el cupo.** Incluye `usage` |
| 429 | daily_image_limit | cupo de análisis de imagen agotado; `used`, `limit` |
| 429 | daily_machine_limit | cupo de escaneos de máquina agotado; `used`, `limit` |
| 429 | vision_attempts_limit | tope de intentos de fotos del día; `used`, `limit` |
| 429 | rate_limited | límite de la pasarela de IA; reintentar más tarde con espera creciente |
| 402 | ai_credits_exhausted | |
| 403 | ai_forbidden | |
| 502 | ai_unavailable | reintentable |
| 500 | internal | |

Si la IA falla (402/403/429/502/500), el cupo también se devuelve.

## 3. Cupos (`ellie_limits()`)
```json
{ "messages": 40, "image_analyses": 10, "machine_scans": 10, "vision_attempts": 20 }
```
- `image_analyses` (10/día): cupo compartido. Lo usan los análisis de comida en Calorías y las fotos en el chat de ELLIE.
- `machine_scans` (10/día): cupo propio de los escaneos de máquina.
- `vision_attempts` (20/día): suma todos los intentos con foto (comida, máquina y chat), **también los devueltos**. Nunca se descuenta. Se revisa antes que los demás cupos.
- `get_ellie_usage()` → `{ ok, day, used, limit, image_analyses_used, image_analyses_limit, machine_scans_used, machine_scans_limit, vision_attempts_used, vision_attempts_limit }`.

## 4. Comidas (RPC con JWT)
Tabla `nutrition_meals`. El dueño puede leerla directamente; solo se escribe con las RPC:
`id, local_date, meal_type (breakfast|lunch|dinner|snack), source (photo|repeat|manual|chat), title, items [{name, grams, kcal, protein, carbs, fats}], kcal, protein, carbs, fats, image_path, confidence, repeated_from, chat_message_id, created_at, updated_at`.

| RPC | Entrada | Salida |
|---|---|---|
| `save_meal(_payload)` | `{ source: photo\|manual\|chat, meal_type, title, items?, kcal, protein?, carbs?, fats?, local_date?, image_path?, confidence?, chat_message_id? }` | `{ ok, meal }` |
| `update_meal(_id, _payload)` | campos parciales: `meal_type, local_date, title, items, kcal, protein, carbs, fats` | `{ ok, meal }` |
| `delete_meal(_id)` | | `{ ok }` |
| `repeat_meal(_id, _local_date?, _meal_type?)` | copia items y totales, sin foto | `{ ok, meal }` (`source = 'repeat'`) |
| `get_recent_meals(_limit = 20)` | para "Repetir"; una por título, máx. 50 | `{ ok, meals }` |
| `get_nutrition_day(_date?)` | por defecto, hoy | `{ ok, date, is_today, meals, totals{kcal,protein,carbs,fats}, goal{source, plan_id, kcal, protein, carbs, fats}, remaining{kcal,protein,carbs,fats} }` |

- "Añadir a mano": `save_meal` con `source = 'manual'`, `items = []` y solo `kcal` (las macros son opcionales).
- `image_path` debe estar en la carpeta del usuario y existir; si no, `image_forbidden`.
- `local_date`: de hoy − 60 días a hoy + 1.
- Errores: `unauthorized`, `invalid_input` (con `field` cuando aplica), `image_forbidden`, `not_found`.
- **Meta** (`goal.source`): `plan` = plan nutricional activo más reciente; si no hay, `profile` = metas del perfil; si tampoco, `none`. En ese caso las metas y `remaining` llegan en null.
- **`daily_nutrition_logs`** pasa a ser el total del día calculado desde las comidas. Se recalcula solo al guardar, editar, repetir o borrar, y reemplaza lo escrito a mano ese día. **La app ya no debe escribir totales ahí.**

## 5. Foto de comida en el chat de ELLIE
Ver `ELLIE_SHAPES.md` → tool `meal_analysis`. La app muestra "Registrar en Calorías" y llama `save_meal` con `source = 'chat'`, `chat_message_id = message.id` y el `image_path` del chat.
