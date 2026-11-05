# COACH_SHAPES · ATHELETE COACH (MVP beta)

Versión de contrato: `coach-1` · Lado: **backend** (Codex escribe y se ejecuta en el SQL editor; las Edge Functions se despliegan con un mensaje corto a Lovable) · La app se adapta después.
Fuente de diseño: handoff v2.20, sección ATHELETE COACH.

## 0. Decisiones de producto (definitivas)

- **Rol coach:** se activa a mano durante la beta (`profiles.is_coach = true`, desde el SQL editor). No hay autorregistro.
- **Límite:** cada coach tiene un máximo de **30 alumnos** activos o pendientes (`coach_max_students`, por defecto 30).
- **Un coach por alumno:** un alumno solo puede tener un vínculo `active` o `pending`.
- **Consentimiento por categorías.** Lo controla siempre el alumno, que puede cambiarlo o desvincularse cuando quiera:
  - `training`: obligatoria, siempre `true`.
  - `nutrition`: opcional, `false` por defecto.
  - `body`: opcional, `false` por defecto; cubre peso, sueño y molestias.
- **Rutina asignada = copia.** El alumno recibe una plantilla propia que no cambia si el coach edita la suya. Para actualizarla, el coach la reasigna. Mientras la asignación está activa, `get_routine` devuelve `can_edit: false`; al desvincular, la copia pasa a `can_edit: true`.
- **Nutrición del coach:** solo se activa si el alumno la **acepta**. Mientras no la acepte, sigue con su plan o su estimación.
- **ELLIE respeta el plan del coach:** no lo reemplaza; propone comidas que encajan en esos objetivos.
- **El coach solo ve** a los alumnos vinculados (`active`) y solo las categorías que cada uno comparte. Nunca ve conversaciones con ELLIE, publicaciones "Solo amigos" ni ningún dato que no esté en este contrato.

## 1. Antes de cambiar nada: inventario

Antes de crear nada, hay que reportar lo que existe hoy para:
- rutinas (`workout_templates`, `template_exercises`, `get_routine`, `save_user_routine`, `list_routines`);
- semana planificada (`weekly_plans`, `weekly_plan_days`, `get_week_plan`);
- sesiones (`workout_sessions`, `workout_session_sets`) y feedback de sesión (sfb-1);
- nutrición (`nutrition_plans`, `compute_nutrition_targets` / `nut_targets`, `activate_nutrition_plan`);
- peso (`weight_logs`), sueño (`sleep_nights`) y molestias;
- push (`push_outbox`, `send-push`) y `delete-account`.

**Reglas:**
- Reutilizar todo lo que se pueda.
- No romper la app actual.
- No duplicar ejercicios ni la lógica de entrenamiento.

## 2. Modelo de datos

```sql
-- Rol
alter table profiles add column if not exists is_coach boolean not null default false;
alter table profiles add column if not exists coach_max_students smallint not null default 30;

-- Código de invitación del coach (uno vigente por coach; se puede regenerar)
coach_invites (
  code text pk,                       -- 'ATH-7K2Q' (8 chars, sin caracteres ambiguos 0/O/1/I)
  coach_id uuid not null,
  created_at timestamptz default now(),
  revoked_at timestamptz
)

-- Vínculo coach–alumno
coach_links (
  id uuid pk default gen_random_uuid(),
  coach_id uuid not null,
  student_id uuid not null,
  status text check (status in ('pending','active','ended')) not null,
  share_training boolean not null default true,     -- siempre true
  share_nutrition boolean not null default false,
  share_body boolean not null default false,         -- peso, sueño, molestias
  invited_via text check (invited_via in ('code','link')),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  ended_by text check (ended_by in ('coach','student','system'))
)
-- índice único parcial: un solo vínculo pending/active por alumno
-- índice único parcial: (coach_id, student_id) pending/active

-- Asignación de rutina (copia para el alumno)
coach_routine_assignments (
  id uuid pk default gen_random_uuid(),
  link_id uuid not null references coach_links(id),
  coach_id uuid not null, student_id uuid not null,
  source_template_id uuid,            -- plantilla del coach o del catálogo (referencia histórica)
  student_template_id uuid not null,  -- COPIA creada para el alumno (archivada: no sale en "Mis rutinas" del alumno, sí en su sección de coach)
  days smallint[] not null,           -- ISO 1–7 (lunes = 1)
  day_split jsonb,                    -- opcional: {"1":"A","2":"B",...} si la rutina tiene días A/B
  start_date date not null,
  weeks smallint,                     -- null = sin fin
  note text,                          -- máx. 500
  status text check (status in ('active','replaced','ended')) not null default 'active',
  created_at timestamptz default now()
)
-- una sola asignación 'active' por alumno

-- Objetivos nutricionales del coach
coach_nutrition_assignments (
  id uuid pk default gen_random_uuid(),
  link_id uuid not null, coach_id uuid not null, student_id uuid not null,
  mode text check (mode in ('same','train_rest')) not null,
  targets jsonb not null,             -- {kcal, protein_g, carbs_g, fat_g} o {train:{…}, rest:{…}}
  note text,
  status text check (status in ('pending','accepted','declined','replaced','ended')) not null default 'pending',
  created_at timestamptz default now(),
  responded_at timestamptz
)
```

