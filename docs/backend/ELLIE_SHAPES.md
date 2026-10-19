# ELLIE · Contratos backend ↔ app

Modelo: `google/gemini-3-flash-preview` (Lovable AI). Secret: `LOVABLE_API_KEY` (solo servidor).

## POST /functions/v1/ellie-chat
Headers obligatorios: `Authorization: Bearer <jwt del usuario>`, `Content-Type: application/json`.
Sin sesión (o con la clave pública) → 401.

### Entrada
```json
{
  "conversation_id": "uuid | null",
  "client_message_id": "string 1..64",
  "message": "string 1..4000",
  "image_path": "<uid>/<archivo>.jpg|jpeg|png|webp|heic | null",
  "mode": "chat | generate_workout | generate_nutrition",
  "stream": false,
  "client_context": "string <=4000 | null"
}
```
- `conversation_id` null → el servidor crea una conversación (título = primeros 60 caracteres).
- `client_message_id`: idempotencia. Repetir el mismo id devuelve la respuesta ya guardada (`replayed: true`) sin cobrar cupo.
- El servidor carga el historial (últimos 20 mensajes de la conversación) y el contexto del usuario: perfil, objetivos, restricciones, equipo, entrenos, agua y nutrición de 14 días, comidas registradas de 14 días, plan nutricional activo, últimos 10 récords y últimos 5 escaneos de máquina.
- `client_context`: notas opcionales de la app, tratadas como menos confiables.
- Idioma: `profiles.language` (`es` | `en`, por defecto `es`). Afecta a la respuesta, a los textos de los planes y a los nombres de los ejercicios (si falta la traducción, se usa `en`).

### Salida JSON (stream=false)
```json
{
  "ok": true,
  "replayed": false,
  "conversation_id": "uuid",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "markdown",
    "tool": null,
    "created_at": "iso"
  },
  "usage": { "used": 3, "limit": 40, "remaining": 37, "image_analyses_used": 1, "image_analyses_limit": 10 }
}
```
`tool`, cuando hay plan:
- `{ "type": "generate_workout_plan", "data": { intro_message, title, description, type, difficulty, duration, calories, target_muscles, exercises: [{ exercise_id, slug, name, sets, reps, duration, rest_time, notes }], dropped_exercises } }`
  - `exercise_id` siempre es un ejercicio real activo del catálogo MoveKit. Si la IA propone algo que no existe en el catálogo, se descarta y se cuenta en `dropped_exercises`.
- `{ "type": "generate_nutrition_plan", "data": { intro_message, target_calories, target_protein, target_carbs, target_fats, notes } }`
- `{ "type": "meal_analysis", "data": { intro_message, title, meal_type_suggestion, items: [{ name, grams, kcal, protein, carbs, fats }], totals: { kcal, protein, carbs, fats }, confidence, warnings, image_path } }`
  - Solo puede aparecer si el mensaje trae `image_path` y la foto es comida. Mismo formato que el borrador de `ellie-vision` (mode=meal), más `intro_message`.
  - La app muestra "Registrar en Calorías" y llama `save_meal` con `source='chat'`, `chat_message_id = message.id` y el mismo `image_path` (ver `VISION_SHAPES.md`).
  - Consume un único `image_analyses`; no hay cobro extra. Los tipos anteriores no cambian; si la app no reconoce el tipo, puede mostrar solo `content`.

Con un plan, `content` = `intro_message`.

### Salida SSE (stream=true, `text/event-stream`)
```
event: meta   data: {"conversation_id":"uuid"}
event: delta  data: {"text":"..."}            (0..n)
event: tool   data: {"type":"...","data":{...}} (0..1)
event: done   data: {"ok":true,"message_id":"uuid","usage":{...}}
event: error  data: {"ok":false,"error":"ai_unavailable","message":"..."}
```
Los errores previos al stream (auth, validación, cupo) se devuelven como JSON con su código HTTP.

### Errores
`{ "ok": false, "error": "<código>", "message": "texto seguro en el idioma del usuario", ... }`

| HTTP | error | notas |
|---|---|---|
| 400 | invalid_input | `details` por campo |
| 401 | unauthorized | sin JWT de usuario válido |
| 403 | image_forbidden | ruta fuera de `<uid>/` |
| 403 | ai_forbidden | el proveedor de IA rechazó la solicitud |
| 404 | conversation_not_found / image_not_found | |
| 409 | duplicate_in_progress | mismo `client_message_id` todavía en curso |
| 413 | image_too_large | más de 5 MB |
| 415 | image_type | solo jpeg/png/webp/heic |
| 429 | daily_limit / daily_image_limit / vision_attempts_limit | `used`, `limit` |
| 429 | rate_limited | límite de la pasarela de IA; reintentar más tarde con espera creciente |
| 402 | ai_credits_exhausted | |
| 502 | ai_unavailable | |
| 500 | internal | |

