# Lote 4 · Ruta · B-07, B-08, B-11, B-13 y B-06

Solo app (el backend no cambia). Estado al 18-10-2026: hecho en código; **sin probar en iPhone ni en el simulador**. Sin commits. Sin librerías nuevas. Sin cambios nativos: `watchPositionAsync` y `getLastKnownPositionAsync` ya venían en expo-location, así que no hay build de iOS.

## 1 · B-07 · Sin auto-pausa
- La pausa es **siempre manual**. Quitado del tracker: el estado `autoPause` / `autoPaused`, el detector de quietud, la reanudación automática y sus constantes. Quitado de la UI: el chip «Pausa automática / Pausa manual» de Preparar y la etiqueta «PAUSA AUTOMÁTICA».
- `route_auto_pause` ya no se lee ni se escribe (`useRouteDefaults`). El servidor lo puede seguir guardando.
- Una grabación guardada en el teléfono por la versión anterior se restaura sin esos campos.
- Tests: los de auto-pausa se sustituyen por «quieto nunca pausa solo», «la pausa manual no se reanuda sola y no cuenta tiempo» y «restaurar una grabación antigua».

## 2 · B-08 · Ritmo que no cambiaba
**Causa:** durante la grabación la pantalla mostraba `trackerPace`, que es la distancia total entre el tiempo activo total, es decir, el **ritmo medio desde el inicio**. Al cambiar de caminar a correr, ese número apenas se movía. Además, a paso de caminar (~1,3 m/s) el filtro de deriva retiene a veces un fix de cada dos hasta el siguiente. Si el ritmo se mide «hasta ahora», eso lo empeoraba aún más. El tiempo sí excluía las pausas.

**Ahora:**
- En movimiento se muestra **«Ritmo actual /km»** (o «Velocidad actual»): los últimos ~30 s o ~150 m, lo que llegue antes, sin contar pausas.
- La ventana termina en el último punto aceptado. Si llevas más de 10 s sin un punto nuevo (parado), corre hasta «ahora» y el ritmo se va haciendo más lento. Sin datos suficientes (< 15 m o < 5 s) muestra «—».
- En la vista de pausa y en el resultado sigue el **ritmo medio sin pausas**.

Test con trazas sintéticas (fix cada 5 m, ±1 m de ruido, 8 m de precisión):
- caminar 1,3 m/s ≈ 12:49 /km, trotar 2,5 m/s ≈ 6:40 /km y correr 3,5 m/s ≈ 4:46 /km dan ritmos claramente distintos;
- en una misma salida, el ritmo actual sigue el cambio mientras la media se queda atrás;
- una pausa dentro de la ventana no cuenta.

## 3 · B-11 · Primer GPS
- **Al entrar en Ruta** (Preparar, Generar o Crear a mano), el mapa muestra al instante la **última posición conocida** (≤ 5 min), marcada como «Ubicación aproximada».
- **La búsqueda arranca al abrir Ruta**, no al pulsar Comenzar. Empieza con precisión **equilibrada** (primer fix rápido) y, tras el primer fix, sigue en **alta**. La **máxima** (BestForNavigation) solo se usa al grabar, igual que antes.
- **«Comenzar»** se activa cuando la precisión baja de **30 m**. Mientras tanto, el botón y el chip muestran la precisión real («Mejorando precisión · ±45 m» → «GPS listo · ±8 m»). Nunca bloquea la pantalla.
- Archivos: `locationStore.ts` (nuevo), `useLocationAccess.ts`, `GpsChip`, `expoLocationApi.watchForeground`.