**RLS:**
- Todas las tablas nuevas tienen **lectura solo por RPC** y **escritura solo por RPC** (`SECURITY DEFINER`, `auth.uid()`). La app no accede a ellas directamente.
- Una función interna `coach_can_see(p_coach, p_student, p_category)` decide si el coach puede ver algo de ese alumno: exige vínculo `active` y la categoría compartida. **Todas** las RPC del coach la usan.

## 3. RPC · Coach

Todas devuelven `{ ok: true, ... }` o `{ ok: false, error: "<code>" }`, con el formato plano del proyecto. Todas exigen `profiles.is_coach = true`; si no, devuelven `not_coach`.

- **`coach_get_invite()`** → `{ code, url }`. Crea el código si no existe. La URL tiene el formato `athelete://coach/join?code=ATH-7K2Q`; el enlace universal se añadirá más adelante.
- **`coach_regenerate_invite()`** → revoca el código anterior y devuelve uno nuevo.
- **`coach_list_students()`** → `{ stats: { students, max, with_routine, with_nutrition }, students: [...] }`. Cada alumno trae:
  - `link_id`, `status` (`pending` o `active`), `name`, `avatar`;
  - `nutrition_status`: `none`, `pending`, `accepted`, `declined` o `not_shared`; `invite_created_at` solo en vínculos `pending`;
  - el bloque `shares { training, nutrition, body }`;
  - `routine`: `{ title, days_per_week }` o `null`;
  - `week`: `{ done, planned }`;
  - `last_session_at`, `days_inactive`;
  - `flags`, con valores como `inactive_7d` o `invite_pending`.
- **`coach_get_student(p_link_id)`** → el detalle del alumno:
  - **perfil:** nombre, nivel y objetivo;
  - **shares;**
  - **esta semana:** cada día con `planned` / `done` / `missed`, la adherencia en % y la última sesión con su `rating`;
  - **rutina asignada:** título, días, nota y `student_template_id`;
  - **nutrición:** solo si `share_nutrition`; si no, `null` con la marca `locked: true`;
  - **body:** peso (tendencia de 4 semanas), sueño (promedio de 7 noches) y molestias recientes de los últimos 14 días; solo si `share_body`, si no, `locked: true`.
- **`coach_assign_routine(p_link_id, p_source_template_id, p_days smallint[], p_start_date, p_weeks, p_note, p_day_split jsonb, p_client_id)`:**
  - Valida:
    - que el vínculo esté `active`;
    - que la plantilla de origen sea del coach, del catálogo oficial o pública;
    - que los días estén entre 1 y 7 y no estén vacíos.
  - Crea la **copia** para el alumno con la misma estructura que `save_user_routine`. Queda archivada en "Mis rutinas", pero se abre con `get_routine`, y lleva `routine_focus` y `routine_category` copiados.
  - La asignación activa anterior pasa a `replaced`.
  - **Integra la asignación en la semana planificada del alumno**, ver §5.
  - Encola el push "Tu coach te asignó una rutina".
  - Es idempotente por `p_client_id`.
  - Devuelve `{ ok, assignment_id, student_template_id }`.
- **`coach_end_routine(p_assignment_id)`** → la asignación pasa a `ended` y se quita de los días futuros de la semana planificada.
- **`coach_assign_nutrition(p_link_id, p_mode, p_targets jsonb, p_note, p_client_id)`:**
  - Exige `share_nutrition = true`; si no, devuelve `nutrition_not_shared`.
  - Valida:
    - las kcal entre 1.000 y 6.000;
    - que los macros cuadren con las kcal (P×4 + C×4 + G×9) con un margen de ±10 %;
    - que no queden por debajo del mínimo de seguridad de nut-1.
  - La asignación pendiente anterior pasa a `replaced`.
  - Encola el push "Tu coach te asignó nuevos objetivos".
  - Errores específicos: `link_not_active` para un vínculo propio pendiente o terminado; `nutrition_not_shared` si no comparte nutrición; `kcal_out_of_range` fuera de 1.000–6.000; `macros_mismatch` si la energía de los macros difiere más de ±10 %; `below_safety_min` si las kcal están por debajo del mínimo individual de nut-1. `not_found` se conserva para un vínculo inexistente o ajeno, e `invalid_targets` para una estructura inválida o un perfil incompleto. En `train_rest` se valida primero `train` y después `rest`.
- **`coach_end_link(p_link_id)`** → desvincula al alumno (`ended`, `ended_by = 'coach'`) y aplica las reglas de §6.

## 4. RPC · Alumno

- **`coach_preview_invite(p_code)`** → `{ coach: { id, name, avatar, bio? } }`. No crea nada. Errores:
  - `invalid_code`;
  - `own_code` (es tu propio código);
  - `coach_full` (el coach llegó al máximo);
  - `already_linked` (ya tienes coach).
