# Lote 1 · Rutinas en la app · B-03, B-02 y B-05

Contrato: `docs/backend/ROUTINES_SHAPES.md` (única fuente). Estado al 16-10-2026: hecho en código; **sin probar en iPhone**. Verificado: `tsc` y `eslint` sin errores (los warnings que quedan ya estaban), 879 tests (82 suites), bundle de Release (Metro) y build Debug de iOS para simulador arm64 (`xcodebuild`, sin abrir el simulador): **BUILD SUCCEEDED**. Sin commits.

**Ojo con `pod install`:** después del `pod install`, `Pods/React-Core-prebuilt` quedó con el framework de React Native en sabor **Release** y sin su marcador `.last_build_configuration`. El script de Xcode supone entonces que es Debug, no lo cambia, y el build Debug falla al enlazar (símbolos `DebugStringConvertible` que piden ExpoModulesCore y RNSVG). Lo dejé en Debug con el mismo script que usa Xcode (`replace-rncore-version.js -c Debug`). Si vuelve a pasar tras otro `pod install`: escribir `Release` en `ios/Pods/React-Core-prebuilt/.last_build_configuration` y compilar en Debug; Xcode lo cambia solo. El destino genérico con x86_64 no enlaza con este framework: hay que compilar para arm64.

## Librería
`expo-image` **56.0.13** (la que fija `bundledNativeModules` del SDK 56; no había ninguna librería de imágenes con caché en disco). `pod install`: ExpoImage 56.0.13. Para resolver dependencias hubo que bajar **SDWebImageWebPCoder de 0.15.0 a 0.14.6** (`pod update SDWebImageWebPCoder`): expo-image pide `~> 0.14.6` y expo-image-manipulator acepta cualquiera. `project.pbxproj` solo trae los cambios que hace CocoaPods al integrar.

## A · B-03 Rutinas que no se encuentran
**Causa:** el detalle y «Comenzar» buscaban la rutina en `useWorkoutLibrary`, que solo traía las oficiales (`created_by is null`). Las rutinas del usuario y las de ELLIE nunca estaban en esa lista: «Rutina no encontrada».

1. **Detalle y Comenzar** (`WorkoutDetailScreen`, `WorkoutSessionScreen`) leen siempre `get_routine(id)` (`useRoutine`, con `refetchOnMount: 'always'`); nunca una lista. `routine_not_found` → el estado de error que ya había («Rutina no encontrada»), sin reintentos. En Sesión, «Esta rutina ya no está disponible.».
   - **B-04:** en los estados de error / no encontrada, el botón Atrás era el de cristal (blanco sobre fondo claro, invisible). Ahora es el `BackButton` normal. Sobre la foto sigue el de cristal.
2. **Crear y editar** (`CreateRoutineScreen`): `save_user_routine` / `update_user_routine` con `origin: 'user'`. Cada ejercicio lleva `block` (`main` por defecto; al editar se conserva el que tenía) y `planned_weight_kg`. Los valores se mantienen dentro de los límites del contrato (series 1–20, reps 1–200, duración 0–7200 s, descanso 0–900 s). Una fila antigua sin ejercicio del catálogo no se puede enviar: se avisa para cambiarla o quitarla.
   - **Borrar:** `delete_user_routine`. Con `archived: true` sale el aviso «Rutina archivada · Está compartida en una publicación, así que se archivó en vez de borrarse…». También se refrescan los favoritos (el servidor la quita).
   - Se mantiene el evento `custom_workout_created` (150 pts + `first_custom_workout`) al crear, como antes. Es una RPC, no una escritura en tablas. **A confirmar con backend** si `save_user_routine` ya lo otorga; el evento es idempotente por id.
   - **Agregar a rutina** (desde un ejercicio): la lista de rutinas propias sale de `list_routines('mine')`, y añadir hace `get_routine` + `update_user_routine` con el ejercicio al final (antes era un INSERT directo).
