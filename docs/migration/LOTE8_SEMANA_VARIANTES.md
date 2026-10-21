# Lote 8 · Tu semana + variantes en Sesión

Solo app (backend cerrado: `docs/backend/V2_15_SHAPES.md` §2 y §3, y "Cambios v2.15" de `ROUTINES_SHAPES.md`). Diseño: handoff v2.15 §25.1 (WEEK_01–05), §25.5 (HOME_18) y §25.6 (SESSION_10–12).

Estado al 21-10-2026:
- Hecho en código.
- **Sin compilar y sin probar** (ni simulador ni iPhone), como se pidió.
- Sin commits.
- No se tocan backend, Ruta, Comunidad, ELLIE ni MoveKitPlayer.
- Sin librerías nuevas y sin cambios nativos.

## 1 · Tu semana (25.1)

**Pantalla `Week`** (WEEK_01–03, WEEK_05), con `get_week_plan` y la zona del dispositivo:
- **Cabecera:**
  - "SEMANA 39" (semana ISO), rango "21 – 27 sep" y la línea resumen "n de m sesiones hechas · descansos · sin disponibilidad · sin planificar".
  - Botón con Halo de 24 pt que abre "Planificar con ELLIE".
- **Píldoras de los 7 días:** hoy en tinta; el día seleccionado con anillo; "no disponible" tachado. Los puntos siguen 25.1: hecho Ember, planificado tinta, sin hacer anillo Ember, vacío anillo gris.
- **Carrusel de tarjetas con snap**, que abre en hoy. Cabecera de 250 pt según el tipo: foto, descanso Recovery, "no disponible" rayado o "sin planificar".
- **Cuerpo de la tarjeta:**
  - Fila de Core 33.
  - Duración −/+ en pasos de 5, de 15 a 90.
  - Acciones: Cambiar rutina, Mover, Descanso/Entrenar, No disponible/Disponible y Otra con ELLIE.
  - Botón "Empezar" o "Retomar" solo hoy; nota en los días pasados.

**Acciones y su RPC:**

| Acción | RPC |
|---|---|
| Cambiar o elegir rutina, Descanso (hoja "Elige la sesión") | `set_week_day` |
| −/+ duración (se envía 600 ms después del último toque) | `set_week_day {minutes}` |
| Mover (aviso "Toca el día al que quieres mover…" y días destino en Ember al 10 %) | `move_week_day` |
| Otra con ELLIE / Sesión con ELLIE (Halo pensando sobre la foto, ≥ 1,1 s) | `regenerate_week_day` |
| Descanso → **Entrenar** | `regenerate_week_day` (ELLIE elige la sesión) |
| No disponible / Disponible (vuelve a descanso, como en el prototipo) | `set_week_day` |
| Hazla tú (hoja "¿Empezar en blanco?" → salta al siguiente día vacío) | `clear_week` |
| Día saltado: banda de ELLIE con Reacomodar / Dejar así | `resolve_missed_day` |
| Desactivar / activar el plan | `deactivate_week_plan` / `activate_week_plan` |

- **Día saltado:** tras reacomodar aparece la línea con check "X ahora está el miércoles". Si no queda un día libre, la banda solo ofrece "Entendido" (`keep`).
- **Desactivar el plan:** **no está diseñado**. Es un botón de texto bajo "Planificar la semana" con su confirmación.

**Pantalla `WeekEllie`** (WEEK_04):
- **Preguntas:**
  - Días: los pasados están inactivos; por defecto, todos los días desde hoy.
  - Foco: por defecto según el objetivo del perfil.
  - Minutos: por defecto, el más cercano a `preferred_session_minutes`.
- **Generación:** `plan_week_with_ellie` corre en paralelo con los tres pasos de 650 ms. Después, la vista previa por día.
- **Activar semana:** `EllieActionButton`, Ember con el **Halo mini**. Llama a `activate_week_plan`.
- **Ajustar respuestas** vuelve al paso 1.
- **Error al generar:** **no está diseñado**. La línea de ELLIE dice "No pude armar tu semana." con el texto del error, y ofrece "Reintentar" (con Halo) y "Ajustar respuestas".

**Errores:**
- `past_day`, `no_candidates`, `not_missed`, `no_free_day`, `plan_not_found`, `routine_not_found`, `invalid_input` (con su `field`: days, focus, minutes, week_start, answers, reason, template_exercise_id), `offline` y `unauthorized` tienen texto v2 en es y en (`routineErrors.ts`).
- Se muestran en un toast de error.

