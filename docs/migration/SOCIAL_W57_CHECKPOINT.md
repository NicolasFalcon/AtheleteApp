# SOCIAL_W57_CHECKPOINT · Comunidad · conexión W5 (retos), W6 (notificaciones) y W7 (moderación) · 2026-10-08

**Estado:** ✅ COMPLETADO (tsc limpio, eslint 0 errores, jest 43 suites / 460 tests, 2026-10-08)

Fuentes: `docs/backend/SOCIAL_RPC_SHAPES.md` (W5–W7), `TODO(social-wire)` de `MIGRATION_PROGRESS` y `supabase.ts`.
Reglas: sin migraciones, sin `npx supabase`, sin escrituras de prueba, commits solo al cierre y con rutas explícitas.

## Plan
- [x] 0 · W4 pendiente: nombre del archivo de la foto según el tipo real (photo.jpg / .png / .webp).
- [x] 1 · W5 · modelo y mapeo de errores (crear reto con rangos del servidor, errores de las RPC) + tests.
- [x] 2 · W5 · servicio Supabase (lista, detalle, crear, invitación, salir, cancelar, oficial, aporte, celebración).
- [x] 3 · W5 · pantallas: UI optimista con vuelta atrás e invalidación de retos y feed; D-xx.
- [x] 4 · W6 · modelo (tipos, destinos, agrupar, desconocidos) + tests.
- [x] 5 · W6 · servicio (lista paginada, no leídas, marcar, borrar) + campana (hub e Inicio).
- [x] 6 · W7 · modelo (acciones por tipo) + tests; servicio (cola, historial, moderate_content, rol).
- [x] 7 · W7 · pantallas (not_moderator → "No tienes acceso", fotos firmadas).
- [x] 8 · Cierre: MIGRATION_PROGRESS (W5, W6, W7), checklist de QA W1–W7, tsc / eslint / jest, commits.

## Hecho
- 0 · `photoFileName(mime)` en `postModel` (photo.jpg / .png / .webp) usado por `createPost`; test en `postModel.test.ts`.
- 1 · `challengeMappers.ts` (list, board, resultados de las RPC), `challengeTypes` con errores tipados, mensajes en `challengeModel`; `__tests__/challengeWire.test.ts`.
- 2 · Servicio Supabase de retos (get_my_challenges + un get_challenge_board por reto listado, tope 12; detalle con fila propia y aportes de la semana; create, respond, join, leave, cancel, aporte manual, celebrar).
- 3 · UI optimista con vuelta atrás en `relationMachine` (respondInvite, leave, cancel, join, celebrate); pantallas con los errores del servidor; Reto completado celebra solo si `celebrated_at` es null.
- 4 · `notificationModel`: solo los 7 tipos del servidor (`challenge_completed` y `challenge_ending` fuera; `post_liked` se acepta como alias), `parseNotifications` que descarta tipos desconocidos, destinos, agrupar me gusta, paginación; `__tests__/notificationsWire.test.ts`.
- 5 · Servicio: `getNotifications(cursor, limit)` sobre `social_notifications` (created_at desc), `getUnreadNotifications` (count, read_at null), marcar una / todas (UPDATE con recipient_id = yo y read_at null), borrar (DELETE). Hooks `useNotificationList` (useInfiniteQuery) y `useUnreadNotifications`. Contador en la campana del hub (`IconButton.badgeCount`), punto en la de Inicio (si solo hay sociales, abre las sociales). Pantalla: "Ver más", mantener pulsado para eliminar.
- 6 · `moderationModel`: acciones válidas por tipo (`validActionsFor`, `isValidAction`), errores de `moderate_content` (`moderationFailure`, `ModerationError`), cola en el orden del servidor; servicio (rol por `app_moderators`/`is_moderator`, cola con fotos firmadas, historial, `moderate_content`); `__tests__/moderationWire.test.ts`.
- 7 · Pantallas de moderación: `not_moderator` → "No tienes acceso", foto reportada firmada, etiqueta "Mantener y cerrar reportes".
- 8 · `MIGRATION_PROGRESS` (W5, W6, W7, DA-173 a DA-176, D-104 a D-109) y checklist de QA W1 a W7 (pasos 31 a 46). Verificación: `tsc --noEmit` limpio, `eslint` 0 errores (solo avisos previos), `jest` 43 suites / 460 tests.
