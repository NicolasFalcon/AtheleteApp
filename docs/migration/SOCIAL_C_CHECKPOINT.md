# SOCIAL_C_CHECKPOINT · Comunidad · tanda UI-C (retos, notificaciones y moderación) · 2026-10-07

**Estado:** ✅ COMPLETADO (capturas Light/Dark hechas y comparadas, 2026-10-07)

Alcance: `docs/migration/SOCIAL_PLAN.md` (tanda C y sección 8) + los pendientes de la tanda A (Rutina compartida SOCIAL_04 y los botones "Compartir"). Solo interfaz con datos de ejemplo: **sin lecturas ni escrituras al backend**. Sin commits, sin dependencias nuevas.

## Antes de empezar
- (a) "Nuevo récord" en Quiz **sí** se compara con el mejor intento leído del servidor justo antes de guardar (`submitQuizAttempt`, excluye el intento actual); está aplicado.
- (b) El mosaico muscular **no** tenía D-xx (D-88 ya era de Comunidad): se registra como **D-95** en `MIGRATION_PROGRESS`.

## Reglas de esta tanda
- Las de las tandas A y B (fuente visual única, `theme.v2`, `components/v2`, fixtures con tipos de `supabase.ts`, `SocialService` con `TODO(social-wire)`).
- Entre amigos no hay retos de repeticiones (BT-45 = decisión de producto). "En tus retos" solo sale de las participaciones del usuario. Foto real solo entre amigos (DA-119).
- Moderación: el panel solo existe para moderadores (`app_moderators`); la UI comprueba `is_moderator()` y nunca es accesible a un usuario normal; sin enlaces profundos fuera de `__DEV__`.

## Plan
- [x] 0 · Modelo puro y tests: retos (pasos de Crear reto, ranking y empates, estados), notificaciones (agrupar y no leídas), moderación (permisos y cola).
- [x] 1 · Servicio, fixtures y escenarios (retos, notificaciones, moderación).
- [x] 2 · Primitivos v2: `ChallengeRow`, `OfficialChallengeHero`, `RankBars`.
- [x] 3 · Retos en el hub (oficial, invitaciones, entre amigos, completados) y "En tus retos" en Amigos.
- [x] 4 · Detalle del reto (oficial y entre amigos; aceptar, rechazar, salir) y Reto completado.
- [x] 5 · Crear reto en 5 pasos con confirmación; "Retar" desde el perfil.
- [x] 6 · Notificaciones sociales (campana del hub, agrupar, marcar como leído).
- [x] 7 · Moderación (cola, contenido reportado, acciones, historial; moderador / no moderador).
- [x] 8 · Rutina compartida (SOCIAL_04) y "Compartir" en Resumen de sesión, Récords y Logros.
- [x] 9 · Herramientas dev, `MIGRATION_PROGRESS` (DA, D y lista completa de `TODO(social-wire)`), tsc / eslint / jest, capturas Light/Dark.

## Hecho
- 0 · `features/social/{challengeTypes,challengeModel,notificationModel,moderationModel}.ts` + tests `challengeModel.test.ts` y `socialNotificationsModeration.test.ts` (34 casos: pasos de Crear reto, ranking y empates, estados del reto y sus acciones, límites del aporte manual, agrupar notificaciones y no leídas, permisos de moderador y cola).
- 1 · `SocialService` ampliado (retos, notificaciones, moderación); `dev/socialChallengeFixtures.ts` (retos oficial, entre amigos, invitación, completado, expirado; 10 notificaciones; cola e historial de moderación; coparticipantes); 13 escenarios nuevos (incluye moderador y no moderador).
- 2 · `components/v2`: `ChallengeRow`, `OfficialChallengeHero` (+ `OfficialBadge`), `RankBars`.
- 3 · `ChallengesView` (reto oficial, invitaciones con acción directa, entre amigos, completados; sin retos, expirado, cargando, error) y el grupo "En tus retos" de Amigos.
- 4 · `SocialChallengeScreen` (oficial en escena oscura con semana y +5/+10/+15; entre amigos con ranking, actividad y aceptar / rechazar / salir / cancelar; expirado, cancelado, no disponible) y `SocialChallengeDoneScreen`.
- 5 · `SocialCreateChallengeScreen` (5 pasos, validación por paso, confirmación) y "Retar" desde el perfil con el amigo preseleccionado.
- 6 · `SocialNotificationsScreen` con campana y marca en la cabecera del hub (la campana de Inicio no se toca: DA-138).
- 7 · `SocialModerationScreen` y `SocialModerationItemScreen` (solo moderadores; "No tienes acceso" para un usuario normal; fila de Ajustes solo para moderadores).
- 8 · `SocialRoutineScreen` (SOCIAL_04) y "Compartir" en Resumen de sesión, Récords, Logros y Reto completado.
- 9 · +45 estados en `devSocialScreens.ts`; `MIGRATION_PROGRESS` (DA-133 a DA-141, D-95 a D-103 y la guía de conexión); `tsc` limpio, `eslint` 0 errores, `jest` 36 suites / 332 tests (36 nuevos en tanda C).

## Capturas (2026-10-07)
Estados nuevos × Light y Dark en `~/athelete-captures/social/` (mismo método: `-themeMode` + `athelete://dev/social?screen=<key>`; sin sesión).

Comparación con las referencias:
- **SOCIAL_07 · Retos (`retos`, `retosList`)**: cabecera, oficial con "74 / 100" y barra, invitación con Aceptar / Ahora no, "Entre amigos" con "Crear reto" y las filas coinciden. Diferencias: foto de portada de la app (D-102) y el icono de campana nuevo en la cabecera (D-101).
- **SOCIAL_08 · Oficial (`challengeOfficial`)**: foto, píldora "OFICIAL ATHELETE · RETO DE LA SEMANA", título a 34 pt, cifra a 56 pt, barra, semana en barras con el día de hoy en Ember, ranking en lista, tarjeta de recompensa y +5 / +10 / +15 fijos coinciden.
- **SOCIAL_09 / 10 · Entre amigos e invitación**: etiqueta, título a 28 pt, subtítulo, ranking con barras (tú en Ember, check en quien terminó), frase de distancia y actividad coinciden; la invitación añade Ahora no / Unirme.
- **SOCIAL_11 · Crear reto (5 pasos)**: barra de pasos (hechos en Ember, el actual en negro), preguntas a 26 pt, tipos, objetivo con ±, duraciones, amigos con selección y tarjeta oscura de revisión coinciden; la fecha de fin es "1 semana" (D-99).
- **SOCIAL_12 · Reto completado (`doneOfficial`)**: hexágono Ember, "RETO COMPLETADO", "100 / 100", pastilla de puntos e insignia, posición y los dos botones coinciden.
- Sin referencia (D-96 a D-98, D-103): notificaciones, moderación, rutina compartida y los estados de reto expirado, cancelado y no disponible.

Cambios hechos a partir de las capturas: el oficial sin unir enseñaba "0 / 100" (la fixture rellenaba un progreso inexistente; ahora `mine` es `null`), la etiqueta de la cabecera del detalle se cortaba, los botones de acción de moderación no ocupaban el ancho, la nota de la revisión era ilegible dentro de la escena, la medalla del reto completado era oscura y la barra de pasos tenía los colores invertidos.
