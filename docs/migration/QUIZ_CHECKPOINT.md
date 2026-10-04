# QUIZ_CHECKPOINT · Quiz (módulo autónomo, 2026-10-04)

**Estado:** ✅ COMPLETADO (2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). Sin escrituras de prueba en la base; las escrituras reales solo se validan con tsc y el QA real lo hace el usuario. Sin commits, sin migraciones, sin dependencias nuevas.

## Plan de bloques
- A · Recon (este documento).
- B · Portada: puntos, semana de juego, desafío del día, categorías (sin empezar · mejor resultado · 100 %), progreso a Quiz Master, últimas rondas. Pantalla "Inicio de desafío".
- C · Ronda: pregunta, 4 opciones, correcta / incorrecta con explicación, racha ×2 / ×3, progreso, salir con confirmación, estado estable en segundo plano.
- D · Resultado: puntuación, aciertos, récord, repetir, siguiente desafío; guardado en `quiz_attempts` con guardando / error con reintento; celebración con lo que devuelve el servidor.
- E · Conexiones y estados: Inicio, Notificaciones, Logros (`get_badge_progress`); vacío / cargando / error; dev kit.
- F · Cierre: MIGRATION_PROGRESS (sección nueva, DA/D, QA real), QA_CHECKLIST, tsc / eslint / jest, resumen.

## A · Recon

### Referencias (handoff + índice, únicas fuentes visuales)
`QUIZ_01_HOME` (L/D) · `QUIZ_02_CHALLENGE_START` (escena, un solo PNG) · `QUIZ_03_QUESTION` · `QUIZ_04_CORRECT` · `QUIZ_05_INCORRECT` · `QUIZ_06_STREAK` · `QUIZ_07_RESULT_LOW` · `QUIZ_08_RESULT_MID` · `QUIZ_09_RESULT_PERFECT` (todas L/D; ronda y resultado son escenas oscuras en ambos modos). Prototipos `Quiz.dc.html` y `QuizDark.dc.html`. Estados del handoff: ronda sin responder · correcta (Ember, +10 flotante) · incorrecta (sacudida + respuesta correcta) · racha (×2 desde 3, ×3 desde 5, barra y fondo se encienden); resultado bajo · medio · perfecto · nuevo récord. Entradas: Inicio → banner Quiz → Inicio de desafío → Ronda → Resultado. El diseño **no** tiene entrada desde Progreso, Retos, Logros ni ELLIE; Perfil muestra un hito de Quiz en su línea de tiempo (solo lectura).

### Hoy en la app (v1)
- Pantallas: `QuizLandingScreen` (lista de cards), `QuizQuestionScreen` (confirmar respuesta + siguiente, alerta si falla el guardado), `QuizResultScreen` (`QuizScoreSummaryCard`). Componentes v1 en `features/quiz/components`.
- Servicio `services/supabase/quiz.ts`: `fetchQuizCategories` (categorías activas + conteo de preguntas + mejor `score` y nº de intentos), `fetchQuizQuestions` (10 preguntas: 3 fáciles, 4 medias, 3 difíciles, orden por dificultad), `submitQuizAttempt` (inserta en `quiz_attempts` con `id` estable → `23505` recupera el intento; luego `quiz_completed` con `reference_id` = id del intento y `badgeIds first_quiz`; si `score === 100` y todas las categorías activas tienen 100 → `quiz_master_unlocked` sin referencia). `randomizeQuizOptions` baraja las opciones.
- Puntos: respuesta correcta = `points_reward` (10), +25 si es perfecto; el servidor calcula `points_added` desde el intento guardado (BACKEND_SUMMARY §6).
- Entradas existentes: banner de Inicio (`QuizBanner`, puntos + progreso a Quiz Master con `quizMastery`) y Notificaciones (tipo `quiz`) → `QuizLanding`.
- Logros: `useBadgeShelves` ya lee `get_badge_progress` (BT-24); `first_quiz` y `quiz_master` salen de ahí.