## 4 · B-13 · Llamadas repetidas
- **Almacén compartido de ubicación** (`locationStore`): guarda la última posición y su hora. Al salir y volver a Ruta en menos de **3 min** se reutiliza: no se pide la última conocida ni se vuelve a esperar un fix. La grabación también lo alimenta, así que al terminar y volver ya hay posición.
- **El GPS se detiene al salir de la pantalla** si no se está grabando (la búsqueda va ligada al foco).
- **React Query:**
  - Tus rutas (`usePlannedRoutes`): 5 min, sin recargar al volver; se invalida al guardar, renombrar o borrar.
  - Actividad de Resultado y Compartir (`useRouteActivity`): la que acabas de terminar no se pide.
  - generate-route (`useGeneratedRoute`): clave por origen redondeado (~100 m) + deporte, km, tipo, desnivel, superficie y seed; 30 min; volver a una opción anterior no llama.

**Llamadas al entrar por segunda vez** (Ruta → Salir ahora, antes de 3 min):

| | Antes | Después |
|---|---|---|
| Permiso (`getForegroundPermissions` + `hasServicesEnabled`) | 2 + 2 | 1 + 1 |
| Posición | `getCurrentPosition` (High, se espera el fix) + **otra vez cada 3 s** hasta tenerlo | 0 (se reutiliza la de hace < 3 min; ya está lista) |
| Suscripción de GPS | — | 1 (balanced → high), parada al salir |
| `get_my_planned_routes` (Supabase) | 1 en cada visita | 0 (caché) |
| `generate-route` (si se abre Generar con el mismo origen) | 1 | 0 (caché) |
| **Total** | ≥ 6 llamadas (+5 cada 3 s sin fix) | **2 llamadas + 1 suscripción** |

El «antes» sale de leer el código anterior. El «después» está cubierto por tests: `routeLocationStore.test.ts` (sin `getLastKnown` ni búsqueda desde cero en la 2.ª visita, el GPS parado al salir) y `routeQueries.test.tsx` (una sola llamada a rutas guardadas, actividad y generate-route para dos visitas).

## 5 · B-06 · Recorrido en tarjetas y vista previa
- **Componente único `RouteStaticMap`:**
  - Sirve para una actividad guardada: estilo oscuro (o el del tema), no interactivo (no captura toques), sin ubicación del usuario ni GPS, ajustado a los límites de la polilínea guardada, con la línea naranja de marca y los puntos de inicio y fin.
  - Primero dibuja la polilínea sobre un fondo oscuro neutro. El mapa base (MapLibre) aparece encima cuando ha cargado; si no carga (sin red), se queda la polilínea.
  - Nunca muestra «Buscando tu ubicación…».
- **Usado en:**
  - **Inicio · «Tu ruta · Hoy»:** se corrige el solapamiento de textos. La causa era el «Buscando tu ubicación…» centrado del mapa vivo debajo de las cifras, más textos que podían partirse en dos líneas. Ahora la tarjeta mide 340, el recorrido queda en la parte de arriba, que deja libre la franja de los textos, y las líneas no se parten.
  - **Comunidad · post de ruta:** con trazado se pinta el mapa estático (antes una silueta SVG). Sin trazado (recortado por privacidad) sigue el aviso.
  - **Compartir · vista previa:** Mapa = mapa estático oscuro; Foto = la ruta sobre un fondo oscuro cálido; Minimal = solo la línea. Desaparece el recuadro blanco (venía de `RouteThumb` en tema claro). Historias, Guardar y Más siguen pendientes (B-09), sin tocar.

## Verificación
- `tsc --noEmit`: ok.
- `eslint` (solo archivos tocados): ok, 0 errores. Quedan 7 warnings de estilos en línea que ya estaban (`RouteUi`, `RouteActiveScreen`, `RouteShareScreen`).
- `jest --findRelatedTests` sobre los archivos tocados: ok, 10 suites / 69 tests. La suite completa también pasa: 87 suites / 909 tests.
- **Tests nuevos:**
  - `routePace.test.ts` (4): ritmo con trazas sintéticas.
  - `routeLocationStore.test.ts` (3): primer GPS y reutilización.
  - `routeQueries.test.tsx` (3): caché de Ruta.
- **Tests ajustados:**
  - `routeTrackerFilters.test.ts`: auto-pausa → pausa manual.
  - `routeFollow.test.ts`: firma de `initialTracker`.
  - `fixtures/fakeLocationApi.ts`: `watchForeground`.
