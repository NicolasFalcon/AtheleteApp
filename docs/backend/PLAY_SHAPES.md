# PLAY_SHAPES · Athelete Play v2 (ciclo completo)

Versión de contrato: `play-1` · Lado: **backend (Lovable)** · La app se adapta después.
Fuente de diseño: handoff v2.18, §28.6.1 "Ciclo de Play" (con las decisiones de producto ya cerradas, ver §0).

## 0. Decisiones de producto (definitivas)

- Todo lo calculable lo calcula y valida el **servidor**. La app solo muestra lo que devuelve y nunca suma puntos por su cuenta.
- **Logros aprobados:** Ronda perfecta, Ruta completada (una por ruta), Racha de Play 7 días, Racha de Play 30 días y Atleta (nivel de jugador 5).
- **Desafío del día:** el servidor lo elige entre los niveles abiertos del usuario:
  - rota la ruta cada día;
  - prioriza el nivel actual de esa ruta;
  - no repite el desafío de ayer;
  - se renueva a las 00:00 en la zona horaria del usuario.
- **Segundo plano:** si la app está en segundo plano menos de 120 s, la ronda sigue. Si pasa más tiempo, la app la descarta (lo controla la app, sin llamar al servidor).
- **Sin conexión durante una ronda:** se termina con las preguntas ya descargadas y el resultado se envía cuando vuelve la conexión (ver §3.3).

## 1. Antes de cambiar nada: reporte de lo existente

La app ya tiene un quiz (versión anterior: desafíos con anillo de récord). Antes de crear nada, Lovable reporta:

1. Las tablas, RPC y Edge Functions actuales del quiz, con sus columnas.
2. Cuántas preguntas hay y cómo se reparten por tema o nivel.
3. Qué datos de usuario existen: puntos y récords.

**Reglas:**
- Reutilizar y extender lo existente cuando encaje. No borrar tablas ni RPC antiguas, porque la app actual las usa hasta que salga el lote nuevo.
- Los puntos totales actuales de cada usuario se conservan y pasan a `play_profile.total_points`.

## 2. Modelo de datos

```sql
-- Banco de preguntas (contenido)
play_questions (
  id uuid pk,
  route text check (route in ('nutricion','entrenamiento','recuperacion')),
  level smallint check (level between 1 and 5),
  topic text,                      -- para el "repaso de temas fallados"
  prompt text not null,
  options text[] not null,         -- 3 o 4 opciones
  correct_index smallint not null,
  explanation text,                -- "Repartir el volumen en 2+ sesiones rinde más."
  active boolean default true,
  needs_review boolean default false,
  created_at timestamptz default now()
)

-- Estado del jugador (1 fila por usuario)
play_profile (
  user_id uuid pk references auth.users,
  total_points int default 0,
  streak_days int default 0,
  last_play_date date,             -- fecha local del último día jugado
  tz text,                         -- zona horaria vigente
  updated_at timestamptz
)

-- Progreso por nivel
play_level_progress (
  user_id uuid, route text, level smallint,
  best_score smallint,             -- 0..10, null = sin jugar
  plays int default 0,
  first_completed_at timestamptz,  -- primera vez con >= 8
  pk (user_id, route, level)
)

-- Rondas
play_rounds (
  id uuid pk, user_id uuid,
  client_round_id text unique,     -- idempotencia
  route text, level smallint,
  is_daily_challenge boolean,
  question_ids uuid[],             -- las 10 servidas, en orden
  started_at timestamptz,
  finished_at timestamptz,         -- null = abandonada o en curso
  local_date date,                 -- día (zona del usuario) al terminar
  score smallint, round_points int, bonus_points int,
  max_streak smallint, medal text, -- 'oro' | 'plata' | 'bronce' | null
  answers jsonb                    -- [{question_id, choice_index|null, elapsed_ms, correct, points}]
)

-- Desafío del día (1 por usuario y día)
play_daily_challenge (
  user_id uuid, local_date date, route text, level smallint,
  completed_round_id uuid,         -- null = pendiente
  pk (user_id, local_date)
)

-- Objetivos de la semana
play_weekly_goals (
  user_id uuid, week_start date,   -- lunes, en zona del usuario
  goal text check (goal in ('play_5_days','streak_5','perfect_10')),
  progress smallint, target smallint,
  completed_at timestamptz, points_awarded int,
  pk (user_id, week_start, goal)
)

-- Logros de Play (si ya existe un sistema de logros/medallas para la Vitrina, úsalo en lugar de esta tabla e indícalo)
play_achievements (
  user_id uuid,
  code text,  -- perfect_round | route_nutricion | route_entrenamiento | route_recuperacion | streak_7 | streak_30 | athlete
  unlocked_at timestamptz,
  pk (user_id, code)
)
```