- **`coach_accept_invite(p_code, p_share_nutrition boolean, p_share_body boolean)`** → crea el vínculo directamente en `active`, porque aceptar ya es el consentimiento del alumno, y guarda los `shares`.
  - El estado `pending` existe para invitaciones dirigidas, que el coach podrá hacer en una fase futura.
  - Encola el push "<Alumno> aceptó tu invitación".
- **`student_get_coach()`** → `{ coach, link_id, linked_since, shares, routine_assignment, nutrition_assignment }` o `{ coach: null }`. `linked_since` es `coach_links.accepted_at`.
- **`student_update_shares(p_share_nutrition, p_share_body)`:**
  - Si se desactiva `nutrition` con un plan del coach aceptado, el plan del coach **deja de estar activo** y el alumno vuelve a su estimación. Así se evita que el coach mantenga un plan sin poder verlo.
- **`student_respond_nutrition(p_assignment_id, p_accept boolean)`:**
  - **Si acepta:** se crea o actualiza un `nutrition_plans` activo con `source = 'coach'` y los objetivos asignados. Se usa la misma activación de nut-1, que reemplaza el plan activo anterior sin pedir confirmación, porque el alumno ya aceptó. El plan anterior queda `replaced`.
  - **Si no acepta:** la asignación queda `declined` y no cambia nada.
- **`student_end_link()`** → desvincula (`ended_by = 'student'`) y aplica las reglas de §6.

## 5. Integración con lo existente

- **Semana planificada:**
  - Al asignar, los días de la asignación se escriben en la semana planificada del alumno a partir de `start_date`, durante `weeks` semanas, o de forma indefinida si `weeks` es null.
  - Cada día queda marcado con `source = 'coach'` y `assignment_id`.
  - Si ese día ya había otra rutina, la del coach la sustituye, solo en días futuros.
  - `get_week_plan` devuelve `source` y `coach_name` en esos días. Así la app los muestra en "Tu próxima sesión" con la etiqueta "COACH", sin una tarjeta aparte.
- **Detalle de rutina:**
  - `get_routine(student_template_id)` funciona igual que en cualquier rutina.
  - Añadir los campos opcionales `coach: { name, avatar }`, `coach_note` y `assignment: { days, day_split, start_date, weeks }` cuando la plantilla venga de una asignación.
- **Nutrición:**
  - `compute_nutrition_targets` y `get_nutrition_day` usan el plan con `source = 'coach'` cuando está activo y exponen `target_source = 'coach'` y `coach_name`.
- **ELLIE (ctx-1):** `get_athlete_context` añade el bloque `coach`:
  ```
  coach: { name, routine: {title, days} | null, nutrition_active: bool, note: text | null }
  ```
  Reglas que se agregan al system prompt de ELLIE:
  - Si hay un plan nutricional del coach activo, no propone reemplazarlo: arma comidas que encajen en esos objetivos y lo dice.
  - Para una rutina en un día asignado por el coach, sugiere ajustes solo si el alumno los pide, y le recomienda comentarlo con su coach.
  - Si cambia `ellie-chat`, avisar para desplegarlo.
- **Sesiones:** no hay ningún cambio. El coach lee las sesiones del alumno a través de `coach_get_student`.

## 6. Desvincular

Cuando se termina un vínculo, por cualquiera de los dos:
- el vínculo queda `ended`, con `ended_by`;
- la asignación de rutina activa pasa a `ended`, y los días **futuros** de la semana planificada del alumno con `source = 'coach'` se quitan;
- **la copia de la rutina se queda en el alumno**: pasa a "Mis rutinas", sin archivar, como rutina suya;
- `get_routine` pasa de `can_edit: false` a `can_edit: true` para esa copia;
- el plan nutricional del coach, si estaba activo, se desactiva, y el alumno vuelve a su estimación. Se avisa con un push.
- el coach pierde el acceso a todo al instante.

`delete-account`:
- **Si se borra la cuenta de un alumno:** se terminan sus vínculos y se borran sus asignaciones.
- **Si se borra la cuenta de un coach:** se terminan sus vínculos (las copias se quedan en los alumnos) y se borran sus códigos.

## 7. Notificaciones (push_outbox, respetando las horas de silencio)

| Tipo | Destinatario | Texto |
|---|---|---|
| `coach_routine_assigned` | alumno | "Tu coach te asignó una rutina" → abre su detalle |
| `coach_nutrition_assigned` | alumno | "Tu coach te asignó nuevos objetivos" → abre Nutrición |
| `coach_invite_accepted` | coach | "<Alumno> aceptó tu invitación" → abre el alumno |
| `coach_link_ended` | el otro lado | "Ya no estás vinculado con <nombre>" |
| `coach_daily_digest` | coach | "3 alumnos entrenaron hoy" (1 al día, a las 20:00 locales, solo si hubo actividad) |
| `coach_student_inactive` | coach | "<Alumno> no entrena hace 7 días" (como máximo 1 por alumno cada 7 días) |

