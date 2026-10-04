# ATHELETE · Checklist de QA real (recorrido completo)

Reúne los checklists de QA real de `MIGRATION_PROGRESS.md` (§12, §15, §18 a §27) en un solo recorrido, sin duplicados y en el orden del usuario:

**registro → onboarding → Inicio → Entrenos → Sesión → Progreso → ELLIE → Nutrición → Core 33 → Perfil y Ajustes → eliminar cuenta**

> Sin cambios de código. Documento mantenido junto a `MIGRATION_PROGRESS.md`; cuando se resuelva un paso, marca la casilla.

## Cómo usarlo

**Cuentas**
| Cuenta | Para qué |
|---|---|
| **Desechable (D)** | Registro, onboarding, estado "usuario nuevo" y, al final, **eliminar cuenta**. Créala con un correo que puedas leer (alias). **Nunca** se borra falcon1989. |
| **falcon1989** (`falcon1989@gmail.com`, id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5`) | Todo lo demás. Es la cuenta de pruebas de la app. No escribas su contraseña en ningún documento. |

**Leyenda**
- ⚠ **Toca dinero, puntos o datos irreversibles.** Hazlo una sola vez y apunta el resultado. Subtipos: 💳 gasta créditos de IA (dinero), ⭐ otorga puntos o una medalla (no se reparte dos veces), 🗑 borra o cambia algo que no se puede deshacer.
- **Hacer / Esperar / Base:** qué tocar, qué debe verse y qué comprobar en la base.
- Cada pantalla visual se mira en **Light y Dark** salvo que se diga otra cosa. Cada paso de red se repite una vez con **modo avión** si dice "sin red".
- **Consulta Lovable:** al final de cada bloque hay un texto para pegar en Lovable. **Solo lectura**: Lovable debe responder con `SELECT`, sin `INSERT`, `UPDATE`, `DELETE`, DDL ni funciones que escriban, y sin mostrar tokens ni contraseñas. Sustituye `<UID>` por el id de la cuenta (falcon1989 o D).

**Atajos de desarrollo** (opcionales, solo en builds dev)
- Menús dev: "Ver modos de Inicio", "Ver pantallas de Entrenos / Sesión / Progreso / ELLIE / Nutrición / Core 33 / Perfil", "Restablecer card de Core 33".
- Arrancar en una pantalla: `xcrun simctl launch booted <bundle> -devTool "athelete://dev/<módulo>?screen=<clave>" -themeMode dark|light` (módulos: `workouts`, `session`, `progress`, `ellie`, `nutrition`, `core33`, `profile`).
- Los datos de ejemplo de esos atajos **no escriben nada**; este checklist es para datos reales.

---

## Bloque 0 · Preparación

- [ ] Simulador o iPhone con la última build, Metro en marcha y sesión cerrada en la cuenta D (para el registro). Conexión normal.
- [ ] Tener a mano: un correo real para D (recibe los enlaces), y el acceso a Lovable para las consultas de solo lectura.
- [ ] Anota la hora de inicio (las consultas Lovable filtran por `created_at >= <hora>`).

---

## Bloque 1 · Registro (cuenta D)

Referencias: `AUTH_01` a `AUTH_07` (Login, Crear cuenta, Recuperar, Restablecer).

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 1.1 | Abrir la app sin sesión. Ver el Login (Light y Dark). Probar el error de credenciales (correo o contraseña mal), validación por campo, teclado abierto y "Entrando…". | Aro Ember y sacudida en el error, frase de error, CTA que no se corta con el teclado. | — |
| 1.2 | Crear cuenta: formulario vacío (CTA inactiva); cumplir los requisitos de contraseña uno a uno (8, número, mayúscula, coinciden). | Cada requisito marca su check con pop; la CTA se activa solo al cumplirlos. | — |
| 1.3 | Crear cuenta con un correo ya registrado. | Error de Supabase bajo la contraseña, sin perder lo escrito. | — |
| 1.4 | Crear la cuenta D con su correo. Ver "Creando cuenta…" y "Revisa tu correo". | Estado de confirmación; llega el correo. | Fila nueva en `auth.users` y, tras el primer acceso, en `profiles` (`onboarding_completed = false`). |
| 1.5 | Recuperar contraseña: formulario, correo inválido, enviar, "Reenviar" (toast "Te enviamos otro enlace"). | Disco del sobre con pop; llega el correo. | — |
| 1.6 | Abrir el enlace real de recuperación → Restablecer contraseña: requisitos en vivo, "Guardando…", error, éxito; probar también un enlace caducado. | Check Ember con halo; el enlace caducado muestra su estado propio. Entrar con la contraseña nueva. | — |

**Consulta Lovable (solo lectura) · Bloque 1**
```
SOLO LECTURA (SELECT). No escribas nada ni muestres tokens.
1) En auth.users: id, email, created_at, email_confirmed_at, last_sign_in_at de la cuenta con email = '<EMAIL_D>'.
2) En profiles: id, name, onboarding_completed, created_at, core33_intro_seen_at, notification_prefs, core33_invite_dismiss_count de id = '<UID>'.
```

---

## Bloque 2 · Onboarding (cuenta D)

Referencias: `ONB_01_INTRO`, `ONB_02_STEP_01..08`, `ONB_03_ELLIE_WELCOME`.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 2.1 | Intro deslizable: deslizar las 3 fotos, "Siguiente" y "Empezar"; en un iPhone pequeño. | Los puntos siguen al swipe; el texto no choca con los puntos. | — |
| 2.2 | Los 8 pasos (nombre, fecha, peso y altura, objetivo, nivel, días, equipamiento, duración): "Siguiente" inactivo hasta responder; atrás entre pasos y atrás de Android; transiciones. | Nombre con teclado (CTA visible); fecha con selector del sistema y "Listo"; regla de peso/altura con háptica y aguja fija; objetivos solo los 4 de la v2. | — |
| 2.3 | Bienvenida de ELLIE: al aparecer guarda el perfil ("Guardando tu perfil…", salidas inactivas). Probar primero **sin red** → frase de error + "Reintentar"; luego con red. | Resumen (días, min, objetivo) según lo respondido; tras guardar, "Ir a Inicio" abre Inicio. | `profiles`: `name`, `birth_date`, `weight`, `height`, `goal`, `training_level`, `preferred_session_minutes`, `training_days_per_week`, `available_equipment`, `onboarding_completed = true`. Valores dentro de los CHECK (nivel `principiante/intermedio/avanzado`, minutos 5–240, objetivo de los 5 permitidos). |
| 2.4 | Repetir con "Hablar con ELLIE" en la bienvenida (o desde otra cuenta nueva si hace falta). | Abre el tab ELLIE (portada, primer contacto). | — |

**Consulta Lovable (solo lectura) · Bloque 2**
```
SOLO LECTURA (SELECT). Sin mostrar tokens.
En profiles, para id = '<UID>': name, birth_date, weight, height, goal, training_level, preferred_session_minutes, training_days_per_week, available_equipment, onboarding_completed, daily_water_goal, created_at, updated_at.
Dime si algún valor incumple los CHECK conocidos (training_level, preferred_session_minutes 5–240, goal).
```

---

## Bloque 3 · Inicio y Notificaciones

Empieza con la cuenta D recién registrada y sigue con falcon1989. Vuelve a este bloque al terminar cada módulo para comprobar que Inicio refleja lo hecho.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 3.1 | **Cuenta D (usuario nuevo, HOME_05):** abrir Inicio. | Hero "Tu primera sesión" con la rutina más corta; anillos a 0 con su frase; sin "+1"; "Nutrición · sin plan". | — |
| 3.2 | Avatar → Perfil; campana → Notificaciones (punto si hay pendientes). | Navegan; atrás vuelve a Inicio (también el atrás de Android). | — |
| 3.3 | **falcon1989, entreno pendiente (HOME_01):** sin entreno hoy y sin Core 33 activo. | Rutina n.º 1, trío min / ejercicios / kcal, "Empezar" → Detalle. | — |
| 3.4 | Tu día: porcentaje del día; anillo de nutrición con y sin plan; "+1" de agua suma un vaso real. ⚠⭐ (la medalla de hidratación llega al cumplir la meta; una sola vez) | El vaso aparece al instante en el anillo. Detalle completo del agua en el Bloque 8. | `daily_hydration_logs` de hoy. |
| 3.5 | Bloques de Inicio: ELLIE (frase real), Tu mejor marca (con y sin récords), Para entrenar esta semana, Quiz, Wear; cada uno con skeleton y error con "Reintentar" (sin red). | Un bloque con error no rompe el resto. | — |
| 3.6 | **Notificaciones con pendientes (HOME_08):** destacada con foto y etiqueta correcta (HOY; ÚLTIMO DÍA en el día 33 de Core 33; EN CURSO azul en agua); filas con miniatura; cada toque lleva a su destino. | Hitos (placa oscura si es de hoy), actividad (entrenos de la semana, agua y kcal de hoy) y "Activa tu plan nutricional" solo sin plan. | — |
| 3.7 | **Notificaciones sin pendientes (HOME_09):** día completo (entreno, Core 33, agua y nutrición). | "Todo al día". | — |
| 3.8 | Estados raros: modo avión → skeleton y error con "Reintentar" en Inicio y Notificaciones. | Se recupera al volver la red. | — |

> Los modos restantes de Inicio (sesión guardada, entreno hecho, Core 33 prioridad, todo completado) se comprueban con los bloques 5, 9 y 6.

**Consulta Lovable (solo lectura) · Bloque 3**
```
SOLO LECTURA (SELECT). Para user_id = '<UID>':
1) workout_sessions de hoy: id, status, date, started_at, ended_at, paused_total_sec, volume_kg, cancel_reason.
2) daily_hydration_logs y daily_nutrition_logs de hoy; nutrition_plans con is_active = true.
3) challenge_participations (status, start_date) y habit_logs de hoy.
4) Últimos 10 gamification_events (event_type, reference_id, points, created_at).
```

---

## Bloque 4 · Entrenos

Referencias: `WORKOUTS_01..07`, `EXERCISE_01..02`. Cuenta falcon1989.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 4.1 | Entrenos · Rutinas: chips con conteos; tarjetas de las 9 categorías (Fuerza 2, Full body 6, Tren superior 7…); cada una abre su lista; "Todas" incluye las rutinas sin categoría. | Conteos coherentes con lo que ve esta cuenta (34 rutinas de sistema; la base cuenta más por RLS: no es un fallo de la app). | `workout_templates.routine_category` (la calcula el servidor). |
| 4.2 | Favoritos: corazón en una rutina → aparece en "Favoritas" y en el Detalle; cerrar sesión y volver a entrar: sigue. Quitarlo. Sin red: el corazón vuelve atrás con toast de error. | Si había favoritos locales antiguos, se suben tras el primer inicio de sesión (y se borran las claves locales). | `user_favorites` (altas y bajas; PK `user_id, item_type, item_id`). |
| 4.3 | "Solo favoritos" sin favoritas. | Estado vacío y "Ver todas". | — |
| 4.4 | Ejercicios: buscar, zona, equipamiento, "Ver todos" y filtros → "Ver N ejercicios". | Abren la lista con el filtro correcto. | — |
| 4.5 | Detalle de rutina: Empezar / Continuar / Retomar; compartir; "…" solo en rutinas propias (Editar / Eliminar); tocar un ejercicio → detalle. | El menú "…" no aparece en rutinas de sistema. | — |
| 4.6 | Asistente de rutina: nombre obligatorio, tipo, nivel, duración; elegir y ordenar ejercicios; Guardar → detalle de la nueva rutina. Editar una propia carga sus datos y "Guardar cambios". ⚠⭐ (crear una rutina propia otorga puntos y la medalla `first_custom_workout` la primera vez) | La rutina nueva aparece en la lista. | `workout_templates` (propia), `template_exercises`; evento `custom_workout_created`. |
| 4.7 | Eliminar una rutina propia. ⚠🗑 | Desaparece de todas las listas. | `workout_templates` sin la fila. |
| 4.8 | Exercise Detail: favorito, "tu mejor" → Récords, expandir técnica y errores, pantalla completa (abrir y cerrar), "Agregar a rutina". | "3 × 12–15" en lugar de "- × -"; una rutina con ejercicios sin reps muestra el esquema recomendado. | — |
| 4.9 | Sin red: cada pantalla muestra el error y "Reintentar" recupera. | — | — |

**Consulta Lovable (solo lectura) · Bloque 4**
```
SOLO LECTURA (SELECT). Para user_id = '<UID>':
1) user_favorites (item_type, item_id, created_at).
2) workout_templates creadas por el usuario (id, title, routine_category, created_at) y sus template_exercises.
3) gamification_events de tipo custom_workout_created (reference_id, points) y user_badges con badge_id = 'first_custom_workout'.
4) Conteo de workout_templates visibles para el usuario por routine_category (para comparar con las tarjetas de Entrenos).
```

---

## Bloque 5 · Sesión

Referencias: `SESSION_01..07`, `STATE_09`. Cuenta falcon1989. Si hay una sesión atascada de pruebas anteriores, ábrela primero (paso 5.12).

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 5.1 | Detalle de rutina → "Empezar". | Crea la sesión y sus ejercicios planificados; el cronómetro corre. | `workout_sessions` (`status = 'in_progress'`) y **una fila por ejercicio** en `workout_session_exercises`. |
| 5.2 | Registrar 3 series con reps y kg editados. | Descanso "entre series" con el descanso planificado; +30 s suma; "Saltar" vuelve; al llegar a 0 vibra y sale "Tu turno". Peso inicial: serie anterior → último peso → `planned_weight_kg` → vacío. | `workout_session_sets`: 3 filas (`weight_kg`, `reps`, `exercise_position`, `set_index`). |
| 5.3 | Registrar dos series con un descanso con pausa y +30 s entre ellas. | — | `rest_actual_sec` de la 2.ª serie ≈ el descanso real; la 1.ª serie `NULL`. |
| 5.4 | Última serie de un ejercicio. | Descanso "entre ejercicios" y el ejercicio pasa a "hechos". | `workout_session_exercises.status = 'completed'` de ese ejercicio. |
| 5.5 | Pausa de 1 min y continuar (con un descanso en curso). | El cronómetro no suma ese minuto; el descanso se congela. | `workout_sessions.paused_total_sec ≈ 60`. |
| 5.6 | Atrás → diálogo; "Guardar y salir". | Inicio muestra **"Retomar"**; al tocarlo vuelve a la misma serie (también al día siguiente). | `status = 'saved'` (con las series ya guardadas). |
| 5.7 | Menú → "Salir sin guardar" → confirmación. ⚠🗑 | Inicio sin "Retomar". | `status = 'canceled'`, `cancel_reason = 'user'`. Una `in_progress` de otro día sin series: `canceled` + `'expired'`; con series: `saved`. |
| 5.8 | Menú → "Finalizar" con ejercicios pendientes. | Resumen con "n de m". | `completed_exercises` coherente. |
| 5.9 | Completar una rutina entera. ⚠⭐ (+50 puntos por `workout_completed`; `first_workout`/`week_consistency` la primera vez) | Resumen: duración **sin pausas**, volumen del servidor, series. Los puntos llegan **una vez**. | `status = 'completed'`, `ended_at`, `volume_kg`; evento `workout_completed` (referencia = id de sesión). |
| 5.10 | En el Resumen, "Registrar récord" si hay récord nuevo. ⚠⭐ (+25 por récord) | Registra y deja de aparecer. | `personal_records` con `source = 'session'` y `session_set_id`. Revisar también el evento `personal_record_created` del 2026-10-03 a la 01:16: ¿corresponde a un récord manual (`source = 'manual'`, sin `session_set_id`)? |
| 5.11 | Modo avión al finalizar: STATE_09 ("Está a salvo en este teléfono"); "Reintentar ahora" sin red sigue en error; "Continuar sin sincronizar" → Inicio; al volver la red y abrir una sesión, se sincroniza. | Si queda una serie de la sesión sin enviar, **no** se da por guardada: aparece STATE_09. | Las series y la sesión llegan; la cola local `@athelete/session-outbox-v1:<UID>` queda vacía (sin filas pendientes). |
| 5.12 | Si había 3 series atascadas de la prueba anterior: abrir esa sesión. | Se reenvían (primero se crean los ejercicios planificados, después las series). | Las 3 filas aparecen en `workout_session_sets`; sin error de clave foránea (`workout_session_sets_exercise_fk`). |
| 5.13 | Inicio tras la sesión: hero "Retomar" (guardada), "Entreno hecho" (completada con Core 33 activo sin cerrar) o "Todo completado". | Los modos HOME_03, HOME_04 y HOME_06 salen con datos reales. | — |

**Consulta Lovable (solo lectura) · Bloque 5**
```
SOLO LECTURA (SELECT). Para user_id = '<UID>', sesiones desde <HORA_INICIO>:
1) workout_sessions: id, status, cancel_reason, date, started_at, ended_at, paused_total_sec, paused_at, volume_kg, duration.
2) workout_session_exercises por sesión (position, name, planned_sets, status) y su conteo.
3) workout_session_sets por sesión (exercise_position, set_index, reps, weight_kg, rest_actual_sec, completed_at).
4) Sesiones con series pero sin filas en workout_session_exercises (debería ser 0).
5) personal_records recientes (source, session_set_id, recorded_at) y gamification_events de workout_completed y personal_record_created.
```

---

## Bloque 6 · Progreso (Resumen, Récords, Logros)

Referencias: `PROGRESS_01..04`, `RECORDS_01..02`, `ACHIEVEMENTS_01..02`. Cuenta falcon1989.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 6.1 | Resumen vacío (cuenta D o sin datos): hero "Tu evolución empieza aquí", cápsulas vacías, "Tu primera marca aparecerá aquí". | — | — |
| 6.2 | Tras completar un entreno (Bloque 5): abrir Progreso → Resumen. | Aparece en la semana con los **minutos activos (sin pausas)**; hero y trío se actualizan al volver al tab; la racha suma. Todo viene de `get_progress_summary` con la zona horaria del teléfono. | La RPC `get_progress_summary(_from, _tz)` devuelve para el día las mismas sesiones y `active_seconds`. |
| 6.3 | Semana vs mes: el día entrenado se pinta según los minutos y la leyenda coincide. | Comparar los minutos de hoy con el anillo de Entreno de Inicio. | — |
| 6.4 | Hidratación y Nutrición de la semana: reflejan los registros; tocar abre el plan. | Coinciden con el Bloque 8 (mismas cifras). | — |
| 6.5 | Récords: "Registrar récord" desde Inicio, desde Progreso y desde el detalle; los 5 tipos con su unidad; "Supera tu mejor marca por …" correcto. | — | — |
| 6.6 | Guardar un récord que **supera** la mejor marca. ⚠⭐ (+25 puntos **una sola vez**) | Celebración. Repetir el mismo no suma. | `personal_records` + evento `personal_record_created` (referencia = id del récord). |
| 6.7 | Guardar un récord que **no** la supera. | Toast, sin celebración. | Fila en `personal_records`; sin puntos nuevos. |
| 6.8 | Un récord detectado en sesión aparece como "De una sesión"; uno manual como "Manual". Eliminar un manual con pulsación larga. ⚠🗑 | Solo los manuales se pueden eliminar. | `personal_records.source`; la fila desaparece. |
| 6.9 | Logros: la colección ("N / 13") sale de `get_badge_progress`; repisas por categoría; los bloqueados con su avance ("3 de 7"); la hoja muestra la fecha o el avance. | 13 logros (incluye `nutrition_activated`); un logro sin icono usa el genérico; una categoría desconocida va a "Otros". | `user_badges` (medallas conseguidas y fecha). Si el JSON real de la RPC difiere de lo supuesto, anótalo (ver `MIGRATION_PROGRESS` §26). |
| 6.10 | Sin red: Resumen, Récords y Logros muestran el error y "Reintentar" recupera. | — | — |

**Consulta Lovable (solo lectura) · Bloque 6**
```
SOLO LECTURA (SELECT / llamadas a RPC de lectura con el JWT del usuario). Para user_id = '<UID>':
1) get_progress_summary(_from => date_trunc('year', now())::date, _tz => 'America/Santiago'): devuélveme el JSON completo (days y months) y compáralo con workout_sessions completadas (date, sessions, active_seconds = ended_at - started_at - paused_total_sec, volume_kg).
2) get_badge_progress(): JSON completo (badge_id, category, current, target, earned, y qué otras claves trae) y user_badges (badge_id, earned_at).
3) personal_records (source, session_set_id, recorded_at, pr_type, values) y gamification_events de personal_record_created con su reference_id y points.
```
(Cambia la zona horaria por la del teléfono de pruebas.)

---

## Bloque 7 · ELLIE

Referencias: `ELLIE_01..03`, `STATE_08`. Cuenta falcon1989. ⚠💳 **Cada mensaje real gasta créditos de IA y escribe en `chat_messages`.** Haz solo los envíos que pide cada paso y apunta cuántos.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 7.1 | Abrir el tab ELLIE (sin enviar nada). | Portada: saludo (frase real de ELLIE), dos respuestas rápidas, "Retomar conversación" con el hilo real, "También puedo", escaneo (inerte con aviso), "Para leer con ELLIE". | — |
| 7.2 | ⚠💳 Tocar una respuesta rápida (1 mensaje). | La pastilla pasa de enviando a enviado; llega la respuesta; no se envía dos veces. | `chat_messages` (un `user` y un `assistant`). |
| 7.3 | ⚠💳 "Quiero un plan nutricional": aparece la tarjeta del plan. **Activar plan.** ⚠⭐ (+40 puntos por `nutrition_activated`; medalla `nutrition_started`) | Pasa a "Plan activo". Verifica el plan en Nutrición (Bloque 8). "Otra versión" y "Ajustar" funcionan. | `nutrition_plans` (nuevo `is_active = true`, el anterior inactivo); evento `nutrition_activated` (referencia = id del plan). |
| 7.4 | ⚠💳 Rutina propuesta por ELLIE: **Guardar** y **Empezar**. | Guarda la rutina; "Empezar" abre su detalle. | `workout_templates` nueva y `template_exercises`. |
| 7.5 | Modo avión: enviar un mensaje. | "No enviado · Reintentar" y la frase de ELLIE de "sin conexión"; el campo queda inactivo; al volver la red y reintentar, se envía **una** vez. | `chat_messages` sin duplicar el mensaje. |
| 7.6 | Entradas con su prompt (envían **una sola vez** al llegar). ⚠💳 (una por entrada, no las repitas): Inicio ("Hablar con ELLIE"), Progreso ("Analiza mi semana"), Notificaciones ("Activa tu plan nutricional"), Nutrición ("Crear / Ajustar con ELLIE"). | El chat se abre y envía su prompt una sola vez. | `chat_messages`. |
| 7.7 | Teclado: el campo no queda tapado; al llegar un mensaje se baja al último. | — | — |
| 7.8 | "Nueva conversación" (menú "…") → confirmar. ⚠🗑 | Borra el hilo único y empieza uno nuevo. | `chat_messages` del usuario vacío. |
| 7.9 | Límite (429/402): cuando ocurra, comprobar el aviso "Límite alcanzado" con el campo inactivo. | No se provoca a propósito. | — |

**Consulta Lovable (solo lectura) · Bloque 7**
```
SOLO LECTURA (SELECT). Para user_id = '<UID>', desde <HORA_INICIO>:
1) chat_messages (role, left(content, 80), created_at) ordenados; confirma que cada mensaje del usuario aparece una sola vez.
2) nutrition_plans (id, target_calories, target_protein, target_carbs, target_fats, is_active, source, created_at).
3) gamification_events de nutrition_activated (reference_id, points, metadata) y user_badges con badge_id IN ('nutrition_started','nutrition_activated').
4) workout_templates creadas por ELLIE (source / created_by_ai) y sus template_exercises.
```

---

## Bloque 8 · Nutrición e hidratación

Referencias: `NUTRI_01..03`. Cuenta falcon1989.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 8.1 | **Sin plan:** abrir Nutrición (anillo de Inicio o desde Progreso). | "Sin plan activo", indicador sin meta; "Crear con ELLIE" abre el chat con su prompt (se envía al llegar: ⚠💳 solo si no lo hiciste en 7.6). | — |
| 8.2 | **Con plan** (el activado en 7.3): indicador de 270°, tres columnas de macros y tarjeta "Ajustar con ELLIE". | Cifras iguales a las de `nutrition_plans` y `daily_nutrition_logs` de hoy; "Te quedan N kcal". | `nutrition_plans` activo; `daily_nutrition_logs` de hoy. |
| 8.3 | **Registrar comida:** "+250 kcal" y "+10 g" de proteína → Guardar. ⚠⭐ (+10 puntos `nutrition_logged`, **una vez por día**) | Se suma a los totales; Inicio y Progreso muestran lo mismo. Repetir el mismo día **no duplica puntos**. | `daily_nutrition_logs` (calorías y macros sumados, `adherence`); un solo evento `nutrition_logged` (referencia = fecha). |
| 8.4 | Error al guardar (modo avión). | La hoja se queda abierta con el aviso y deja reintentar. | Sin cambios en la base. |
| 8.5 | **Agua:** "+1 vaso" 5 veces seguidas y rápido. | Responde al instante; el contador sube en Nutrición **y** en el anillo de Inicio; sin retrocesos. | `daily_hydration_logs.water_ml` de hoy suma 5 × 250. |
| 8.6 | Llegar a la meta de agua del día (por defecto 14 vasos). ⚠⭐ | La medalla de hidratación llega **una sola vez** por la regla del servidor; "objetivo cumplido". | `user_badges` (`hydration_3_days`, `hydration_7_days` o `weekly_hydration_master` cuando corresponda); eventos `hydration_logged` por llamada, puntos solo la primera vez del día. |
| 8.7 | Modo avión al sumar un vaso. | El vaso vuelve atrás y sale un toast de error. | Sin cambios. |
| 8.8 | Inicio: el anillo de Nutrición abre la hoja de registro; el "+1" del anillo de agua se refleja en Nutrición. Progreso: proteína media e hidratación semanal coinciden tras registrar. | Los números coinciden en las **tres** pantallas (Nutrición, Inicio, Progreso). | — |

**Consulta Lovable (solo lectura) · Bloque 8**
```
SOLO LECTURA (SELECT). Para user_id = '<UID>', fecha de hoy:
1) daily_nutrition_logs de hoy (calories, protein, carbs, fats, adherence) y nutrition_plans con is_active = true.
2) daily_hydration_logs de hoy (water_ml) y profiles.daily_water_goal.
3) gamification_events de hoy de tipo nutrition_logged y hydration_logged (reference_id, points, created_at): confirma que nutrition_logged tiene UNA fila por día con puntos.
4) user_badges de hidratación y su earned_at.
```

---

## Bloque 9 · Core 33

Referencias: `HOME_10`, `HOME_11`, `CORE33_01..06`, `OVERLAY_01`. Cuenta falcon1989 (sin reto activo al empezar). Los pasos 9.9 y 9.10 son irreversibles: haz uno solo, idealmente con una cuenta de prueba ya en el día 33.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 9.1 | Inicio sin Core 33 → tarjeta de invitación (HOME_10). "Ahora no". | La tarjeta desaparece; vuelve a los 14 días; tras el **segundo** descarte no vuelve (el contador se reinicia al completar otro Core 33). | `profiles.core33_invite_dismissed_at` con fecha y `core33_invite_dismiss_count` +1 (0 → 1 → 2). |
| 9.2 | Menú dev "Restablecer card de Core 33". | La tarjeta vuelve a aparecer. | `core33_invite_dismissed_at = NULL` y `core33_invite_dismiss_count = 0`. |
| 9.3 | "Descubrir Core 33" **la primera vez** → Intro (3 momentos) → "Explorar retos". Probar "Saltar". | Intro con 3 segmentos; al salir se marca como vista. Segunda vez: la tarjeta lleva directo a Explorar. | `profiles.core33_intro_seen_at` con fecha. |
| 9.4 | Explorar retos → Detalle (Construye fuerza; probar Recupera mejor) → "Elegir este reto" → "Tu Core 33 está listo". | "Encaja con tu objetivo" según el objetivo del perfil; "Elegirlo no empieza el Día 1". "Empezar más tarde" **no** guarda nada. | Sin fila nueva en `challenge_participations`. |
| 9.5 | "Comenzar Día 1". Sin red primero (estado de error y "Reintentar"), luego con red. | "Empezando…"; abre el día. Con otro reto ya activo: "Ya tienes un Core 33 activo" y "Ir a mi reto"; **no** se crea una segunda. | `challenge_participations`: una fila `active`, `start_date` = hoy local, `habits` = `[{id:'core33:<reto>:<n>', category, name}]` ×3. |
| 9.6 | Día a día: marcar y desmarcar hábitos; marcar los 3 **seguidos y rápido**. Sin red: el hábito vuelve atrás con toast. ⚠⭐ (+20 puntos por `core33_day_completed`, una vez por día) | El día se cierra **una sola vez**; "Día cerrado" y la cápsula del día se llena. | `habit_logs` (`participation_id`, `date`, `habit_index`, `completed`); un evento `core33_day_completed` (referencia `participación:fecha`). |
| 9.7 | Mismos números en tres sitios: pantalla del día, Inicio (hero "Core 33" y anillos) y Progreso · Retos. | Mismo día, días cerrados y racha. | — |
| 9.8 | Día perdido (dejar un día sin cerrar, p. ej. con una cuenta cuyo reto empezó días atrás). | Hero: "Llevas N días sin cerrar. El reto termina cuando cierres 33."; la racha vuelve a 0; el reto **no** termina. | — |
| 9.9 | **Racha de 7 días:** cerrar 7 días seguidos. ⚠⭐ | Medalla `streak_7_days` una sola vez. | Evento `core33_streak_7` (referencia = id de la participación) y `user_badges`. |
| 9.10 | **Completar el día 33** (cuenta ya en el día 33). ⚠⭐🗑 (+500 puntos y medalla `core33_finisher`; el reto pasa a completado) | Celebración (OVERLAY_01); la pantalla pasa a "Reto completado" y "Explorar otro Core 33". Inicio: "Empieza otro Core 33" aparece **desde el día siguiente**. | `challenge_participations.status = 'completed'`; `profiles.core33_completed_at` con fecha y `core33_invite_dismiss_count = 0`; eventos `core33_completed` y `user_badges.core33_finisher` **una sola vez**. |
| 9.11 | "Dejar este reto": menú "…" → confirmar. ⚠🗑 | Vuelve a Explorar retos. Si el servidor rechazara `abandoned`, la app lo avisa y el reto sigue activo (BT-37 está confirmado por backend: no debería ocurrir). | `challenge_participations.status` de esa fila (anota el valor real que quedó). |
| 9.12 | Zona horaria: con el teléfono en otra zona, el día del reto cambia a medianoche local. | — | — |

**Consulta Lovable (solo lectura) · Bloque 9**
```
SOLO LECTURA (SELECT). Para user_id = '<UID>':
1) challenge_participations (id, status, start_date, habits (jsonb completo), created_at).
2) habit_logs por participación (date, habit_index, completed) y cuántos días tienen los 3 hábitos completados.
3) gamification_events de core33_day_completed, core33_streak_7 y core33_completed (reference_id, points, created_at); confirma que no hay duplicados por reference_id.
4) user_badges con badge_id IN ('streak_7_days','core33_finisher').
5) profiles: core33_intro_seen_at, core33_completed_at, core33_invite_dismissed_at, core33_invite_dismiss_count.
6) Confirma que el reference_id de core33_day_completed es '<participation_id>:<YYYY-MM-DD>' (reference_kind participation_date) y el de core33_completed '<participation_id>' (challenge_participation), y que no hay duplicados.
```

---

## Bloque 10 · Perfil y Ajustes

Referencias: `PROFILE_01..03`, `HEALTH_02..03`, `ACHIEVEMENTS`. Cuenta falcon1989.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 10.1 | Perfil desde el avatar de Inicio. | Nombre, objetivo, días, cifras (sesiones, racha, puntos) y vitrina coinciden con tus datos; tocar la vitrina abre Logros; la trayectoria muestra hasta 5 hitos. | — |
| 10.2 | Perfil con una cuenta **sin onboarding** (si aún tienes una, o D antes de completarlo). | "Completa tu perfil" y Editar con valores por defecto. | — |
| 10.3 | Editar perfil → cambiar peso, nivel, minutos y objetivo → **Guardar** ("Guardando…", "Guardado ✓"). | Perfil, Inicio y Entrenos lo reflejan. Minutos 5 y 240 guardan; fuera de rango no se pueden elegir. | `profiles`: `weight`, `training_level`, `preferred_session_minutes`, `goal`, `training_days_per_week` (solo lo que cambió). |
| 10.4 | Error de guardado: con modo avión, Guardar. | Aviso y deja reintentar; sin cambios. | Sin cambios. |
| 10.5 | Cambiar foto. | Sube a `profile-photos/<UID>/avatar`; se ve en Perfil y en el avatar de Inicio (puede tardar un refresco). | Objeto en el bucket `profile-photos`; `profiles.profile_photo_url`. |
| 10.6 | Ajustes: Apariencia (Claro/Oscuro/Sistema) cambia el tema al instante y se recuerda. | — | — |
| 10.7 | Los 3 interruptores de notificaciones: cambiar, cerrar y reabrir la app. Con modo avión, el interruptor **vuelve atrás** con aviso. Si había valores antiguos en el teléfono, se suben una sola vez. | Se recuerdan entre sesiones y dispositivos. | `profiles.notification_prefs` = `{workouts, hydration, updates}`. |
| 10.8 | Filas deshabilitadas: Comunidad ("Próximamente") y Apple Health (placeholder: "Conectar" solo avisa). | No navegan a nada real. | — |
| 10.9 | Cambiar contraseña. | Llega el correo con el enlace de recuperación. | — |
| 10.10 | Cerrar sesión (confirmación). | Vuelve a Auth; se puede volver a entrar. | — |

**Consulta Lovable (solo lectura) · Bloque 10**
```
SOLO LECTURA (SELECT). Para id = '<UID>':
1) profiles: name, goal, training_level, preferred_session_minutes, training_days_per_week, weight, height, birth_date, profile_photo_url, notification_prefs, updated_at.
2) storage.objects del bucket 'profile-photos' con name LIKE '<UID>/%' (name, created_at, updated_at).
```

---

## Bloque 11 · Eliminar cuenta (solo cuenta D)

⚠🗑 **Irreversible. Nunca con falcon1989.** Usa D, ya con datos creados en los bloques anteriores (una sesión, una comida, un reto, una foto) para comprobar que se borra todo.

| # | Hacer | Esperar | Base |
|---|---|---|---|
| 11.1 | **Antes de borrar**, anota con la consulta Lovable inicial (abajo) cuántas filas tiene D en cada tabla y qué objetos hay en storage. | — | Conteos "antes". |
| 11.2 | Ajustes → Cuenta → Eliminar cuenta: primera confirmación → "Continuar" → segunda confirmación. | Doble confirmación; "Eliminando…". | — |
| 11.3 | **200 `{ok:true}`:** la app limpia las claves locales del usuario (cola offline, marcas de migración, preferencias) y cierra sesión; vuelve a Auth. | No queda sesión; no se puede entrar de nuevo con D. | Conteos "después" en 0 en todas las tablas; foto borrada del bucket; usuario fuera de `auth.users`. |
| 11.4 | **Idempotencia:** si es posible, repetir la llamada (o reabrir un dispositivo con sesión guardada). | Responde `ok` o cierra sesión (401) sin romper. | — |
| 11.5 | **409 `last_admin`** (solo si D fuera la única cuenta administradora): aviso claro y **no** se cierra sesión. | "No se puede eliminar la única cuenta administradora." | La cuenta sigue existiendo. |
| 11.6 | **500 / sin conexión:** simular con modo avión al confirmar. | Mensaje de error y botón "Reintentar"; no se borró nada. | La cuenta sigue existiendo; reintentar con red la elimina. |
| 11.7 | **401** (sesión inválida): si ocurre, la app cierra sesión. | Vuelve a Auth. | — |

**Consulta Lovable (solo lectura) · antes y después**
```
SOLO LECTURA (SELECT). Para user_id = '<UID_D>' (cuenta desechable), cuenta las filas en: profiles, workout_sessions, workout_session_exercises, workout_session_sets, workout_templates (created_by), personal_records, user_badges, user_favorites, nutrition_plans, daily_nutrition_logs, daily_hydration_logs, challenge_participations, habit_logs, chat_messages, gamification_events, quiz_attempts (si existe). Lista también los objetos de storage de '<UID_D>/' en profile-photos y si el usuario sigue en auth.users.
Antes de borrar: devuelve los conteos. Después de borrar: vuelve a ejecutar y confirma que todo es 0 y que no queda el usuario.
```

---

## Cierre

- [ ] Todos los bloques en Light y Dark.
- [ ] Anota qué pasos quedaron sin probar y por qué (red, cuenta, tiempo).
- [ ] Si algún resultado difiere de lo esperado, apunta la consulta Lovable que lo muestra y abre el BT correspondiente en `docs/backend/BACKEND_TODO.md` (BT-37 cubre `status`/`habits`; BT-35 el cierre atómico de Core 33; BT-36 la integridad de participaciones).

## De dónde sale cada paso (trazabilidad)

| Bloque | Origen en `MIGRATION_PROGRESS.md` |
|---|---|
| 1–2 | §12.0 (pendiente de validación visual: Auth, Onboarding, Bienvenida de ELLIE), §24 punto 8 |
| 3 | §15 (Inicio y Notificaciones), §16, §17 |
| 4 | §18.5, §20.5, §20.6 |
| 5 | §19.5, §20.5, §21 |
| 6 | §22.5, §26 puntos 4 y 5 |
| 7 | §23 |
| 8 | §25 |
| 9 | §17, §20.5, §21, §26 punto 2, §27 |
| 10 | §24, §26 puntos 3 |
| 11 | §24 punto 7, §26 punto 1 |