**RLS:**
- Cada usuario lee solo sus propias filas.
- Las escrituras se hacen **solo** con las RPC `SECURITY DEFINER` (no hay `insert` ni `update` directos desde el cliente).
- `play_questions` se puede leer únicamente a través de `start_play_round`.

## 3. RPC

Todas devuelven `{ ok: true, ... }` o `{ ok: false, error: { code, message } }`. Usan `auth.uid()` y reciben `p_tz` (zona IANA del dispositivo). Si `p_tz` viene vacío, se usa la del perfil. El "día" y la "semana" se calculan **siempre** en la zona del usuario.

### 3.1 `get_play_home(p_tz text)`

Alimenta la portada de Play y la tarjeta de Play en Inicio. Antes de responder:
- aplica la racha de forma perezosa: si `last_play_date < hoy − 1`, pone `streak_days = 0`;
- crea el desafío del día si todavía no existe.

```jsonc
{
  "ok": true,
  "player": {
    "total_points": 4860,
    "level": 5, "title": "Atleta",
    "next_title": "Élite", "points_in_level": 860, "points_to_next": 140
  },
  "streak": { "days": 4, "played_today": true },   // days 0 → llama gris
  "daily_challenge": {
    "route": "nutricion", "level": 3, "level_name": "Proteína y timing",
    "bonus_points": 50, "done_today": false,
    "renews_in_minutes": 360
  },
  "routes": [
    {
      "route": "nutricion", "title": "Nutrición",
      "subtitle": "Fundamentos de alimentación deportiva",
      "completed": false, "levels_passed": 2, "current_level": 3,
      "levels": [
        { "level": 1, "name": "Bases",   "state": "passed",  "best_score": 10, "is_new": false },
        { "level": 2, "name": "Macros",  "state": "passed",  "best_score": 8 },
        { "level": 3, "name": "Proteína y timing", "state": "current", "best_score": 7, "hits_to_unlock": 1 },
        { "level": 4, "name": "Hidratación", "state": "locked", "best_score": null },
        { "level": 5, "name": "Suplementos", "state": "locked", "best_score": null }
      ]
    }
    // entrenamiento, recuperacion
  ],
  "weekly_goals": {
    "week_start": "2026-10-26", "resets_in_minutes": 8040,
    "goals": [
      { "goal": "play_5_days", "progress": 3, "target": 5, "points": 100, "done": false },
      { "goal": "streak_5",    "progress": 1, "target": 1, "points": 50,  "done": true },
      { "goal": "perfect_10",  "progress": 0, "target": 1, "points": 150, "done": false }
    ]
  },
  "first_time": false
}
```

**Estados de nivel:**
- `locked`: no se puede jugar.
- `current`: el primer nivel de la ruta con `best_score < 8` o sin jugar.
- `passed`: `best_score ≥ 8`.
- `is_new: true` en un nivel abierto que nunca se ha jugado.

**Primera vez:** `first_time: true` cuando no existe `play_profile` o no hay rondas terminadas. En ese caso:
- el nivel 1 de cada ruta queda abierto y con `is_new`;
- el desafío del día es el nivel 1 de alguna ruta.

### 3.2 `start_play_round(p_route, p_level, p_is_daily boolean, p_client_round_id text, p_tz text)`

**Valida:**
- que el nivel esté abierto (si no, error `level_locked`);
- si `p_is_daily`, que coincida con el desafío de hoy (si no, error `not_daily_challenge`).

**Elige 10 preguntas activas del nivel al azar.** Evita las de la última ronda de ese nivel si el banco tiene 20 o más. Si hay menos de 10 activas, devuelve el error `not_enough_questions`.

**Es idempotente por `p_client_round_id`:** si llega repetido, devuelve la misma ronda.

```jsonc
{
  "ok": true,
  "round_id": "…",
  "route": "nutricion", "level": 3, "level_name": "Proteína y timing",
  "is_daily_challenge": true, "daily_bonus_available": true,
  "best_score": 7, "hits_to_unlock": 1,
  "seconds_per_question": 15,
  "questions": [
    { "id": "…", "topic": "Frecuencia", "prompt": "¿Cuántas veces por semana trabajar cada músculo?",
      "options": ["Una", "Dos o más", "Nunca repetir", "Todos los días al fallo"],
      "correct_index": 1, "explanation": "Repartir el volumen en 2+ sesiones rinde más." }
  ]
}
```

