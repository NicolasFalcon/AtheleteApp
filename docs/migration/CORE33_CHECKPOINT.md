# CORE33_CHECKPOINT · Core 33 (módulo autónomo, 2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). Sin escrituras de prueba en la base; las escrituras reales solo se validan con tsc y el QA real lo hace el usuario. Sin commits.

## Plan de bloques
- A · Recon (este documento).
- B · Descubrimiento e intro: CTA de la tarjeta de Inicio → Intro (3 momentos) / Explorar → Detalle → Listo → empezar (participación con guardando/error). `core33_intro_seen_at`.
- C · El día a día: pantalla `Core33` (día grande, 33 cápsulas, racha, "Hoy" con 3 hábitos; marcar/desmarcar optimista con vuelta atrás). Mismo modelo en Inicio y Progreso.
- D · Final y casos límite: celebración del día 33 (`core33_completed_at` + `resetCore33InviteCounter`), días perdidos, abandonar y volver a empezar, "Próximo reto" e historial (BT-01 / BT-02).
- E · Estados y cierre: sin reto, cargando, error, completado; dev kit (día 1, 17, día perdido, día 33); docs; tsc/eslint/jest.

## A · Recon
Referencias: HOME_10 / HOME_11 (tarjeta de invitación, ya hecha en Inicio), CORE33_01_INTRO_1/2/3, CORE33_02_EXPLORE, 03_DETAIL, 04_READY, 05_ACTIVE, 06_COMPLETED, OVERLAY_01_CELEBRATION, PROGRESS_03 (Retos, ya hecha) y STATE_05 (vacío de retos). Prototipos `Core33.dc.html` (intro, explorar, detalle, listo) y `Progress.dc.html` (pantalla `core33` del día). El diseño **no** tiene entrada a ELLIE en Core 33, ni días perdidos, ni abandonar.

Hoy en la app: `ChallengeScreen` v1 (intro / elegir hábitos / seguimiento / resumen) sobre `fetchCore33State` y `useCore33`; participación = fila de `challenge_participations` (`status active|completed|abandoned`, `start_date` local, `habits` json de 3 `{id, category, name}`), hábitos marcados en `habit_logs (participation_id, date, habit_index, completed)`. Un día cuenta como completado si los 3 hábitos están marcados; `toggleCore33Habit` otorga `core33_day_completed` (referencia `participación:fecha`), `core33_streak_7` (medalla `streak_7_days`) y, con 33 días cerrados y día ≥ 33, pone `completed` y otorga `core33_completed` + `core33_finisher` (referencia = id de la participación, una sola vez). Saltarse un día no rompe el reto: el día del reto avanza por calendario y el reto termina al cerrar 33 días (los registros posteriores al día 33 siguen contando); solo se corta la racha. El día se calcula en `shared/domain/core33.ts` (lo comparten Inicio, Progreso, Perfil y ELLIE).

Catálogo: no existe (BT-01). El diseño muestra 5 retos con 3 hábitos fijos cada uno; se definen en la app (D-xx) y se guardan en `habits` con id `core33:<reto>:<n>`, así el título del reto se recupera de la participación. "Elegido pero no empezado" no existe en el backend: "Elegir este reto" lleva a "Listo" sin persistir (BT-01).

Mapeo dato → fuente
| Diseño | Fuente |
|---|---|
| Intro vista | `profiles.core33_intro_seen_at` (`markCore33IntroSeen`) |
| 5 retos, hábitos, nivel | catálogo local (`core33Catalog.ts`) |
| Reto activo, día, hábitos de hoy | `challenge_participations` + `habit_logs` (modelo compartido) |
| Número grande "N / 33" | días cerrados; "Día N" = día de calendario |
| Racha actual / mejor racha / por cerrar | del modelo (rachas reales) |
| Tarjeta de invitación | `resolveCore33Invite` (fecha + contador, BT-22) |
| Completado | `status completed` + `core33_completed_at` |

## Hecho
- Bloque A (recon).
- Dominio compartido `shared/domain/core33.ts` por fechas y zona horaria (día, racha, mejor racha, días perdidos; lo usan Inicio, Progreso, Perfil y ELLIE); `core33Catalog.ts` (5 retos) y `core33Model.ts` (vista del día) con 15 tests.

- Servicio/hook (empezar con catálogo, toggle optimista y en cola, completado + perfil), entrada única, rutas, 5 pantallas + celebración, dev kit y capturas Light/Dark.
- BT-35 y BT-36; BT-01 y BT-02 reclasificados; sección 27 de MIGRATION_PROGRESS.

## COMPLETADO

## Verificación previa al commit (2026-10-04, solo lectura)
- falcon1989 no tiene participaciones, eventos de Core 33 ni logros de Core 33: no hay filas reales de la web con las que comparar. El repositorio no contiene código de la web. Los tipos y `BACKEND_SUMMARY.md` dicen: `habits` jsonb, `habit_logs(participation_id, date, habit_index, completed)`, eventos `core33_day_completed` (`participación:fecha`), `core33_streak_7` y `core33_completed` (`participation_id`).
- BT-37 resuelto (confirmado por backend): `status`, formato de `habits` y referencias de los eventos (`participation_id:fecha` y `participation_id`), fijadas en `core33DayReference` / `core33ParticipationReference`.
- Un solo reto activo: el servicio lo comprueba antes de crear (D-73).
- Capturas Light/Dark completas de todos los estados.

