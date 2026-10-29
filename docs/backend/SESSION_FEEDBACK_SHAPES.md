# SESSION_FEEDBACK_SHAPES · Feedback durante y después del entreno

Versión de contrato: `sfb-1` · Lado: **backend (Lovable)** · La app se adapta después (Lote 5).
Fuente de diseño: handoff v2.18, §28.13 Modo foco. Incluye los mensajes de ELLIE en el descanso, el ajuste "Mensajes durante el entreno" y la valoración final de 1 a 5.

## Alcance

- **Lo guarda el backend:** las respuestas del usuario a los mensajes del descanso (cómo se siente y si tiene molestias) y la valoración final de la sesión, con su nota opcional.
- **Lo resuelve solo la app, sin backend:**
  - cuándo aparece cada mensaje: tipos, prioridad, máximo 4 por sesión, nunca en 2 descansos seguidos y nunca en descansos de menos de 30 s;
  - el ajuste "Mensajes durante el entreno" (Todos · Solo esenciales · Ninguno), que se guarda en el dispositivo;
  - los mensajes que no recogen respuesta: motivación, mitad de la sesión, último ejercicio y récord.
- **Hidratación ("+1 vaso" desde el mensaje):** usa la RPC de hidratación que ya existe. No hay nada nuevo.

## 1. Tablas

```sql
-- Respuestas durante la sesión (check-in y molestias)
workout_session_feedback (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users,
  session_id uuid not null,              -- sesión de entreno existente
  exercise_id uuid,                      -- ejercicio al que se refiere (null = general)
  kind text check (kind in ('effort','discomfort')),
  effort text check (effort in ('facil','bien','duro','al_limite')),            -- si kind = effort
  body_zone text check (body_zone in ('hombro','rodilla','espalda','codo','otra')), -- si kind = discomfort
  note text,                             -- opcional, máx. 280
  client_id text unique,                 -- idempotencia
  created_at timestamptz default now()
)

-- Valoración final (1 por sesión)
-- Preferible: columnas nuevas en la tabla de sesiones existente:
--   rating smallint check (rating between 1 and 5), rating_note text (máx. 500), rated_at timestamptz
-- Si no encaja, tabla aparte workout_session_rating (session_id pk, user_id, rating, note, rated_at).
```

**RLS:** cada usuario lee y escribe solo lo suyo, y `session_id` tiene que ser una sesión del propio usuario.

## 2. RPC

Todas devuelven `{ ok: true, ... }` o `{ ok: false, error: { code, message } }`, usan `auth.uid()` y son idempotentes.

### `log_session_feedback(p_session_id, p_exercise_id, p_kind, p_effort, p_body_zone, p_note, p_client_id)`

- Valida que la combinación tenga sentido: con `effort` requiere `p_effort`; con `discomfort` requiere `p_body_zone`.
- Si `p_client_id` se repite, devuelve el mismo registro.
- Respuesta: `{ ok: true, id }`.

### `rate_session(p_session_id, p_rating, p_note)`

- `p_rating` va de 1 a 5. Si ya existía una valoración, se sobrescribe (el usuario puede corregirla).
- Respuesta: `{ ok: true }`.

**Sesión aún sin sincronizar:** si la app envía feedback de una sesión que todavía no está en el servidor, se responde `session_not_found`. La app lo deja en cola y lo reintenta después de sincronizar la sesión.

## 3. Integración con ELLIE (contexto)

Cuando se aplique `ELLIE_CONTEXT_SHAPES` (ctx-1), estos datos alimentan:

- **`signals.discomforts`:** las molestias de los últimos 14 días, en el formato `[{ body_zone, exercise, relative: "hace 2 días", count }]`.
- **`last_7_days[].workout`:** añade `effort_summary`, la sensación más frecuente de la sesión, y `rating` (1–5).

**Reglas para ELLIE:**
- Si hay una molestia reciente en una zona, ELLIE la tiene en cuenta al proponer ejercicios (variantes o menos carga) y lo dice.
- ELLIE **no diagnostica**. Si la molestia se repite (3 o más veces en 14 días), sugiere consultar a un profesional.

Si ctx-1 aún no está aplicado, se deja preparado y se integra cuando lo esté.

## 4. Escenarios de verificación

1. Registrar "Duro" en una sentadilla. Queda guardado con `effort = 'duro'` y su `exercise_id`.
2. Registrar una molestia en la rodilla con nota. Queda guardada, y un segundo envío con el mismo `client_id` no la duplica.
3. Enviar `discomfort` sin `body_zone` devuelve un error de validación.
4. Valorar una sesión con 4 y luego con 5 deja la valoración en 5.
5. Valorar la sesión de otro usuario da error.
6. Feedback de una sesión inexistente devuelve `session_not_found`.

## 5. Entregables de Lovable

1. Qué tabla de sesiones existe y dónde quedó la valoración (columnas o tabla aparte).
2. Las tablas, la RLS y la firma final de las 2 RPC.
3. El resultado de los escenarios 1 a 6.
