# v2.12 · Fase 3 · Comunidad rediseñada — checkpoint

Fecha: 2026-10-09 · Rama `feature-migration` · Solo UI; la capa de datos conectada en W1 a W7 no se tocó (`SupabaseSocialService`, `socialMappers`, `feedMappers`, `useSocial` y las RPC siguen igual). Sin dependencias nuevas.
Fuente: handoff §22.5, tabla "Comunidad", `Social.dc.html`, índice visual y [`V2_12_DELTA.md`](V2_12_DELTA.md) (bloque G).

## Referencias de Comunidad en v2.12

Del índice visual, estado "Capturado (v2.12)" (nuevo o cambiado) frente a "Exportado" (sin cambios desde la versión anterior):

| ID | Pantalla | Estado en v2.12 | Qué se hizo |
|---|---|---|---|
| SOCIAL_01_FEED | Feed (cabecera, pestañas, composer, posts por tipo) | **Cambiado** | Rediseñado |
| SOCIAL_16_ROUTE_POST | Route Post en el feed | **Nuevo** | Composición con datos de ejemplo (fixtures y dev); no en la app real |
| SOCIAL_03_POST_DETAIL | Publicación y comentarios | **Cambiado** | Mismo `PostCard` en modo detalle |
| SOCIAL_05_FRIENDS | Amigos y solicitudes | **Cambiado** | Ya coincidía; solo hereda cabecera y pestañas |
| SOCIAL_07_CHALLENGES | Retos | **Cambiado** | Ya coincidía; foto del reto oficial recortada como la referencia |
| SOCIAL_08_OFFICIAL | Reto oficial ATHELETE | **Cambiado** | Foto recortada y pastilla "OFICIAL ATHELETE" ajustada |
| SOCIAL_15_OFFICIAL_LIST | Retos oficiales (lista) | **Nuevo** | **Fase 4** (fuera de esta fase) |
| STATE_04_EMPTY_FEED | Vacío · Feed sin amigos | **Cambiado** | Contenido igual; hereda la cabecera y las pestañas nuevas (la captura aún muestra el control segmentado y la flecha de volver de la versión anterior) |
| SOCIAL_02, 04, 06, 09 a 14; STATE_01, 05, 07 | Crear publicación, rutina compartida, perfil de amigo, retos entre amigos, invitación, crear reto, completado, compartir, privacidad, estados | Exportado (sin cambios) | No se tocan |

## Qué quedó

- **Cabecera y pestañas** (`CommunityScreen`, `UnderlineTabs`): "Comunidad" a 34/800 con el resumen; a la derecha la **campana con el contador de W6** (se mantiene), Privacidad y el avatar con anillo Ember (→ Perfil). Pestañas Feed / Retos / Amigos a 16/700, subrayadas con un indicador Ember de 36 × 3 pt que se desliza (sin movimiento con "Reducir movimiento") y contadores Ember. Sustituyen al control segmentado; salen el "+" de la cabecera y la fila de avatares.
- **Composer** (`FeedView`): avatar, "¿Qué entrenaste hoy?" / "Entreno, ruta, récord o rutina" y un "+" Ember de 48 pt; lleva al mismo flujo de publicar (W4).
- **Post** (`PostCard`): cabecera de 40 pt con el tipo en mayúsculas (Ember para Ruta, Récord y Logro) y el tiempo; la composición del tipo; me gusta (24 pt, Ember al activar, optimista) y comentarios; y el texto como pie "**Nombre** texto". 52 pt entre posts, sin divisores. Se mantienen paginación, tirar para refrescar, comentarios, reportar y la mezcla con la actividad de amigos (ahora una línea con avatares, texto y un punto Ember, sin tarjeta).
- **Composiciones** (`PostBodies`): entreno con foto (480 pt a sangre, "● COMPLETADO", título 34/800, trío), entreno sin foto (tipográfico, regla de 2 pt; usa `volume_kg`, `prs_count` y `top_pr` y no se rompe en posts viejos sin esos campos: el volumen es "—" y no hay línea de récord), récord (placa de 340 pt, cifra 104/800), rutina (4 miniaturas 3:4, título 30/800, "Guardar rutina" y "Ver rutina"), logro y reto (banda con brillo Ember y medalla de 96 pt), ruta y foto sola (a sangre, con su altura reservada por `photo_width` y `photo_height`; las fotos siguen firmadas).
- **Ruta:** `PostType` y el adjunto `RouteAttachment` incluyen `route`, pero `postBodyKind` solo lo dibuja con `routeEnabled` (fixtures); en la app real un post de un tipo desconocido, incluido `route`, **no se muestra** (`isRenderablePost`). `TODO(ruta)` y BT-56.
- **Detalle, perfil, retos:** el detalle usa el mismo `PostCard`; Amigos y Retos ya coincidían con SOCIAL_05 y SOCIAL_07; el hero del reto oficial (lista y detalle) usa la misma foto centrada.
- **Tests:** `postBodyKind.test.ts` (tipo → composición, `route` bloqueado salvo fixtures, tipo desconocido no se muestra, etiqueta y color del tipo).
- **Dev:** fixtures con 2 posts de ruta, 1 foto sola y 1 de tipo desconocido (no debe aparecer); `athelete://dev/social?screen=feedY1…feedY5` (feed desplazado) y `postRoute`.

## Datos que el diseño pide y el modelo no tiene

| Falta | Qué se hizo | Dónde |
|---|---|---|
| Tipo `route` en el servidor | Composición con ejemplos; no visible en la app real | BT-56 |
| "Ver rutina →" en posts de entreno (el adjunto no trae el id de la rutina) | No se dibuja | BT-57 |
| Miniaturas de anatomía por ejercicio en la rutina | Sigue el icono de reserva (`TODO(social-wire)`) | W-fases, sin cambio |
| Fotos en blanco y negro | iOS no tiene filtro de gris (D-29): capa oscura | — |

## Capturas (simulador, Light y Dark) contra las referencias v2.12

Revisadas: feed completo (cabecera, pestañas, composer y los 8 tipos: ruta, récord, entreno con y sin foto, rutina, foto, logro y reto) en Light, y cabecera, composer y ruta en Dark; detalle de un récord (SOCIAL_03) en Light y de una ruta en Dark; Amigos (SOCIAL_05), Retos (SOCIAL_07) y reto oficial (SOCIAL_08) en Light y reto oficial en Dark. Coinciden con SOCIAL_01, 03, 05, 07, 08 y 16. Sin capturar: el feed completo en Dark más allá de la cabecera y la ruta (los demás tipos usan los mismos colores de escena), el entreno con foto firmada de una cuenta real y el estado vacío.
Diferencias: la foto del récord es la de reserva; el recorte del mapa de ruta es una aproximación; las fotos no van en gris real.

## Pendiente

- Fase 4: lista "Retos oficiales" (SOCIAL_15).
- Fase 5: tipo `route` real (BT-56).
- Confirmar con producto si "Foto sola" debe tener su propia composición (v2.12 no la define; se dejó a sangre).