El resumen diario y el aviso de inactividad se generan con un job de `pg_cron`. Si `send-push` necesita conocer los tipos nuevos, avisar para desplegarlo.

## 8. Escenarios de verificación (smoke SQL con usuarios simulados y ROLLBACK)

1. Un usuario sin `is_coach` llama a `coach_list_students` y recibe `not_coach`.
2. El coach genera un código; el alumno hace `preview` y `accept`, con `nutrition=false` y `body=false`. El vínculo queda `active`.
3. Un segundo coach intenta vincular al mismo alumno: `already_linked`.
4. Con 30 alumnos, la invitación número 31 da `coach_full`.
5. `coach_assign_routine`:
   - la copia existe y se abre con `get_routine`;
   - no sale en `list_routines` del alumno;
   - los días aparecen en `get_week_plan` con `source = 'coach'`.
6. El coach edita su plantilla de origen y la copia del alumno no cambia.
7. `coach_assign_nutrition` con `share_nutrition = false` da `nutrition_not_shared`. El alumno activa nutrición, el coach asigna, el alumno acepta, y `compute_nutrition_targets` devuelve `target_source = 'coach'`.
8. El alumno desactiva nutrición y el plan del coach deja de estar activo.
9. `coach_get_student` con `share_body = false` devuelve `body.locked = true`, sin peso, sueño ni molestias.
10. El coach intenta leer a un alumno que no es suyo: `not_found` (no `forbidden`, para no revelar que existe).
11. El alumno se desvincula:
    - la copia pasa a "Mis rutinas";
    - los días futuros del coach se quitan;
    - el plan del coach se desactiva;
    - el coach ya no lo ve.
12. Un alumno sin entrenar 7 días: el job genera `coach_student_inactive` solo una vez esa semana.

## 9. Entregables

1. Inventario de §1 y qué se reutilizó.
2. Migración idempotente (ejecutable dos veces) para el SQL editor, más el smoke de §8.
3. Firma final de cada RPC, con un JSON de ejemplo de `coach_list_students`, `coach_get_student` y `student_get_coach`.
4. Qué Edge Functions cambian (`send-push`, `ellie-chat`, `delete-account`), para desplegarlas juntas.
5. La sección "Implementación real" al final de este documento.
6. Cómo activar un coach en la beta: el `update` exacto para el SQL editor.

## 10. Implementación real

Implementado como `coach-1` en `drizzle/migrations/0044_coach_1.sql`, con los ajustes de contrato en `drizzle/migrations/0045_coach_1_adjustments.sql`. Ejecutar 0044 y luego 0045 en el SQL editor; 0045 usa `CREATE OR REPLACE FUNCTION`, conserva las firmas y se puede ejecutar dos veces. El smoke integral está en `docs/backend/examples/coach_smoke.sql`; abre una transacción, simula JWT de usuarios con `SET LOCAL ROLE authenticated` y `request.jwt.claims`, cubre los 12 casos de §8 y termina siempre en `ROLLBACK`.

### Inventario previo y reutilización

| Área | Implementación existente reutilizada | Integración coach-1 |
|---|---|---|
| Rutinas | `workout_templates`, `template_exercises`, `template_exercise_alternatives`, `get_routine`, `save_user_routine`, `list_routines` | La asignación copia plantilla, ejercicios, prescripción, alternativas, `routine_category` y `routine_focus`. La copia pertenece al alumno y queda con `archived_at` hasta la desvinculación. `get_routine` mantiene su respuesta y añade metadatos opcionales de coach. |
| Semana | `weekly_plans`, `weekly_plan_days`, `wp_ensure`, `get_week_plan`, `weekly_plan_today` | Se añaden `source` y `assignment_id` a los días. Los días coach se escriben con los helpers actuales; un plan sin fin mantiene un horizonte móvil de 56 días, extendido por el job horario. |
| Sesiones | `workout_sessions`, `workout_session_sets` | No se cambia el modelo ni la escritura de sesiones. El detalle del coach lee sesiones `completed`, duración y fecha. |
| Feedback | `workout_sessions.rating/rating_note`, `workout_session_feedback` (`sfb-1`) | Se reutilizan rating y molestias de los últimos 14 días; no hay tabla de feedback paralela. |
| Nutrición | `nutrition_plans`, `nutrition_plans_status_sync`, `nut_profile_estimate`, `nut_targets`, `compute_nutrition_targets` | La aceptación crea un plan `source='coach'`, activa el trigger existente de reemplazo y guarda `coach_assignment_id`. El wrapper de `nut_targets` expone `target_source='coach'`. |
| Peso, sueño y molestias | `weight_logs`/`nut_weight_trend`, `sleep_nights`, `workout_session_feedback` | Solo se leen si `share_body=true`; en caso contrario el RPC devuelve únicamente `{ "locked": true }`. |
| Push | `social_notifications`, `push_outbox`, `social_notify`, `push_category`, `send-push` | Todos los pushes nacen de `social_notifications`; `coach_notification_data` guarda solo el payload de navegación/conteo que no cabe en la notificación base. Se conserva quiet-hours y dedupe. |
| Borrado | `delete-account` | Antes de borrar Auth/Storage se ejecuta `coach_prepare_account_deletion`: termina vínculos, conserva las copias de alumnos si se borra el coach y elimina los códigos. |

