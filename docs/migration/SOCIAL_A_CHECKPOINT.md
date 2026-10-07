# SOCIAL_A_CHECKPOINT · Comunidad · tanda UI-A (contenido) · 2026-10-07

**Estado:** ✅ COMPLETADO (capturas Light/Dark hechas y comparadas, 2026-10-07)

Alcance: `docs/migration/SOCIAL_PLAN.md` (tanda A + reportar, movido desde C) y su sección 8. Solo interfaz con datos de ejemplo: **sin lecturas ni escrituras al backend**. Sin commits, sin dependencias nuevas.

## Reglas de esta tanda
- Las de la tanda B: fuente visual única, `theme.v2`, `components/v2`, fixtures en `dev/socialFixtures.ts` con tipos de `supabase.ts`, acciones tras `SocialService` con `TODO(social-wire)`.
- El adjunto de entreno muestra volumen como el diseño; sin volumen en la fixture, "—" (BT-44 resuelto el 7-oct-2026).
- Foto real solo entre amigos (DA-119). Texto de usuario siempre como texto plano.
- `hidden_at`, `removed_at` y `deleted_at` se respetan: estado "contenido retirado".
- Foto: selector placeholder (`TODO(social-wire)`); tipo (JPG/PNG/WebP) y tamaño (5 MB) se validan en el modelo.
- Términos: aceptación antes de la primera publicación con `TERMS_URL` (placeholder BT-43).

## Plan
- [x] 0 · Tipos, modelo puro (cuerpo por tipo, me gusta optimista, validaciones, visibilidad, paginación) y tests.
- [x] 1 · Servicio, fixtures y hooks (feed paginado, comentarios, publicar, reportar).
- [x] 2 · Primitivos v2: `ReactionBar`, `ActivityLine`, `CommentRow`, `CommentComposer`, `PostCard` + cuerpos.
- [x] 3 · Feed en el hub (publicaciones, actividad, me gusta, paginación; vacío con amigos, cargando, error, fin de lista).
- [x] 4 · Detalle de publicación y comentarios.
- [x] 5 · Crear publicación y Compartir entreno / récord (+ términos).
- [x] 6 · Reportar publicación y comentario; "contenido retirado".
- [x] 7 · Herramientas dev, `MIGRATION_PROGRESS`, tsc / eslint / jest, capturas Light/Dark.

## Hecho
- 0 · `features/social/{postTypes,postModel}.ts` + `__tests__/postModel.test.ts` (27 casos: cuerpo por tipo, me gusta optimista, validación de publicación / foto / comentario / reporte, retirado-oculto-borrado, paginación, texto de tarjetas, actividad).
- 1 · `SocialService` ampliado (feed, actividad, publicación, me gusta, comentarios, adjuntos, crear, reportar, guardar rutina, términos); `dev/socialPostFixtures.ts` (7 publicaciones del diseño + 26 antiguas para paginar, comentarios, actividad, 5 adjuntos); 7 escenarios nuevos; `useFeed` y `usePostPhotoSource`.
- 2 · `components/v2`: `ReactionBar`, `ActivityLine`, `CommentRow`, `CommentComposer`, `RetiredContent`, `PostCard`, `PostBodies` (workout con foto, workout claro, récord, rutina, logro, reto, foto), `AttachmentPreview`.
- 3 · `FeedView` en el hub (reemplaza el placeholder): composer rápido, publicaciones, actividad, me gusta, paginación por scroll, cargando, error, vacío con amigos, cargando más, error al cargar más, fin de lista.
- 4 · `SocialPostScreen` (detalle + comentarios + campo fijo; retirado / en revisión / no disponible).
- 5 · `SocialComposeScreen` (crear y compartir entreno / récord, foto con validación, adjunto no editable, aceptación de Términos antes de la primera publicación).
- 6 · `ContentActions`: opciones, reportar (6 motivos + nota) y eliminar, para publicaciones y comentarios.
- 7 · `devSocialScreens.ts` (+27 estados); `MIGRATION_PROGRESS` (DA-126 a DA-132, D-88 a D-94, `TODO(social-wire)`).

## Capturas (2026-10-07)
27 estados × Light y Dark en `~/athelete-captures/social/` (fuera del repo; mismo método que la tanda B: `-themeMode` + `athelete://dev/social?screen=<key>`; para los estados de scroll se abre antes otra pantalla y se espera 9 s).

Comparación con las referencias:
- **SOCIAL_01 · Feed (`feed`)**: cabecera, segmentos, "Comparte tu último entreno", cabecera del post ("Nuevo récord · hace 1 h"), texto, bloque de récord a 250 pt con la cifra a 56 pt, delta en ember y corazón / comentarios coinciden. El bloque de entreno (400 pt con foto y tres cifras), la tarjeta clara, la rutina y el logro siguen la composición del HTML. Diferencias: avatares ilustrados en lugar de fotos (DA-119) y miniaturas de rutina con iconos (D-92).
- **SOCIAL_03 · Detalle (`post`)**: coincide (cabecera, post, "3 comentarios", comentarios planos con hora, campo fijo con avatar y botón de enviar).
- **SOCIAL_02 / 13 · Crear y Compartir (`compose`, `composeShare`)**: "Cancelar · título · Publicar", autor con chip "Amigos", texto, "Añadir foto · opcional", chips de adjunto y tarjeta con las cifras no editables coinciden. La referencia SOCIAL_02 se capturó en plena transición: se tomó el HTML como fuente.
- **STATE_01 / STATE_07 · Cargando y error (`feedLoading`, `feedError`)**: esqueleto con avatar, dos líneas y media; error humano con "Reintentar".
- Sin referencia (D-88 a D-93): reportar, eliminar, contenido retirado / en revisión, no disponible, términos, foto no válida, cargando más, error al cargar más y fin de lista.

Cambios hechos a partir de las capturas: la hoja de reportar no se presentaba (dos hojas a la vez en iOS) y ahora es una sola; el feed recarga al cambiar de escenario dev; la imagen del récord queda alineada arriba; textos de ayuda del composer.