> `correct_index` se envía a la app para dar feedback instantáneo y para que la ronda se pueda terminar sin conexión. El servidor **recalcula** todo al recibir el resultado, a partir de las respuestas. Se acepta este riesgo bajo de trampa porque es un quiz sin premios materiales.

### 3.3 `submit_play_round(p_round_id, p_answers jsonb, p_finished_at timestamptz, p_tz text)`

`p_answers` trae `[{ question_id, choice_index | null, elapsed_ms }]`, con 10 elementos en el orden servido. `null` significa que se agotó el tiempo.

**Validaciones:**
- La ronda es del usuario y no está enviada. Si ya se envió, se devuelve el mismo resultado (idempotencia).
- Las `question_id` coinciden con las servidas.
- `elapsed_ms` se recorta a [0, 15000], y un valor mayor de 15000 cuenta como tiempo agotado.
- `p_finished_at` cumple `started_at ≤ p_finished_at ≤ now()` y `p_finished_at ≤ started_at + 30 min`. Si no, `finished_at = now()`.
- **Resultados en cola (sin conexión):** se aceptan hasta 72 h después de `started_at`. Para la racha, el desafío y los objetivos cuenta el día local de `p_finished_at`.

**Cálculo**, siguiendo §28.6.1:
1. **Puntos por respuesta.** `racha` cuenta los aciertos seguidos e incluye la respuesta actual; un fallo o un tiempo agotado la vuelven a 0. Multiplicador: 3 si `racha ≥ 5`, 2 si `racha ≥ 3`, 1 en otro caso. Puntos: `10 × multiplicador` si acierta, 0 si no. Una ronda perfecta suma 230.
2. **Bonus del desafío del día:** +50 si `is_daily_challenge` y es la primera ronda terminada del desafío en ese día local.
3. **Medalla:** 10 = oro; 8–9 = plata; 6–7 = bronce; menos de 6, ninguna.
4. **Récord:** `new_record` si la ronda supera un `best_score` anterior que no sea null. Una primera partida no cuenta como récord.
5. **Desbloqueo:** si la ronda es del nivel `current`, el `best_score` anterior era menor de 8 y la ronda tiene 8 o más:
   - con nivel < 5, se abre el nivel N+1;
   - con nivel 5, la ruta queda completada y se concede su logro.
6. **Racha diaria:** si es la primera ronda terminada del día local:
   - si `last_play_date = día − 1`, `streak +1`;
   - si `last_play_date` es más antiguo o null, `streak = 1`;
   - si ya se jugó ese día, no cambia.
7. **Objetivos de la semana** (semana de lunes a domingo, en la zona del usuario):
   - `play_5_days`: cuenta días jugados distintos.
   - `streak_5`: `max_streak ≥ 5`.
   - `perfect_10`: `score = 10`.
   - Cada objetivo da sus puntos una sola vez por semana.
8. **Puntos totales:** `total_points += round_points + bonus + puntos de objetivos cumplidos`. Después se recalculan el nivel y el título: `floor(total / 1000) + 1`, con los títulos 1 Novato, 2 Aficionado, 3 Constante, 4 Competidor, 5 Atleta, 6 Élite y 7+ Leyenda.
9. **Logros:** `perfect_round` (primera vez con 10/10), `route_*`, `streak_7`, `streak_30` y `athlete` (nivel 5). Cada uno se concede una sola vez y no da puntos.

Todo esto ocurre en **una sola transacción**.

**Respuesta** (alimenta la pantalla de Resultado y las celebraciones):

```jsonc
{
  "ok": true,
  "score": 8, "medal": "plata",
  "answers": [ { "question_id": "…", "correct": true, "points": 10 } ],
  "max_streak": 6,
  "round_points": 140, "daily_bonus": 50,
  "best_score": { "before": 7, "after": 8, "new_record": true },
  "unlocked": { "route": "nutricion", "level": 4, "level_name": "Hidratación" },  // null si no
  "route_completed": null,                                                         // "nutricion" si aplica
  "streak": { "before": 3, "after": 4, "incremented": true },
  "weekly_goals_completed": [ { "goal": "streak_5", "points": 50 } ],
  "achievements_unlocked": [ { "code": "perfect_round", "name": "Ronda perfecta" } ],
  "player": {
    "total_before": 4670, "total_after": 4910,
    "level_before": 5, "level_after": 5, "title_after": "Atleta",
    "points_to_next": 90, "next_title": "Élite"
  },
  "next_objective": "Juega Hidratación · Nivel 4",
  "review_topics": ["Frecuencia", "Timing de proteína"],   // máx. 4, temas de las falladas
  "celebration": "unlock"                                  // unlock | record | level_up | null (el de mayor prioridad: level_up > unlock > record)
}
```