No se duplican ejercicios, sesiones, planes semanales, peso, sueño ni el cálculo nutricional de seguridad.

### Persistencia, acceso y jobs

Las tablas nuevas reales son `coach_invites`, `coach_links`, `coach_routine_assignments`, `coach_nutrition_assignments` y `coach_notification_data`. También se añaden `profiles.is_coach`, `profiles.coach_max_students`, `weekly_plan_days.source`, `weekly_plan_days.assignment_id` y `nutrition_plans.coach_assignment_id`.

Las cinco tablas coach tienen RLS activado y no conceden acceso directo a `anon` ni `authenticated`; la app entra únicamente por RPC `SECURITY DEFINER`. `coach_can_see(coach, student, category)` centraliza vínculo activo y consentimiento. La elevación de `is_coach`/`coach_max_students` desde un JWT de usuario queda bloqueada por trigger.

`coach_jobs_tick()` se agenda con `pg_cron` a los 12 minutos de cada hora. Extiende asignaciones sin fecha final, emite inactividad como máximo una vez cada siete días y genera el digest cuando son las 20:00 en la zona horaria del coach. Tanto las notificaciones como sus claves de deduplicación se persisten por el camino social existente.

### Firmas finales

```text
coach_get_invite() -> jsonb
coach_regenerate_invite() -> jsonb
coach_list_students() -> jsonb
coach_get_student(p_link_id uuid) -> jsonb
coach_assign_routine(p_link_id uuid, p_source_template_id uuid, p_days smallint[],
  p_start_date date, p_weeks smallint, p_note text, p_day_split jsonb,
  p_client_id uuid) -> jsonb
coach_end_routine(p_assignment_id uuid) -> jsonb
coach_assign_nutrition(p_link_id uuid, p_mode text, p_targets jsonb,
  p_note text, p_client_id uuid) -> jsonb
coach_end_link(p_link_id uuid) -> jsonb

coach_preview_invite(p_code text) -> jsonb
coach_accept_invite(p_code text, p_share_nutrition boolean,
  p_share_body boolean) -> jsonb
student_get_coach() -> jsonb
student_update_shares(p_share_nutrition boolean, p_share_body boolean) -> jsonb
student_respond_nutrition(p_assignment_id uuid, p_accept boolean) -> jsonb
student_end_link() -> jsonb
```

Las extensiones a `get_routine(uuid)`, `get_week_plan(date,text)`, `weekly_plan_today(uuid,date)`, `nut_targets(uuid,date)` y `get_athlete_context(timestamptz,text)` son aditivas: los campos anteriores permanecen y los campos coach son opcionales.

### Ejemplos reales de respuesta

`coach_list_students()`:

```json
{
  "ok": true,
  "stats": { "students": 3, "max": 30, "with_routine": 1, "with_nutrition": 1 },
  "students": [
    {
      "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4",
      "status": "active",
      "name": "Vale",
      "avatar": "profiles/vale/avatar.webp",
      "shares": { "training": true, "nutrition": true, "body": true },
      "nutrition_status": "pending",
      "routine": { "title": "Fuerza 3 días", "days_per_week": 3 },
      "week": { "done": 2, "planned": 3 },
      "last_session_at": "2026-11-04T10:42:00Z",
      "days_inactive": 1,
      "flags": []
    },
    {
      "link_id": "e1994bc6-a972-4076-81c5-5a560cdf503c",
      "status": "active",
      "name": "Leo",
      "avatar": null,
      "shares": { "training": true, "nutrition": false, "body": false },
      "nutrition_status": "not_shared",
      "routine": null,
      "week": { "done": 0, "planned": 0 },
      "last_session_at": "2026-10-25T09:00:00Z",
      "days_inactive": 11,
      "flags": ["inactive_7d"]
    },
    {
      "link_id": "75c935a8-f032-4aa5-97c3-6b91af945eb9",
      "status": "pending",
      "invite_created_at": "2026-11-05T09:00:00Z",
      "name": "Mia",
      "avatar": null,
      "shares": { "training": true, "nutrition": false, "body": false },
      "nutrition_status": "not_shared",
      "routine": null,
      "week": { "done": 0, "planned": 0 },
      "last_session_at": null,
      "days_inactive": null,
      "flags": ["invite_pending"]
    }
  ]
}
```

