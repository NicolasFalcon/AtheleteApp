# Lote 3 · Comunidad en la app · B-26 y B-10 (+ visibilidad y catálogo)

Contrato: secciones «cambios Lote 3» de `docs/backend/SOCIAL_RPC_SHAPES.md`, `ROUTE_RPC_SHAPES.md` y `ROUTINES_SHAPES.md` (añadidas al final de cada documento con el texto exacto). Estado al 18-10-2026: hecho en código; **sin probar en iPhone**. Sin commits. Sin librerías nuevas.

## 1 · Publicar (B-10)
- Cualquier `ok:false` de `create_post` es un error con su texto v2 en es/en, incluido el nuevo **`post_removed`** («Un moderador retiró la publicación de esto…»). Uno desconocido, o sin `post_id`, da el mensaje genérico. Nunca sale «publicado». Vale para publicar desde Comunidad y para compartir una ruta.
- **`created:false`:** se abre ese post existente con el aviso «Ya lo habías compartido: aquí está», no «publicado».
- **Tras publicar** (también al editar o borrar un post):
  - se recarga el feed (el feed es un cargador propio, así que ahora recibe un aviso para recargarse en silencio);
  - se recarga la caché social, que incluye la lista de posts del perfil propio;
  - se lleva al usuario a su post. Compartir una ruta desde Ruta también abre el post.

## 2 · Sin amigos (B-26)
- El feed ya no se sustituye por «Tu feed empieza con un amigo». Arriba sigue «¿Qué entrenaste hoy?» (siempre se puede publicar); debajo, la invitación a buscar o invitar amigos (con el reto oficial si lo hay); y después los posts propios.
- El texto de la invitación aclara que ya se puede publicar y que lo propio sale en el feed y en el perfil. No hay un segundo estado vacío encima.

## 3 · Perfil: posts paginados
- El perfil propio y el de un amigo muestran «Publicaciones» con `get_user_posts`: 20 por página, `_before` = `created_at` del último, y se para cuando una página llega con menos de 20. «Ver más» carga la siguiente.
- Cada fila: tipo · hace cuánto, y el título del adjunto (o el texto, o el tipo). Al tocarla se abre el post.
- Estados de carga, error con reintento y vacío («Aún no has publicado nada…» / «X aún no ha publicado nada.»).
- Sustituye las 2 tarjetas de `recent_posts`, que solo decían «Las publicaciones llegan con el feed». Para el perfil propio se pasa el id del usuario (nunca null). Con alguien que no es amigo no se pide.

## 4 · Visibilidad: solo «Amigos»
- **Privacidad social:** «Quién puede ver tu perfil» ya no tiene selector Amigos / Público. Muestra «Solo amigos» y su explicación.
- **Publicar:** la etiqueta de audiencia dice siempre «Amigos», con el icono de personas.
- **Privacidad de ruta** (preparar, resultado y compartir): solo «Solo yo» y «Amigos». Una ruta o un valor por defecto guardado como `public` se muestra y se marca como «Amigos»; el servidor lo acepta y lo trata así. No se reescribe ningún dato.

## 5 · Catálogo: varios equipos en una llamada
`list_exercises` recibe los equipos de Filtros en `_equipments`, igual que los músculos de la zona en `_muscles`. Cualquier combinación de filtros es ahora **una sola llamada por página** (30). La mezcla de varias llamadas queda solo como utilidad general, ya sin uso real.

## Nota sobre el agua (Lote 2)
El contrato aclara que `profiles.daily_water_goal` nunca llega vacío (por defecto 10 vasos). La app ya lee solo ese valor. El caso «sin meta» del Lote 2 queda como defensa y no debería verse.

## Verificación
- `tsc --noEmit`: ok.
- `eslint` (solo archivos tocados): ok, 0 errores. Quedan 4 warnings de estilos en línea que ya estaban.
- `jest --findRelatedTests` sobre los archivos tocados: ok, 18 suites / 262 tests. Hay 6 tests nuevos en `__tests__/lote3Comunidad.test.ts`, y en `catalogCache.test.ts` hay casos nuevos para `_equipments`.
- iOS: sin build, como pediste (no hay cambios nativos).

## Archivos
- **Nuevos:** `src/features/route/routeVisibility.ts`, `__tests__/lote3Comunidad.test.ts`, este documento.
- **Tocados:**
  - Contratos: `docs/backend/SOCIAL_RPC_SHAPES.md`, `ROUTE_RPC_SHAPES.md`, `ROUTINES_SHAPES.md` (solo las secciones añadidas).
  - Comunidad, lógica: `features/social/postModel.ts`, `postTypes.ts`, `feedMappers.ts`, `useSocial.ts`, `socialModel.ts`.
  - Comunidad, vistas: `features/social/v2/FeedView.tsx`, `ProfileParts.tsx`.
  - Servicios: `services/social/socialService.ts`, `supabaseSocialService.ts`, `services/catalog/catalogService.ts`.
  - Pantallas: `screens/social/SocialComposeScreen.tsx`, `SocialProfileScreen.tsx`, `SocialPrivacyScreen.tsx`, `screens/tabs/CommunityScreen.tsx`, `screens/route/RouteResultScreen.tsx` (solo compartir en Comunidad).
  - Ruta: `features/route/v2/RoutePrivacySheet.tsx` (sin la opción Público).
  - Catálogo: `lib/catalog/exerciseStreams.ts`, `hooks/useCatalog.ts`.
  - Tests: `__tests__/catalogCache.test.ts`.
- **Quitado:** las tarjetas `RecentActivity` del perfil social (sustituidas por la lista paginada).

## Qué probar en el iPhone
1. **Cuenta sin amigos:** Comunidad → Feed muestra «¿Qué entrenaste hoy?», la invitación (Buscar amigos / Invitar con un enlace) y, al publicar, tu post debajo. El perfil propio lo lista en «Publicaciones».
2. **Publicar:** foto o entreno → se abre tu post con «Publicado para tus amigos»; al volver, el feed ya lo tiene, sin tirar para refrescar.
3. **Repetir el mismo origen:** compartir otra vez la misma rutina o ruta → «Ya lo habías compartido: aquí está» y se abre ese post.
4. **Post retirado por un moderador** (con la cuenta de moderador, retirar el post de una ruta; luego volver a compartirla) → mensaje de `post_removed`, nunca «publicado».
5. **Borrar un post propio y volver a compartir su origen** → se crea uno nuevo y se abre.
6. **Perfil con muchas publicaciones:** propio y de un amigo; «Ver más» trae las siguientes 20 sin repetir; en un perfil de alguien que no es amigo no aparece la lista.
7. **Privacidad social:** no hay opción «Público». **Ruta:** Preparar y Resultado → privacidad con solo «Solo yo» y «Amigos»; una ruta antigua en público se ve como «Amigos».
8. **Compartir ruta desde Resultado:** abre el post en Comunidad; si la ruta es «Solo yo», sigue saliendo el aviso y se abre la privacidad.
9. **Ejercicios → Filtros** con dos o tres equipos (y una zona): una sola petición por página; en debug, una línea `[perf] list_exercises` por página.
10. Inglés: con el perfil en `en`, los errores de publicar y los avisos salen en inglés.