3. **Rutina de ELLIE:** `save_user_routine` con `origin: 'ellie'`, `chat_message_id` = id del mensaje con `generate_workout_plan` y `exercises` = `tool_data.exercises`. La tarjeta guarda ahora el id real del mensaje (`messageId`): con «Otra versión», la tarjeta conserva su sitio pero el plan pertenece al mensaje nuevo, y ese es el que se envía. Con `replayed: true` se abre la rutina ya guardada (no se duplica).
4. **Sin escrituras directas** en `workout_templates` / `template_exercises`. Quedan dos **lecturas**: el conteo de ELLIE (`ellie.ts`, `head: true`) y la tarjeta de rutina propia al publicar en Comunidad (`attachmentSources.ts`).
5. **Errores del contrato** con textos v2 en es/en (`features/workouts/routineErrors.ts`, idioma de `profiles.language`): `invalid_input` con texto por `field` (title, type, difficulty, exercises, exercises[], chat_message_id, scope, cursor), `exercise_not_found`, `routine_not_found`, `chat_message_not_found`, más sesión caducada, sin conexión y genérico.
6. **Tras guardar, editar o borrar** se invalidan `list_routines` (`['routines','list']`) y la sugerencia del día (`['routines','today']`), y el detalle queda con la rutina devuelta. Lo mismo al guardar la de ELLIE y al guardar una copia desde Comunidad.
7. **Orden del backend** (warmup → main → cooldown), sin reordenar. Si hay calentamiento, el detalle lo muestra en su propio recorrido con la etiqueta «Calentamiento» (la UI completa es F-06). La sesión sigue el mismo orden.

## B · B-02 Sugerencia del día
1. **Inicio** (hero) y **Entrenos** («Tu próxima sesión») usan `get_today_suggestion(_tz)` con la zona del dispositivo. Muestran la rutina, el motivo (`reason`) y la duración. En Inicio: título, motivo y minutos (el contrato no trae ejercicios ni kcal, así que esas cifras no salen). En Entrenos: «45 min · Intermedio · Ayer hiciste tren superior». Tocar abre el detalle (`get_routine`).
   - El usuario nuevo (`reason_code: first`) también recibe la sugerencia; ya no se calcula «la rutina principiante más corta» en la app.
2. **`source: 'none'`**: en Inicio, el estado vacío que ya tenía el diseño («Elige tu entreno de hoy» → Entrenos); en Entrenos, sin hero (el diseño no tiene un estado para este caso).
3. **Caché por día local:** la clave lleva la fecha local y la zona, `staleTime` infinito (no se vuelve a pedir al volver a Inicio). Se invalida al guardar una sesión: al terminar, guardar para después o sincronizar la cola offline.
   - «Para entrenar esta semana» (Inicio) sigue ordenando por objetivo la primera página de `list_routines`.

## C · B-05 Velocidad del catálogo y de las rutinas
1. **Catálogo**
   - `catalog_version()` al arrancar con sesión (`useCatalogBoot` en `App.tsx`).
   - Caché persistente (`lib/catalog/catalogCache.ts`, AsyncStorage `@athelete/catalog/v1`): páginas de `list_exercises` sin búsqueda y respuestas de `get_exercise`, ligadas a la `version`. Si cambia la versión se borra lo guardado y las pantallas abiertas lo vuelven a pedir. Máx. 300 entradas (se van las más antiguas). Las búsquedas no se guardan.
   - Lista (`ExerciseListScreen`, selector del creador, selector de récords): `list_exercises` con scroll infinito (30 por página, `next_cursor`). Zona, equipo, nivel y búsqueda van al servidor; la búsqueda espera ~300 ms y mientras carga se quedan las filas anteriores.
   - Una zona de la app es varios músculos (Brazos = bíceps + tríceps + antebrazos; Piernas = cuádriceps + isquios + gemelos + aductores + tibial) y el filtro permite varios equipos. Como `_muscle` y `_equipment` aceptan un solo slug, cada combinación es un «stream» paginado y se mezclan por nombre sin repetir (`lib/catalog/exerciseStreams.ts`). **Pedido a backend:** aceptar una lista o un grupo en `_muscle` / `_equipment` para que sea una sola llamada.
   - «Solo favoritos» lee los favoritos con `get_exercise` (caché) y filtra en el teléfono.
   - Detalle: `get_exercise`.