Si la IA falla (402/403/429 de la pasarela, 502 o 500), **el cupo se devuelve** y el mensaje del usuario no se guarda, así que se puede reintentar con el mismo `client_message_id`.

## Imágenes
1. Subir a storage `ellie-uploads/<uid>/<uuid>.jpg`. El bucket es privado, admite hasta 5 MB y cada usuario solo puede leer, subir y borrar en su propia carpeta.
2. Enviar `image_path`. El servidor valida dueño, tipo y tamaño, y pasa al modelo una URL firmada de 5 min.

## Límite diario
- 40 mensajes por día y 10 análisis de imagen por día, iguales para todos. Las constantes están en `public.ellie_limits()` → `{ messages: 40, image_analyses: 10, machine_scans: 10, vision_attempts: 20 }`.
- Una foto en el chat también suma 1 a `vision_attempts` (20/día, incluye intentos devueltos y nunca se descuenta). Al llegar al tope → 429 `vision_attempts_limit`.
- `image_analyses` es el **cupo compartido de análisis de imagen**: una foto en el chat de ELLIE y un análisis de comida en Calorías (`ellie-vision` mode=meal) cuentan igual. Ver `VISION_SHAPES.md`.
- El día se calcula con `profiles.timezone` (IANA, ej. `America/Mexico_City`). Si está vacío o no es válido, se usa `America/Santiago`.

### profiles.timezone
Columna `text` nullable. La app la envía y actualiza con la zona IANA del dispositivo:
`update profiles set timezone = '<IANA>' where id = auth.uid()` (RLS de dueño).

### RPC
`get_ellie_usage()` → `{ ok, day, used, limit, image_analyses_used, image_analyses_limit, machine_scans_used, machine_scans_limit, vision_attempts_used, vision_attempts_limit }` · sin sesión → `{ ok:false, error:'unauthorized' }`.

## Historial (lectura directa con JWT, RLS de dueño)
- `ellie_conversations`: `id, user_id, title, created_at, updated_at`. Se puede renombrar (`title`) y borrar; al borrar una conversación se borran sus mensajes.
- `chat_messages`: `id, conversation_id, role (user|assistant), content, image_path, tool_type, tool_data, created_at`, más `client_message_id`, `model`, `input_tokens` y `output_tokens`.
  - Ordenar por `created_at`.
  - **La app no inserta mensajes**: los escribe solo `ellie-chat`. La app puede leerlos y borrarlos.
- Los mensajes anteriores a este cambio están en una conversación por usuario titulada **"Historial anterior"**.
- `chat_messages.tool_type`: `generate_workout_plan | generate_nutrition_plan | meal_analysis`.

## Cambios Lote 2 (IA)
- **Foto en el chat**: la imagen se envía al modelo reducida a ~1024 px e incrustada en base64, con razonamiento mínimo, un límite de salida y 20 s de límite en el servidor. Si se pasa → **504 `ai_timeout`** (en SSE, `event: error` con `error: "ai_timeout"`); se devuelve el cupo y el mensaje no se guarda. El chat solo de texto no cambia.
- La idempotencia del chat con foto sigue siendo `client_message_id`: un reintento devuelve la respuesta ya guardada sin cobrar.
- **`meal_analysis`**: los items traen los campos por unidad y la validación de kcal descritos en `VISION_SHAPES.md` §6.
- **Contexto (B-25)**: el agua siempre en vasos de 250 ml y en ml (`daily_hydration_logs` + `profiles.daily_water_goal` en vasos), con el consumo y la meta de hoy según `profiles.timezone`. Las kcal registradas salen de `daily_nutrition_logs`; los días entrenados, sesiones, minutos y volumen de 14 días, solo de `workout_sessions` con `status='completed'`.
- **Tono (B-24)**: 2–5 frases, sin títulos, como mucho una lista breve, negrita solo para una cifra clave, emojis con moderación y siempre termina con una pregunta o sugerencia concreta.

| HTTP | error | notas |
|---|---|---|
| 504 | ai_timeout | solo con imagen; cupo devuelto; reintentable con el mismo `client_message_id` |