### Mapeo dato → fuente
| Diseño | Fuente |
|---|---|
| Tus puntos | `profiles.points` (`useProfileOverview`); tras guardar, `total_points` de la respuesta del servidor |
| Semana de juego (L–D) y "N días jugando" | `quiz_attempts.completed_at` de la semana (zona horaria local) |
| Categorías (foto, nombre, descripción) | `quiz_categories` (`name`, `slug`, `description`); foto por palabra clave del slug (placeholder, DA) |
| Récord de cada categoría (anillo, "Récord 8/10") | mejor intento: `correct_count / total_questions` (mayor `score`) |
| Estado de la card | sin intentos → "Sin jugar"; con intentos → récord; `score = 100` → completada |
| Desafío del día | derivado: categoría que rota por día entre las que no están al 100 % (DA) |
| Progreso a Quiz Master | categorías activas con mejor `score = 100` / categorías activas |
| Últimas rondas | `quiz_attempts` (categoría, fecha, `points_earned`, `correct_count/total_questions`) |
| Pregunta, opciones, explicación | `quiz_questions` (`question`, `options`, `correct_answer`, `explanation`, `points_reward`) |
| Racha ×2 / ×3 | local: ≥3 seguidas ×2, ≥5 ×3, un fallo reinicia (`points_earned` y `answers[].pointsEarned`) |
| "Repasemos esto" | texto de las preguntas falladas (no hay campo de tema) |
| Nuevo récord | `correct_count` de la ronda > mejor anterior (foto previa a guardar) |
| Puntos de la ronda y total | `points_added` / `total_points` de `award_gamification_event` |
| Celebración | `new_badges` de la respuesta del servidor (`first_quiz`, `quiz_master`) |
| Medalla y progreso en Logros | `get_badge_progress` |

### Decisiones a tomar (a documentar como DA/D en el cierre)
1. Racha ×2/×3 del diseño: se calcula en la app y viaja en `points_earned` del intento; el servidor decide los puntos (BT-38 pide confirmar que acepta ese total).
2. "Nivel N" del diseño no existe en los datos → la etiqueta de la card pasa a ser el estado real (SIN JUGAR · N RONDAS · COMPLETADA).
3. El desafío del día es una derivación determinista, no un dato del servidor.
4. La ronda guarda al terminar en la pantalla de Resultado (guardando / error con reintento); el intento usa el mismo `id`, así reintentar no duplica filas ni eventos.
5. Una categoría con menos de 10 preguntas juega con las que tenga (la barra y los textos usan el total real).

## Hecho
- Bloque A (recon).
- Modelo puro `features/quiz/quizModel.ts` (racha, ronda, resumen, mejor intento, Quiz Master, semana, desafío del día, historial, foto por categoría); `quizMastery` de Inicio delega en él. Servicio: `fetchQuizOverview` (categorías + rondas), `selectQuizRound`, `completesQuizMaster`, y `submitQuizAttempt` devuelve `totalPoints` y `rewardPending`. Hooks: `useQuizOverview`, preguntas sin refetch y una entrada de caché por ronda.
- Primitivos v2 nuevos: `ProgressRing`, `SegmentMeter`, `AnswerTile`; `haptics.error`. Ruta `QuizChallenge`.
- Bloque B: portada (`QuizLandingScreen` v2 + `features/quiz/v2/QuizParts`), pantalla `QuizChallengeScreen` (inicio de desafío), fotos con el tratamiento horneado (`assets/v2/photos/quiz`), fixtures dev (`dev/quizFixtures.ts`). Pendiente: capturas.
- Bloque C: ronda (`QuizQuestionScreen`, un reducer con la ronda, preguntas sin refetch, salir con confirmación incluso con el gesto atrás, `AnswerTile`, `SegmentMeter`, racha ×2/×3, +N flotante, panel de respuesta con explicación si existe).
- Bloque D: resultado (`QuizResultScreen`: guarda al llegar con guardando / error con reintento, aviso de recompensa pendiente, récord, repasar, otra ronda, siguiente desafío, `Celebration` por cada medalla de `new_badges`).
- Dev kit `devQuizScreens.ts` (24 estados) cableado en `DevCatalogHost`. Pendiente: tests, capturas, conexiones (E) y cierre (F).
- Tests: `__tests__/quizModel.test.ts` (31 casos de lógica pura: racha, puntuación, resumen, mejor intento, récord, Quiz Master, selección y barajado, semana, desafío del día, historial). jest en verde (31 suites, 235 tests).
- Bloque E: conexiones verificadas (Inicio, Notificaciones, Logros con `get_badge_progress`); estados vacío / cargando / error; dev kit.
- Bloque F: `MIGRATION_PROGRESS.md` §28 (DA-111…118, D-74…77), `QA_CHECKLIST.md` Bloque 9b, `BACKEND_TODO.md` BT-38…40. tsc limpio; jest 31 suites / 235 tests; eslint: 0 errores nuevos (queda 1 error previo en `__tests__/recordsBadges.test.ts`, import sin usar, no tocado).
- **Capturas: no hechas.** El binario del simulador es anterior a Reanimated nativo y el dev kit requiere sesión iniciada. Pendiente tras recompilar.

## COMPLETADO