Ejemplo fechado al 5 de noviembre de 2026 en la zona local de los alumnos. Vale tiene una asignación nutricional `pending` y suma en `stats.with_nutrition`. `nutrition_status` sale en cada alumno: `not_shared` prevalece si `share_nutrition=false`; con consentimiento, refleja la asignación más reciente en estado `pending`, `accepted` o `declined`, o `none` si no la hay. `stats.with_nutrition` mantiene su contrato anterior: cuenta alumnos que tengan alguna asignación `pending` o `accepted`. `invite_created_at` es `coach_links.created_at` y solo aparece para un vínculo `pending`. `flags` solo contiene `invite_pending` para vínculos pendientes o `inactive_7d` para vínculos activos sin sesiones completadas en los últimos siete días; en los demás casos es `[]`.

`coach_get_student(link_id)` con `body` y nutrición cerrados:

```json
{
  "ok": true,
  "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4",
  "profile": { "name": "Vale", "avatar": "profiles/vale/avatar.webp", "level": "intermedio", "goal": "performance" },
  "shares": { "training": true, "nutrition": false, "body": false },
  "week": {
    "week_start": "2026-11-02",
    "days": [
      { "date": "2026-11-02", "planned": true, "done": true, "missed": false, "routine_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
      { "date": "2026-11-03", "planned": false, "done": false, "missed": false, "routine_id": null },
      { "date": "2026-11-04", "planned": true, "done": true, "missed": false, "routine_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
      { "date": "2026-11-05", "planned": false, "done": false, "missed": false, "routine_id": null },
      { "date": "2026-11-06", "planned": true, "done": false, "missed": false, "routine_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
      { "date": "2026-11-07", "planned": false, "done": false, "missed": false, "routine_id": null },
      { "date": "2026-11-08", "planned": false, "done": false, "missed": false, "routine_id": null }
    ],
    "adherence_pct": 67,
    "last_session": { "id": "1d8871b4-872d-4af0-bfd4-b3cfab9351c1", "title": "Fuerza A", "date": "2026-11-04", "duration": 46, "rating": 4, "rating_note": null, "at": "2026-11-04T10:42:00Z" }
  },
  "routine": { "assignment_id": "80998fce-5746-4550-a9ba-4d970e64cb4e", "title": "Fuerza 3 días", "days": [1, 3, 5], "day_split": null, "start_date": "2026-11-02", "weeks": 8, "note": "Prioriza técnica", "student_template_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
  "nutrition": { "locked": true },
  "body": { "locked": true }
}
```

`get_routine(student_template_id)` llamado por el **alumno** mientras la asignación está activa. `coach`, `coach_note` y `assignment` van dentro de `routine`, al mismo nivel que `title` y `exercises`; `assignment.id` es el ID de la asignación, no el ID de la plantilla:

```json
{
  "ok": true,
  "routine": {
    "id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93",
    "title": "Fuerza 3 días",
    "description": "Rutina de fuerza para tres días",
    "type": "strength",
    "difficulty": "intermediate",
    "duration": 45,
    "calories": 0,
    "target_muscles": [],
    "routine_category": "cuerpo_completo",
    "routine_focus": "fullbody",
    "origin": "user",
    "is_mine": true,
    "can_edit": false,
    "archived": true,
    "external_key": null,
    "image_url": null,
    "library_categories": [],
    "thumb_key": null,
    "created_at": "2026-11-02T09:00:00Z",
    "updated_at": "2026-11-02T09:00:00Z",
    "exercises": [
      {
        "id": "16b979fb-2764-42bc-bc2d-09da7948775d",
        "exercise_id": "88483df7-8e65-465b-bbf5-5e7f4e9da412",
        "block": "main",
        "position": 1,
        "name": "Sentadilla",
        "sets": 3,
        "reps": 10,
        "reps_min": null,
        "reps_max": null,
        "per_side": false,
        "duration": null,
        "rest_time": 60,
        "notes": null,
        "planned_weight_kg": null,
        "thumb_key": null,
        "tracking_metrics": ["weight", "reps"],
        "is_unilateral": false,
        "alternatives": []
      }
    ],
    "coach": { "name": "Coach Dani", "avatar": "profiles/dani/avatar.webp" },
    "coach_note": "Prioriza técnica",
    "assignment": {
      "id": "80998fce-5746-4550-a9ba-4d970e64cb4e",
      "days": [1, 3, 5],
      "day_split": null,
      "start_date": "2026-11-02",
      "weeks": 8
    }
  }
}
```

La copia sigue archivada mientras la asignación está activa; por eso `get_routine` devuelve `can_edit: false` y las RPC de edición rechazan la plantilla archivada. Tras `student_end_link()` o `coach_end_link()`, la copia se desarchiva, aparece en `list_routines('mine', …)` y `get_routine` devuelve `can_edit: true`. La misma regla se aplica al borrado de la cuenta del coach, que conserva la copia para el alumno.

`coach_get_student(link_id)` con `share_nutrition=true`, `share_body=true`, asignación nutricional pendiente y datos corporales compartidos:

```json
{
  "ok": true,
  "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4",
  "profile": { "name": "Vale", "avatar": "profiles/vale/avatar.webp", "level": "intermedio", "goal": "performance" },
  "shares": { "training": true, "nutrition": true, "body": true },
  "week": {
    "week_start": "2026-11-02",
    "days": [
      { "date": "2026-11-02", "planned": true, "done": true, "missed": false, "routine_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
      { "date": "2026-11-03", "planned": false, "done": false, "missed": false, "routine_id": null },
      { "date": "2026-11-04", "planned": true, "done": true, "missed": false, "routine_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
      { "date": "2026-11-05", "planned": false, "done": false, "missed": false, "routine_id": null },
      { "date": "2026-11-06", "planned": true, "done": false, "missed": false, "routine_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
      { "date": "2026-11-07", "planned": false, "done": false, "missed": false, "routine_id": null },
      { "date": "2026-11-08", "planned": false, "done": false, "missed": false, "routine_id": null }
    ],
    "adherence_pct": 67,
    "last_session": { "id": "1d8871b4-872d-4af0-bfd4-b3cfab9351c1", "title": "Fuerza A", "date": "2026-11-04", "duration": 46, "rating": 4, "rating_note": null, "at": "2026-11-04T10:42:00Z" }
  },
  "routine": { "assignment_id": "80998fce-5746-4550-a9ba-4d970e64cb4e", "title": "Fuerza 3 días", "days": [1, 3, 5], "day_split": null, "start_date": "2026-11-02", "weeks": 8, "note": "Prioriza técnica", "student_template_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93" },
  "nutrition": {
    "locked": false,
    "assignment_id": "4948605e-7372-4f4c-a7b2-00fba8e102f3",
    "mode": "same",
    "targets": { "kcal": 2400, "protein_g": 150, "carbs_g": 285, "fat_g": 73 },
    "note": "Revisamos en dos semanas",
    "status": "pending"
  },
  "body": {
    "locked": false,
    "weight": {
      "ok": true,
      "weeks": 4,
      "points": [
        { "measured_at": "2026-11-03T09:00:00Z", "date": "2026-11-03", "kg": 68.5, "body_fat_pct": null, "source": "manual", "trend_kg": 68.5 }
      ],
      "rate_kg_wk": null,
      "target_rate_kg_wk": 0,
      "last_weight": 68.5,
      "last_measured_at": "2026-11-03T09:00:00Z",
      "days_since_last": 2
    },
    "sleep": { "avg_7_min": 445 },
    "discomforts": [
      { "body_zone": "knee", "note": "Molestia leve", "created_at": "2026-11-04T11:00:00Z" }
    ]
  }
}
```

`coach_assign_nutrition` devuelve códigos estables en `{ "ok": false, "error": "<código>" }`. Ejemplos (cada llamada usa un `p_client_id` nuevo):

```text
{ "ok": false, "error": "link_not_active" }
{ "ok": false, "error": "nutrition_not_shared" }
{ "ok": false, "error": "kcal_out_of_range" }
{ "ok": false, "error": "macros_mismatch" }
{ "ok": false, "error": "below_safety_min" }
```

El orden de comprobación es: vínculo propio existente y activo, consentimiento, forma de entrada, rango de kcal, coherencia de macros y mínimo de seguridad. Un `p_client_id` ya aplicado devuelve la respuesta idempotente previa antes de volver a validar.

Si `share_nutrition=true` y no hay asignación `pending` ni `accepted`, el bloque exacto es `"nutrition": { "locked": false, "assignment": null }`. Si no hay peso, noches o molestias, los valores correspondientes son los que devuelven sus consultas (`weight.points: []`, `sleep.avg_7_min: null`, `body.discomforts: []`).

`student_get_coach()`:

```json
{
  "ok": true,
  "coach": { "id": "35138caf-63a2-4dcf-a637-034e5f03dc28", "name": "Coach Dani", "avatar": "profiles/dani/avatar.webp" },
  "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4",
  "linked_since": "2026-11-02T09:00:00Z",
  "shares": { "training": true, "nutrition": true, "body": false },
  "routine_assignment": { "assignment_id": "80998fce-5746-4550-a9ba-4d970e64cb4e", "student_template_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93", "title": "Fuerza 3 días", "days": [1, 3, 5], "day_split": null, "start_date": "2026-11-02", "weeks": 8, "note": "Prioriza técnica" },
  "nutrition_assignment": { "assignment_id": "4948605e-7372-4f4c-a7b2-00fba8e102f3", "mode": "same", "targets": { "kcal": 2400, "protein_g": 150, "carbs_g": 285, "fat_g": 73 }, "note": "Revisamos en dos semanas", "status": "pending" }
}
```

### Payloads APNs de los seis `coach_*`

`send-push` envía un objeto `{ "aps": ..., "data": ... }`. En todos los casos `aps.badge` es el contador no leído del destinatario en el momento del envío, `aps.sound` es `"default"` y `aps["thread-id"]` es `"coach"`. Los siguientes ejemplos usan `badge: 1` y textos en español. `data.notification_id` identifica la fila de `social_notifications`; las demás claves de `data` proceden de `coach_notification_data.payload`. Ninguno de estos payloads contiene `role`: el destinatario y su rol se determinan por la cuenta autenticada y el tipo de notificación, no por una clave enviada en el push.