- iOS: sin build (no hay cambios nativos).

## Archivos
- **Nuevos:** `src/features/route/locationStore.ts`, `src/features/route/v2/RouteStaticMap.tsx`, `__tests__/routePace.test.ts`, `__tests__/routeLocationStore.test.ts`, `__tests__/routeQueries.test.tsx`, este documento.
- **Tocados:**
  - Ruta, lógica: `features/route/routeTracker.ts`, `routeStore.ts`, `useRouteDefaults.ts`, `useRouteTracker.ts`, `useLocationAccess.ts`, `expoLocationApi.ts`, `useRouteData.ts`.
  - Ruta, componentes: `features/route/v2/RouteRecoveryGate.tsx`, `RouteUi.tsx` (`GpsChip`).
  - Pantallas de Ruta: `screens/route/RouteActiveScreen.tsx`, `RoutePrepScreen.tsx`, `RouteGenScreen.tsx`, `RouteSavedScreen.tsx`, `RoutePreviewScreen.tsx`, `RouteResultScreen.tsx`, `RouteShareScreen.tsx`.
  - Fuera de Ruta: `features/home/v2/RouteDoneCard.tsx` y `components/v2/PostBodies.tsx` (solo el mapa del post de ruta).
  - Tests: `__tests__/routeTrackerFilters.test.ts`, `routeFollow.test.ts`, `fixtures/fakeLocationApi.ts`.
- **Borrados:** ninguno.

## Qué probar
### En la calle (iPhone)
1. **Primer GPS:** abre Ruta. El mapa sale al instante en tu zona («Ubicación aproximada»), y en pocos segundos pasa a «Mejorando precisión · ±N m» y luego a «GPS listo · ±N m». «Comenzar» se activa al bajar de 30 m, sin pantalla de espera.
2. **Volver a Ruta:** sal a Inicio y vuelve antes de 3 min: «GPS listo» al instante. Al salir de Ruta sin grabar, el indicador de ubicación de iOS se apaga en pocos segundos.
3. **Ritmo:** graba una salida caminando 2 min, trotando 2 min y corriendo 2 min. «Ritmo actual» cambia en cada tramo en unos 20–30 s (por ejemplo ~12–13, ~6–7 y ~5 min/km). Al pausar, la vista de pausa muestra el ritmo medio. Parado sin pausar, el ritmo actual se va haciendo más lento y luego desaparece.
4. **Pausa:** quédate quieto 30 s sin pausar: no se pausa sola y el tiempo sigue. Pausa y reanuda a mano. En Preparar ya no está el chip «Pausa automática».
5. **Resumen:** el ritmo del resultado es el medio sin pausas.
6. **Tarjetas:** en Inicio, «Tu ruta · Hoy» muestra el recorrido sobre el mapa oscuro, sin «Buscando tu ubicación…» y sin textos montados. En Comunidad, el post de la ruta muestra el mapa con el recorrido. En Compartir, los modos Mapa, Foto y Minimal no tienen recuadro blanco. Prueba también en modo avión: se ve la línea sobre fondo oscuro.
7. **Caché:** Planear ruta → Tus rutas → atrás → otra vez: no aparece carga. Generar ruta → «Otra opción» → atrás → Generar otra vez: la ruta sale al instante.

### En el simulador (Features → Location → City Run)
1. Ruta → Salir ahora: «GPS listo» con precisión ~5 m y «Comenzar» activo. Graba 1–2 min: el «Ritmo actual» se estabiliza (City Run va a ritmo de trote), la distancia sube y el mapa sigue el recorrido.
2. Cambia a Features → Location → **Freeway Drive** con la grabación de ciclismo: la velocidad actual sube en ~30 s mientras la media va más lenta.
3. Location → **None** (parado): el ritmo actual se hace más lento y luego «—». No hay auto-pausa.
4. Termina y guarda: Inicio muestra la tarjeta con el recorrido estático; Compartir, los tres modos.