**Halo mini en las acciones de IA** (cierra 25.10.3): "Otra con ELLIE" y "Sesión con ELLIE" llevan el Halo de 18 pt en lugar del icono de refrescar; "Activar semana" también lo lleva.

## 2 · Inicio (25.5 · HOME_18)

- **Tira "Tu semana":** primer bloque de la superficie lino, sobre "Tu día".
  - Título, "n de m sesiones ›" ("Planifícala" sin sesiones) y siete píldoras de 64 pt con punto de 5 pt.
  - Todo el bloque abre Tu semana.
  - Tiene estados de carga y error, y se refresca al volver a Inicio.
- **Sugerencia del día:**
  - `get_today_suggestion` ya distingue `source: 'weekly_plan'`.
  - Con `reason_code: 'rest_day'`, el hero muestra el **estado de descanso** de la tarjeta de descanso de Tu semana: luna, "HOY · RECUPERACIÓN", "Día de descanso" y "Caminar o 10 min de movilidad, si te apetece.", con "Ver tu semana".
  - En un día no disponible dice "Hoy no entrenas", en lugar de "Elige tu entreno de hoy".
- Las tiles de Sueño y Respira (HOME_19–20) y la card de Ruta nueva **no** entran en este lote.

## 3 · Recordatorio de entreno

- **Con un plan activo:** dentro de su semana mandan los días con sesión del plan, y el texto lleva la rutina y los minutos ("Empuje · 40 min. Está en tu plan de la semana.").
- **Fuera de la semana del plan** (p. ej., el lunes siguiente) se usa el patrón de siempre.
- **Sin plan activo**, nada cambia.
- Con plan, también recuerda aunque el perfil no tenga días por semana.

## 4 · Variantes en Sesión (25.6 · SESSION_10–12)

- **Botones de la tarjeta:**
  - Nueva pill **"⟲ Variante"** junto a **"Técnica"**.
  - "Técnica" ya existía y abre MoveKit (Exercise Detail); solo cambia el icono: `CirclePlay` en lugar del de 3D.
- **Hoja de la lista** (oscura, en la escena de sesión):
  - Eyebrow con músculo y patrón ("CUÁDRICEPS · SENTADILLA"), "Cambiar X" y la nota.
  - Chips "¿Qué pasa?": Máquina ocupada, Sin mancuernas, Molestia y **Otro**. "Otro" busca sin filtro y guarda `variant_reason: 'other'`.
  - Hasta 3 opciones con icono por equipo, "Equipo · nota" y la pill **"Recomendada"**.
  - Si ya hay una variante, aparece "Volver a [original]".
  - Tiene estados de carga, error con reintento y "sin opciones".
- **Hoja de guardar:**
  - **Solo hoy:** la variante vale para el resto de la sesión. Conserva series, repeticiones, descanso y las series ya hechas.
  - **Guardar en la rutina:** usa `replace_routine_exercise`.
  - **Elegir otra.**
- **Tarjeta con variante:** etiqueta "VARIANTE · HOY" o "VARIANTE · EN TU RUTINA", y el peso dice "kg · ajusta el peso".
- **Toasts:** "Cambiado solo para hoy", "Guardado en X", "Guardado en tu versión de X" (con `copied: true`) y "Volviste al ejercicio original".
- **Guardado de la sesión:**
  - La fila de `workout_session_exercises` lleva `exercise_id` = la variante, `original_exercise_id` y `variant_reason`.
  - Si la fila aún no existía, se crea ya con esos campos.
  - Las sesiones sin variantes **no envían** las columnas nuevas.
  - Las series de la variante se guardan con su `exercise_id`.
- **Al retomar una sesión guardada,** las variantes se recuperan de la base.
- **Con `copied: true`:**
  - Desde ese momento "Guardar en la rutina" escribe en la copia.
  - La copia queda en la caché del detalle.
  - Los días de la semana activa, desde hoy, que tenían la rutina original pasan a la copia, con `set_week_day` y sin bloquear si falla.
- **La rutina de la sesión se lee una sola vez:** guardar en ella no reconstruye la sesión en curso.

## Archivos

**Nuevos:**
- `src/features/week/weekModel.ts`, `src/features/week/v2/WeekParts.tsx`
- `src/screens/week/WeekScreen.tsx`, `src/screens/week/WeekEllieScreen.tsx`
- `src/services/routines/weekPlanService.ts`
- `src/hooks/useWeekPlan.ts`
- `src/features/home/v2/WeekStrip.tsx`
- `src/features/session/variantModel.ts`, `src/features/session/v2/VariantSheet.tsx`
- `__tests__/weekPlan.test.ts`, `__tests__/sessionVariants.test.ts`