2. **Rutinas:** `list_routines` paginado (50 por página, `next_cursor`) con la miniatura incluida. «Tus rutinas» usa `scope: mine`; el resto, `scope: all`. La raíz de Entrenos pide todas las páginas porque los contadores por tipo las necesitan. La lista de un tipo, de favoritas o con búsqueda filtra en el teléfono y también las pide todas; «Todas» carga más al hacer scroll. El orden es el del servidor (más recientes primero); la etiqueta «A–Z» pasa a «Recientes».
3. **Imágenes**
   - Listas y tarjetas: `thumb_key` (filas de ejercicio, selector, recorrido del detalle, filas de rutina, miniaturas de Sesión). Póster: solo en el detalle del ejercicio (MoveKit, sin tocar el componente) y en el hero de Sesión (póster del ejercicio actual, vía `get_exercise`).
   - Firma (`lib/media/mediaUrlStore.ts`): las claves pedidas a la vez van juntas, una llamada por página (≤100 claves; cada página la firma al llegar, antes de pintar las filas). La caché de URLs respeta `expires_at` y renueva 5 min antes. Se guarda en el teléfono (`@athelete/media-urls/v1`): un segundo arranque en menos de 1 h no vuelve a firmar. Las claves que el servidor devuelve como `missing` no se piden otra vez durante 10 min.
   - Caché de imágenes en disco con expo-image y **`cacheKey` = la clave del archivo** (no la URL firmada): renovar la firma no vuelve a descargar.
   - Si falla (o no hay clave) se muestra la imagen local de siempre. Una URL renovada se vuelve a intentar.
   - El vídeo del detalle conserva su primera URL mientras la pantalla está abierta (renovar no lo recarga).
4. **Eliminado:** la carga completa del catálogo (`exerciseCatalog.ts`: 582 ejercicios con traducciones, músculos, equipo, patrones y media en 2 consultas de 500) y la firma masiva (1.164 claves en 12 llamadas). Revisé quién dependía de ella y lo pasé a `get_exercise` / caché:
   - **Sesión:** miniaturas de `get_routine`, póster de `get_exercise`. `recommended_sets_reps` ya llegaba vacío con el catálogo nuevo; el plan usa las series y reps de la rutina, como en la práctica ya hacía.
   - **ELLIE** (contexto y Notificaciones), **Perfil**, **Progreso**, **Récords**, **Resumen de sesión**: solo necesitaban nombres por id → `useExerciseNames(ids)` (solo los ejercicios con récord). Ya no bloquean la pantalla: mientras llegan, «Ejercicio».
   - **Escáner de máquina:** los ejercicios de la máquina elegida, uno a uno con `get_exercise`.
   - **Selector de récord:** búsqueda en servidor.
   - **Ejercicios (raíz):** el total sale de `catalog_version().exercises`. **Los contadores por zona y por equipo se quitan** (no hay forma de saberlos sin el catálogo entero). **Pedido a backend:** añadir conteos por zona/equipo a `catalog_version()` si se quieren de vuelta. El botón de Filtros dice «Ver ejercicios» sin número, por el mismo motivo.

### Mediciones (C.5)
**Antes** (medido el 16-10 desde mi Mac, con la misma consulta de la app y la clave pública, solo lectura; la firma necesita sesión y no la pude medir):

| | Primera vez | Segunda vez (otro arranque) |
|---|---|---|
| Datos antes de ver la 1.ª página | 582 ejercicios completos: **3,53 MB** de JSON (**1,36 MB** gzip por la red), 2 peticiones seguidas, **1,9–2,7 s** | Igual (React Query solo en memoria) |
| Firma antes de ver la 1.ª página | 1.164 claves (póster + vídeo de todos) en 12 llamadas | Igual, con URLs nuevas |
| Imágenes por página | Las filas usaban el **póster** como miniatura (original ~3 MB según el contrato): hasta ~90 MB para 30 filas | Se descargan otra vez (la URL firmada cambia) |

**Después** (estimado con los datos reales del catálogo en el formato del contrato; **falta medirlo en el iPhone**, ver abajo):

| | Primera vez | Segunda vez |
|---|---|---|
| Datos antes de ver la 1.ª página | `catalog_version` + 1 página de 30: **~7,7 KB** | Página desde el teléfono: **0 KB** (solo `catalog_version`) |
| Firma | 1 llamada, 30 claves: **~14 KB** | 0 llamadas si las URLs tienen < 55 min; si no, 1 |
| Imágenes por página | 30 WebP de ~2 KB: **~60 KB** | Disco (expo-image por clave): **0 KB** |

En total, la primera página pasa de ~1,4 MB de datos (+ firma masiva + pósteres de MB) a unos **80 KB**, y la segunda vez a casi nada de red.

