# v2.12 · Fase 2 · Inicio — checkpoint

Fecha: 2026-10-09 · Rama `feature-migration` · Solo UI con los datos que ya existen. Sin backend nuevo (solo `get_my_challenges` y `join_official_challenge`, que ya estaban), sin dependencias nuevas.
Fuente: `Home.dc.html`, handoff §22.3 / §11B e índice (HOME_12 a HOME_17) y [`V2_12_DELTA.md`](V2_12_DELTA.md).

## Estado

| Pieza | Estado |
|---|---|
| Banda de ELLIE (texto fijo, 28/20, Halo `lit`, abre el chat sin prompt) | ✅ |
| Fuera "Tu mejor marca" de Inicio | ✅ (ya hecho en la fase 1a; verificado) |
| Sección de reto a ancho completo, con reto y sin reto | ✅ |
| Card de Ruta (invitación) + placeholder "Ruta · Próximamente" | ✅ |
| Pulido del Halo (contorno, reflejo, halo exterior de voz, acabado `lit`) | ✅ |
| Orden de Inicio v2.12 (`homeSectionOrder`) | ✅ |
| ATHELETE Wear: card de Inicio, colección y ficha de producto (UI, sin backend) | ✅ |
| Hero de Inicio como carrusel de estados (`resolveHomeSlides`, carrusel, indicador) | ✅ |
| "Tu ruta real" (actividad de hoy) | ⏳ Fase 5 |
| Foto/badges definitivos del reto, vista "Retos oficiales" | ⏳ Fase 4 |

## Qué quedó

- **Orden** bajo el hero: Tu día → Tu ruta → [Invitación a Core 33] → banda de ELLIE → [Reto oficial] → Para entrenar esta semana → Quiz → Wear. Función pura `homeSectionOrder` en `homePriority.ts`, con test; `HomeScreen` pinta por clave.
- **Banda** (`features/home/v2/EllieBand.tsx`): "ELLIE" · "Siempre aquí para tu entrenamiento." · "Hablar con ELLIE →"; lavado Ember 8 → 4 %; Halo de 56 con acabado `lit`; punto de estado Ember. Navega a `EllieChat` con `focusInput: true` (nada se envía). `EllieSurface` sigue igual en Progreso, Resumen, Notificaciones y Nutrición.
- **Reto** (`OfficialChallengeSection.tsx` + `homeChallengeSection.ts`): 420 pt a sangre, oscuro en ambos temas.
  - Datos: `getMyChallenges` con la misma caché que Comunidad, así que unirse actualiza las dos a la vez.
  - Con reto: foto, número de progreso, `/ meta`, título sin el número de la meta ("100 dominadas" → "dominadas"), barra, "Te faltan N…" y días restantes.
  - Sin reto: meta en grande, título, "Unirme" y "N atletas dentro". El primer oficial (`official`) es el destacado.
  - Recompensa: `points` (si > 0) y `badge_id` (nombre desde `ALL_BADGES`, o "Badge" si el id no está en el catálogo). Si ambos faltan, la línea no aparece.
  - Si no hay oficial activo, la sección no existe.
  - Tap en la tarjeta → `SocialChallenge` (detalle). "Unirme" → `joinOfficialChallenge`, optimista por la capa del servicio (`joinOfficial` en `relationMachine`), con toast y vuelta atrás si falla.
- **Ruta** (`RouteInviteCard.tsx`, `routeMapData.ts`, `RouteSoonScreen.tsx`): 316 pt, mapa oscuro de ejemplo convertido a datos SVG (sin loader), "Tu ruta · Sal a moverte. · Running · Ciclismo · Iniciar actividad". Toca → `RouteSoon` con `TODO(ruta)`.
- **Halo**: acabado `lit` (luz Ember asimétrica y brillo exterior), reflejo de cristal ahumado (media luna pálida arriba a la izquierda), brillo del arco más intenso y halo exterior más estrecho en la escena de voz (≥ 120 pt). Solo capas SVG estáticas: sin animaciones nuevas.
- **Dev** (solo `__DEV__`): argumento de arranque `-homeScroll N` para abrir Inicio ya desplazado, y entradas `athelete://dev/social?screen=homeChallenge|homeChallengeInvite` para ver el reto con datos de ejemplo.

## Capturas (simulador iPhone 17 Pro) contra v2.12

Revisadas: Inicio con sesión pendiente en Dark (Ruta, banda, rutinas), reto con progreso y reto sin unirse en Light, reto con progreso en Dark, usuario nuevo en Light, y la card de Ruta contra HOME_15. Comparado con HOME_12 (reto) y HOME_15 (Ruta). No capturados: usuario nuevo en Dark ni sesión pendiente en Light de la parte alta (el hero no cambió en esta fase), ni "sin ningún oficial" (la sección no se pinta; cubierto por test).