**Modificados:**
- Rutinas y catálogo: `src/services/routines/routinesService.ts` (códigos nuevos, `restDay`, variantes y `replace_routine_exercise`), `src/features/workouts/routineErrors.ts`, `src/services/catalog/catalogService.ts` (`muscleLabel`).
- Navegación: `src/constants/routes.ts`, `src/types/navigation.ts`, `src/navigation/RootNavigator.tsx`.
- Inicio: `src/features/home/homePriority.ts`, `src/features/home/v2/HomeHero.tsx`, `src/screens/tabs/HomeScreen.tsx`.
- Recordatorios: `src/features/push/localReminders.ts`, `src/features/push/useLocalReminders.ts`.
- Sesión: `src/features/session/sessionModel.ts`, `sessionDbMapping.ts`, `useSessionRunner.ts`, `v2/SessionViews.tsx`, `src/services/supabase/session.ts`, `src/screens/workouts/WorkoutSessionScreen.tsx`.
- Tests: `__tests__/homePriority.test.ts`, `localReminders.test.ts`, `routinesService.test.ts`.

## Verificación

- `tsc --noEmit`: 0 errores.
- `eslint` (archivos tocados): 0 errores. Quedan 3 avisos que ya existían (`homePriority` shadow, `SessionViews:282`).
- `jest --findRelatedTests`: 16 suites, 191 tests OK. `App.test.tsx` aparte: 2/2.
- Sin builds, como se pidió.

## Qué probar en el iPhone

1. **Inicio:**
   - La tira "Tu semana" aparece sobre "Tu día", con los puntos correctos, y abre Tu semana.
   - Con el día de hoy en descanso o no disponible en el plan, el hero muestra el estado de descanso y "Ver tu semana".
2. **Tu semana:**
   - Abre en la tarjeta de hoy. Tocar una píldora lleva a su tarjeta, y el snap del carrusel encaja.
   - Cambiar rutina (hoja), −/+ duración (los minutos se mantienen tras recargar) y Descanso/Entrenar.
   - No disponible/Disponible.
   - Mover: tocar Mover, después la píldora destino.
   - Otra con ELLIE: Halo pensando sobre la foto.
3. **Días pasados:** no muestran acciones, solo su nota. Forzar un cambio en un día pasado debe dar "Ese día ya pasó".
4. **Hazla tú:**
   - La confirmación vacía los días desde hoy y abre el selector de hoy.
   - Al elegir, salta al siguiente día vacío.
5. **Planificar con ELLIE:**
   - Los días pasados están inactivos y "Siguiente" queda inactivo sin días.
   - Foco, minutos, los tres pasos y la vista previa.
   - "Activar semana" con Halo: Inicio y Tu semana quedan con el plan.
   - Probar sin conexión: error con Reintentar.
6. **Día saltado:**
   - Con una sesión de ayer sin hacer, la banda de ELLIE ofrece Reacomodar o Dejar así.
   - Tras reacomodar, la línea con check y la tarjeta del día destino.
7. **Desactivar el plan:** Inicio vuelve a sugerir rutina. Activar de nuevo.
8. **Recordatorios** (con permiso y el interruptor de entrenos): con un plan activo, el aviso de las 18:00 solo llega los días con sesión, con la rutina y los minutos.
9. **Sesión · variantes:**
   - "Variante" junto a "Técnica" (icono de reproducir).
   - Chips de motivo y "Recomendada" en la primera opción.
   - Solo hoy: toast, etiqueta "VARIANTE · HOY" y las series ya hechas siguen.
   - Guardar en la rutina:
     - en una rutina propia: "Guardado en X";
     - en una oficial: "Guardado en tu versión de X", la copia aparece en Mis rutinas y el día de la semana pasa a la copia.
   - Volver al original.
   - Guardar para después y retomar: la variante sigue.
   - En Supabase, la fila de `workout_session_exercises` tiene `original_exercise_id` y `variant_reason`.

## Pendiente o abierto

- **Sin diseño:** desactivar el plan, el error al planificar con ELLIE y el chip "Otro". Hay que revisarlos con diseño.
- **Sin hacer:**
  - La entrada desde Progreso "Plan de la semana" (25.10.11).
  - El gesto de arrastrar un día sobre otro (mantener pulsado, 25.10.4): se mueve con el botón Mover.
  - Las guías.
- **Al retomar una sesión,** una variante guardada en la rutina vuelve como "VARIANTE · HOY": la base no guarda dónde se guardó.
- **Con `copied: true`,** la sesión en curso sigue apuntando a la rutina original (`workout_sessions.workout_id`). La copia se usa desde ahí.