**Cómo medir en el iPhone (modo debug):** la app escribe en la consola de Metro líneas `[perf] …`: «Ejercicios · primera página visible en N ms», el tamaño y tiempo de cada `list_exercises` / `get_exercise` / `catalog_version` / `exercise-media-url`, y «desde el teléfono (0 KB de red)» cuando la página sale de la caché. Abrir Ejercicios → «Ver todos» una vez, cerrar la app del todo, volver a abrir y repetir. No sale nada en Release (`lib/perf/catalogPerf.ts`).

## Archivos
- **Nuevos:**
  - `services/routines/routinesService.ts`, `services/catalog/catalogService.ts`, `services/media/mediaService.ts`.
  - `lib/catalog/catalogCache.ts`, `lib/catalog/exerciseStreams.ts`, `lib/media/mediaUrlStore.ts`, `lib/media/mediaUrls.ts`, `lib/media/imageSource.ts`, `lib/perf/catalogPerf.ts`.
  - `hooks/useRoutines.ts`, `hooks/useCatalog.ts`, `components/v2/AppImage.tsx`, `features/workouts/routineErrors.ts`.
  - Tests: `routinesService`, `routineHooks`, `catalogCache`, `mediaUrlStore`.
  - `docs/backend/ROUTINES_SHAPES.md`, este documento.
- **Tocados:**
  - Pantallas: `WorkoutDetailScreen`, `WorkoutSessionScreen`, `CreateRoutineScreen`, `AddExerciseToRoutineScreen`, `RoutineListScreen`, `ExerciseListScreen`, `ExerciseDetailScreen`, `WorkoutSummaryScreen`, `WorkoutsScreen`, `HomeScreen`, `ProfileScreen`, `ProgressScreen`, `PersonalRecordsScreen`, `RegisterPrScreen`, `NotificationsScreen`, `MachineScanScreen`, `EllieChatScreen`.
  - Features: `RoutinesView`, `ExercisesView`, `ExerciseFiltersSheet`, `RoutineBuilderSteps`, `useRoutineImages`, `workoutsModel`, `HomeHero`, `SessionViews`, `RegisterRecordSheet`, `chatModel`, `resultParsing`, `useEllieConversation`, `useSessionOutboxSync`.
  - Hooks: `useEllieData`, `useProgressData`, `useProgressSummary`, `useNotificationsOverview`.
  - Componentes: `ExerciseRow` (DarkThumb), `RoutineRow`, `RoutinePath`, `ZoneMosaic`, `EquipmentBubble`, `components/v2/index.ts`.
  - Resto: `lib/queryInvalidation.ts`, `services/supabase/fitness.ts`, `services/supabase/ellie-actions.ts`, `shared/domain/types.ts`, `shared/domain/workout-ownership.ts`, `shared/data/exercises.ts`, `shared/data/workouts.ts`, `app/App.tsx`, `jest.setup.ts` (mock de expo-image), `package.json`, `package-lock.json`, `ios/Podfile.lock`, `ios/Athelete.xcodeproj/project.pbxproj`.
- **Borrados:**
  - Servicios: `services/supabase/routines.ts` (escrituras directas) y `services/supabase/exerciseCatalog.ts` (carga completa + firma masiva).
  - Hooks: `useWorkoutLibrary`, `useExerciseLibrary`, `useRoutineBuilder`, `usePaginatedExerciseLibrary`, `usePaginatedWorkoutLibrary`, `useWorkoutDiscovery`, `useExerciseDiscovery` (los cuatro últimos ya no los usaba nadie).
  - En `fitness.ts`: `fetchWorkoutLibrary*` y `fetchExerciseLibrary*`. En `ellie-actions.ts`: `saveEllieWorkout`. En `shared/data`: los mapeadores de filas de tabla (`mapTemplateRowToWorkout`, `mapTemplateExerciseRowToExercise`, `dedupeFeaturedTemplates`) y `findExerciseByName`.
  - Test: `__tests__/exerciseCatalog.test.ts` (probaba el catálogo borrado).