Diferencias con la referencia:
1. **Foto del reto:** es `overhead.jpg` (placeholder); la referencia muestra otra toma. Sin escala de grises en iOS (D-29): capa oscura.
2. **Insignia del reto:** hexágono de `HexMedal` con chevrones, no el hexágono con degradado del prototipo.
3. **Línea inferior del reto:** "Te faltan N para completar el reto." en lugar de "Carlos acaba de llegar a 81" (no hay datos de líder en el oficial) y sin avatares.
4. **Card de Ruta:** sin "Última · 8,42 km" (no hay actividades). Mapa de ejemplo.
5. **Tarjetas de "Para entrenar":** salen oscuras vacías por falta de foto en las rutinas de la cuenta de prueba (ya ocurría antes).

## Pendiente

- Fase 4: `cover_path` y artwork de los 5 badges; vista "Retos oficiales" (la flecha del CTA va hoy al detalle, no a la lista); texto del reto desde datos.
- Fase 5: Ruta real, su estado "tu ruta de hoy" y el mapa de SDK.
- Android sin compilar (§8.1).

## Wear (añadido a la Fase 2; versión final)

Solo la presentación "Próximamente" de la marca (la colección con productos y la ficha de una primera versión **no estaban aprobadas** y se retiraron).

- **Archivos:** `screens/wear/WearScreen.tsx`, `features/wear/WearCard.tsx`, fotos B/N en `assets/v2/photos/wear/` (overhead, culturismo, barra-mujer, mancuernas), ruta `Wear`, dev `athelete://dev/wear?screen=wear|wearMosaic|wearEnd`.
- **Inicio:** `WearCard` ("Hecho para durar." · "Ver colección →") sustituye a `WearBannerV2` y abre `Wear`. `WearBannerV2` y `WearPreviewModal` quedan sin uso, sin borrar.
- **Animación de entrada:** foto del hero 1,08 → 1 en 8 s y bloque del título que sube 10 pt con fundido en 0,7 s tras 0,2 s (Reanimated, hilo de UI); sin ella con "Reducir movimiento".
- **Capturas (simulador, Light):** hero, mosaico y cierre, comparadas con las capturas de diseño: coinciden (foto, wordmark, etiquetas, frase con acentos y hoja de cierre). Sin tests: no hay lógica propia.
- **Pendiente:** fotografía real de Wear y lista de espera real (BT-53); capturas en Dark (la pantalla es oscura en ambos modos).

## Hero de Inicio · carrusel de estados (añadido a la Fase 2)

- **Modelo** (`homePriority.ts`): `resolveHomeSlides`, `slideFor`, `slidesKey`; 11 tests nuevos (orden en cada combinación, prioridad Core 33, cerrados al final, todo cerrado, usuario nuevo, y que al completar algo cambia el conjunto y el primer slide es la siguiente acción). `resolveHomeMode` se mantiene (saludo y anillos).
- **Carrusel** (`HomeHero.tsx`): `ScrollView` horizontal con snap (`snapToInterval` + `disableIntervalMomentum`, un slide por gesto en iOS y Android), índice = `round(scrollX / width)`, saludo y campana fijos, base de 100 pt con varios slides y 58 con uno, vuelta al primer slide cuando cambia el conjunto, desplazamiento de 56 pt una vez por sesión (no con "Reducir movimiento"; se cancela la vuelta si el usuario toca).
- **Indicador** (`HeroPager`): cápsulas con tokens de escena (`cta.onScene`, `glass.onPhoto`, `onDark.primary`, `onDark.tertiary` = `#8C8A85`), punto Ember en las cerradas, "1 / N", área táctil de 44 pt y etiquetas "Retomar, 1 de 3".
- **Dev:** `-homeOverride 8|9|10` (2 slides, 3 con uno cerrado, Core 33 cerrado) y `-homeSlide N`.
- **Capturas (simulador):** 1 slide (Light), 2 slides (Light), 3 slides con el cerrado activo (Light) y 2 slides con Core 33 activo (Dark). Sin capturar: el texto "Ver reto" (los datos de ejemplo del reto tienen hábitos pendientes) y el momento del desplazamiento de 56 pt (solo en código).
- **Pendiente:** preferencia "Core 33 como prioridad" (`TODO(core33-priority)`, BT-54).

## Reto oficial de Inicio (ajustado al diseño)

Sustituye al "Reto de la semana" de la primera versión: foto B/N de 420 pt a ancho completo y "● RETO OFICIAL" en los dos estados; con reto (retoOn: progreso, CTA al reto en Comunidad) y sin reto o completado (retoOff: meta, "N atletas dentro", CTA a la vista Retos oficiales, hoy la pestaña Retos de Comunidad con `TODO(retos-oficiales)`); sin "Unirme". Datos de `get_my_challenges` y `get_challenge_board`; el ejemplo igual a la referencia solo con los deep links dev `athelete://dev/home?scenario=…` (sin reto oficial real, la sección no aparece). BT-55 para la Fase 4. Capturas (Light y Dark) de con reto y sin reto comparadas con HOME_12 y HOME_13; el escenario "completado" usa el mismo diseño que "sin reto".