### 3.4 Ronda abandonada

No hace falta llamar a ninguna RPC. Una ronda sin `finished_at` no cuenta para nada y el bonus del desafío sigue disponible. Un job diario, o una limpieza perezosa, borra las rondas sin terminar con más de 72 h.

## 4. Contenido (banco de preguntas)

- **Necesidad:** 15 niveles (3 rutas × 5 niveles), con un mínimo de **20 preguntas activas por nivel**, unas 300 en total. Lo ideal son 30 por nivel, para que las rondas no se repitan.
- **Primer paso:** reutilizar las preguntas existentes del quiz antiguo, mapeándolas a ruta y nivel.
- **Niveles sin preguntas suficientes:**
  - generar borradores con IA, guardados con `needs_review = true` y `active = false`;
  - no activarlos sin revisión humana, porque es contenido de salud y nutrición;
  - reportar cuántas preguntas faltan por nivel.
- **Formato de cada pregunta:**
  - un enunciado corto;
  - 3 o 4 opciones, con una sola correcta;
  - una `explanation` de una línea;
  - un `topic` corto.
- **Prohibido en el contenido:**
  - dosis de suplementos o fármacos;
  - consejos médicos;
  - recomendaciones extremas, como ayunos largos o déficits agresivos.

## 5. Objetivos de rendimiento

| RPC | p95 |
|---|---|
| `get_play_home` | < 300 ms |
| `start_play_round` | < 300 ms |
| `submit_play_round` | < 500 ms |

## 6. Escenarios de verificación (cuenta de prueba)

1. **Primera vez.** `first_time` es true, el nivel 1 de las 3 rutas está abierto y es `is_new`, la racha es 0 y el desafío del día es un nivel 1.
2. **Ronda 10/10.** Da 230 pts, medalla de oro y el logro Ronda perfecta (solo la primera vez), y cumple el objetivo `perfect_10`.
3. **Ronda de 8/10 en el nivel actual con best 7.** Abre el nivel siguiente y marca `new_record`.
4. **Ronda de 8/10 en un nivel ya superado.** No desbloquea nada nuevo.
5. **Nivel 4 bloqueado.** `start_play_round` devuelve `level_locked`.
6. **Desafío del día.** La primera vez suma +50. La segunda, en el mismo día, suma 0 y `done_today` pasa a true.
7. **Racha.** Jugar hoy y mañana da racha 2. Saltarse un día y consultar `get_play_home` da 0.
8. **Zona horaria.** Una ronda terminada a las 23:50 en `America/Santiago` cuenta para ese día, no para el siguiente en UTC.
9. **Envío repetido** del mismo `round_id`. Devuelve el mismo resultado y no suma dos veces.
10. **Resultado en cola.** Una ronda terminada sin conexión ayer y enviada hoy cuenta para ayer en la racha y en los objetivos.
11. **Cruce de 1000 pts.** `level_after` sube y `celebration = level_up`.
12. **Respuesta con `elapsed_ms` de 20000.** Cuenta como tiempo agotado y la racha de la ronda vuelve a 0.

## 7. Entregables de Lovable (reportar al terminar)

1. El reporte del §1: lo que existía y cómo se reutilizó.
2. Las tablas creadas o modificadas y sus políticas RLS.
3. La firma final de las 3 RPC y un JSON real de cada una con la cuenta de prueba.
4. El estado del banco de preguntas: activas por nivel, borradores pendientes de revisión y qué falta.
5. Los tiempos medidos.
6. El resultado de los escenarios 1 a 12.

## 8. Después (lado app, otro lote)

- Implementar la UI de §28.6.1 con estas RPC.
- Conectar los sonidos pendientes: `play-locked`, `play-level-up`, la cadena del resultado y la celebración.
- Hacer la pausa por segundo plano (120 s) y la cola de resultados sin conexión.
- Cambiar la tarjeta de Play en Inicio a `get_play_home`.
- Quitar las llamadas al quiz antiguo y, después, pedir a Lovable que lo retire.