## Tests (nuevos, 33)
- `get_routine` en el detalle y en Comenzar: se pide aunque la rutina esté en una lista en caché, y otra vez cada vez que se abre la pantalla. `routine_not_found` → no encontrada, sin reintento.
- Orden y bloques. Permisos (`is_mine` / `can_edit` / archivada).
- Payload de crear/editar (límites, `block`). Borrar con `archived`. Errores del contrato y sus textos es/en.
- ELLIE: `chat_message_id` = id del mensaje y `tool_data.exercises`; guardar dos veces el mismo mensaje devuelve la misma rutina (`replayed`) sin duplicar; «Otra versión» guarda el mensaje nuevo.
- Paginación con cursor: `list_routines` (siguiente página y fin; todas las páginas) y `list_exercises` (un stream; zona de varios músculos mezclada por nombre sin repetir).
- Invalidación de listas y sugerencia tras guardar o borrar.
- Caché de `catalog_version`: segundo arranque sin peticiones, versión nueva = se pide otra vez, primer arranque conserva lo descargado, peticiones simultáneas compartidas.
- Firma: una llamada por página, trozos de 100, renovación antes de `expires_at` con **`cacheKey` estable** (la clave), URLs guardadas para el siguiente arranque, claves `missing`, formato de `expires_at`.

## Qué probar en el iPhone
1. **B-03 · rutina propia:** Entrenos → «+» → crear una rutina → se abre su detalle. Atrás → «Tus rutinas» la muestra (con miniatura). Abrirla → «Empezar entreno» abre la sesión. Antes: «Rutina no encontrada».
2. **Editar:** «…» → Editar rutina → cambiar series, quitar un ejercicio, Guardar cambios → el detalle muestra los cambios al instante.
3. **Borrar:** una rutina sin publicar → desaparece de las listas. Una rutina compartida en Comunidad → sale «Rutina archivada…» y desaparece de tus rutinas; la publicación sigue abriendo la rutina.
4. **ELLIE:** pedir una rutina → Guardar → Empezar abre el detalle. Cerrar el chat, volver a abrir la conversación y pulsar Guardar en la misma tarjeta → abre la misma rutina (no aparece duplicada en «Tus rutinas»). Probar también «Otra versión» → Guardar.
5. **No encontrada / B-04:** abrir una rutina borrada (p. ej. desde un favorito antiguo o un enlace) → «Rutina no encontrada» con el botón Atrás visible (oscuro sobre claro).
6. **Calentamiento:** una rutina con bloque `warmup` (si backend tiene alguna) → el detalle muestra «Calentamiento» encima del recorrido.
7. **Sugerencia del día:** Inicio y Entrenos muestran la misma rutina con el motivo y los minutos. Completar una sesión → al volver, la sugerencia se recalcula. Cuenta sin candidatas → Inicio «Elige tu entreno de hoy» y Entrenos sin hero.
8. **Catálogo:** Ejercicios → «Ver todos» → scroll hasta el final (carga de 30 en 30, sin saltos ni repetidos). Buscar «press» (resultados del servidor tras ~300 ms). Filtros: nivel, varios equipos, solo favoritos. Zona Brazos y Piernas (varios músculos).
9. **Velocidad:** en debug, mirar las líneas `[perf]` (ver «Cómo medir»). Primera vez vs. cerrar la app y volver: la 2.ª vez la lista y las miniaturas salen sin red (probar también en modo avión: miniaturas desde el disco).
10. **Imágenes:** dejar la app abierta más de 1 h (o cambiar la hora) y volver a una lista: las miniaturas no parpadean ni se descargan de nuevo. El detalle de ejercicio reproduce el vídeo; el hero de Sesión muestra el póster del ejercicio actual.
11. **Creador:** paso Ejercicios → buscar, zonas, scroll que carga más; Agregar a rutina desde un ejercicio (rutina existente y nueva).
12. **Escáner de máquina:** elegir una de las candidatas → se ven sus ejercicios y abren su detalle.
13. **Récords / Progreso / Perfil / Notificaciones / Resumen de sesión:** los nombres de los ejercicios aparecen (al principio pueden decir «Ejercicio» un instante); registrar un récord buscando el ejercicio.
14. Light y Dark.

## Pendiente / a confirmar
- **Backend:**
  - `_muscle` / `_equipment` con lista o grupo (hoy Piernas son 5 llamadas por página).
  - Conteos por zona y equipo en `catalog_version()` si se quieren de vuelta en Ejercicios.
  - Si `save_user_routine` ya otorga `custom_workout_created`.
  - Si `list_exercises` filtra por músculo principal o por cualquiera.
- **Medir en el iPhone** el «después» con las líneas `[perf]`.
- Android: pendiente como en los pasos anteriores.