`coach_routine_assigned` → alumno; `student_template_id` abre la copia de la rutina:

```json
{
  "aps": { "alert": { "title": "COACH", "body": "Tu coach te asignó una rutina" }, "badge": 1, "sound": "default", "thread-id": "coach" },
  "data": { "type": "coach_routine_assigned", "notification_id": "b092e0c0-52dc-4583-a333-546c5d26b75a", "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4", "assignment_id": "80998fce-5746-4550-a9ba-4d970e64cb4e", "student_template_id": "238c9ca8-cd96-423f-bcb8-0b005f86ad93", "screen": "routine_detail" }
}
```

`coach_nutrition_assigned` → alumno; `assignment_id` es la asignación nutricional pendiente:

```json
{
  "aps": { "alert": { "title": "COACH", "body": "Tu coach te asignó nuevos objetivos" }, "badge": 1, "sound": "default", "thread-id": "coach" },
  "data": { "type": "coach_nutrition_assigned", "notification_id": "7eb67cc8-cb8f-4b97-a6f3-07ce64b775a2", "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4", "assignment_id": "4948605e-7372-4f4c-a7b2-00fba8e102f3", "screen": "nutrition" }
}
```

`coach_invite_accepted` → coach:

```json
{
  "aps": { "alert": { "title": "Nuevo alumno", "body": "Vale aceptó tu invitación" }, "badge": 1, "sound": "default", "thread-id": "coach" },
  "data": { "type": "coach_invite_accepted", "notification_id": "a6d858ca-755a-47f5-8efa-b48260bc3b3b", "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4", "screen": "coach_student" }
}
```

`coach_link_ended` → la otra parte del vínculo, sea coach o alumno. El payload tiene `name` del actor y `screen: "coach"` en ambas direcciones; no lleva `ended_by` ni `role`:

```json
{
  "aps": { "alert": { "title": "COACH", "body": "Ya no estás vinculado con Coach Dani" }, "badge": 1, "sound": "default", "thread-id": "coach" },
  "data": { "type": "coach_link_ended", "notification_id": "26e39d45-557a-4339-8a0d-67d334a45bb5", "link_id": "a37fa8b4-b40b-4a17-9455-d4c424d00ef4", "name": "Coach Dani", "screen": "coach" }
}
```

`coach_daily_digest` → coach; `count` alimenta el texto y `date` es el día local del coach:

```json
{
  "aps": { "alert": { "title": "Resumen del día", "body": "3 alumnos entrenaron hoy" }, "badge": 1, "sound": "default", "thread-id": "coach" },
  "data": { "type": "coach_daily_digest", "notification_id": "375cda88-55af-4840-924e-012b3a1fe7ee", "count": 3, "date": "2026-11-05", "screen": "coach_students" }
}
```

`coach_student_inactive` → coach:

```json
{
  "aps": { "alert": { "title": "Alumno inactivo", "body": "Leo no entrena hace 7 días" }, "badge": 1, "sound": "default", "thread-id": "coach" },
  "data": { "type": "coach_student_inactive", "notification_id": "d639fc4a-12f7-4b82-bb21-c0f42df1a162", "link_id": "e1994bc6-a972-4076-81c5-5a560cdf503c", "screen": "coach_student" }
}
```

`link_id` solo se envía en los pushes vinculados a un alumno; el digest no lo incluye. `assignment_id` solo aparece en los dos pushes de asignación; `student_template_id` solo en el de rutina. Tampoco se añaden `entity_type` ni `entity_id` al `data` de estos seis tipos: `send-push` usa el payload guardado en `coach_notification_data`.

### Edge Functions y despliegue

Cambian exactamente estas tres Edge Functions y deben desplegarse después de ejecutar la migración:

1. `send-push`: plantillas, categoría/hilo y payload para los seis tipos `coach_*`.
2. `ellie-chat`: reglas para respetar nutrición y rutinas del coach usando el bloque `context.coach` del RPC.
3. `delete-account`: llama a `coach_prepare_account_deletion` antes de borrar Storage/Auth.

Orden: ejecutar `0044_coach_1.sql`, luego `0045_coach_1_adjustments.sql`, ejecutar `coach_smoke.sql` y confirmar su `ROLLBACK`, luego desplegar juntas `send-push`, `ellie-chat` y `delete-account`. No se agregan secrets nuevos para coach-1; se reutilizan la configuración existente de push, Supabase y ELLIE.

### Activar un coach durante la beta

Ejecutar desde el SQL editor con el email real:

```sql
update public.profiles
set is_coach = true,
    coach_max_students = 30
where id = (select id from auth.users where email = 'coach@example.com');
```

Para desactivarlo no basta con cambiar `is_coach`: primero se deben terminar sus vínculos activos con los RPC o con el flujo administrativo definido para la beta.
