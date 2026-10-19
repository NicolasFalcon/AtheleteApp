# Lote 5 · Visual rápido + distancia caminando · B-01, B-04, B-19 y filtro de deriva

Solo app (el backend no cambia). Estado al 18-10-2026: hecho en código; **sin probar en iPhone ni en el simulador**. Sin commits. Sin librerías nuevas y sin cambios nativos, así que no hace falta build de iOS. No se tocan ELLIE ni Comunidad. En MoveKitPlayer solo cambia el punto 3.

## 1 · B-01 · Franja clara arriba en pantallas con imagen a sangre
**Causa principal (común):** en iOS 26, el native stack (react-native-screens 4.24) aplica por defecto un `scrollEdgeEffects` **automático** al primer ScrollView de cada pantalla. Es una banda esmerilada bajo la barra de estado y la Dynamic Island, y con el tema claro esa banda es **clara**. Por eso aparecía la misma franja sobre todas las fotos a sangre. En Inicio también aparece, porque su ScrollView es el primero dentro de la pantalla de pestañas.

**Arreglo en un solo sitio:** `src/navigation/stackScreenOptions.ts` (nuevo) define `STACK_SCREEN_OPTIONS` (`headerShown: false` + `scrollEdgeEffects` oculto en los cuatro bordes). Lo usan los tres stacks: Root, Auth y Onboarding. La protección bajo la barra de estado la pone la app donde hace falta (`StatusBarShield`, `GlassHeader` y los degradados del hero), y siempre es **oscura y suave**. No se añade ningún degradado claro.

**Causa secundaria (una pantalla):** el artículo de Body Science usaba un `SafeAreaView` con el borde superior sobre fondo claro, así que la imagen empezaba debajo de la barra de estado. Ahora el `SafeAreaView` solo protege el borde inferior. El hero mide `260 + inset superior` y llega hasta arriba, la barra de estado va en claro (`StatusBarV2 style="light"`) y el botón atrás sigue en `inset + 10`.

**Pantallas afectadas** (imagen o hero oscuro a sangre bajo la barra de estado):
- Inicio (hero)
- Detalle de rutina (WorkoutDetail)
- Perfil y perfil social
- Resumen de entrenamiento
- Core33: pantalla, intro, detalle y «listo»
- Quiz y reto social
- Lista oficial social y rutina social
- Wear
- Progreso (hero)
- Detalle de ejercicio (vídeo MoveKit a sangre)
- Login y Registro
- Onboarding visual
- Artículo de Body Science

> La causa se identificó leyendo el código y la API de react-native-screens: el efecto del sistema no se ve en Jest. **Hay que confirmarlo en un iPhone con iOS 26.** Si queda una franja clara solo al tirar hacia abajo (rebote del scroll), es el fondo de la raíz que asoma por el rebote: es otra causa y no se ha tocado.

## 2 · B-04 · Contraste del botón atrás
- La variante `glass` de `IconButton` (blanco al 14 % + icono blanco) es solo para foto u oscuro. Se revisaron todos sus usos.
- **Arreglado:** Récords personales (detalle). El botón atrás fijo empieza sobre la placa oscura del récord y luego pasa por encima del contenido claro al hacer scroll. Ahora cambia a `BackButton` adaptativo (fondo `surface.muted`, icono `text.primary`) en cuanto queda por debajo de la placa. Sobre la placa sigue en cristal.
- **Ya correctos:**
  - Error de WorkoutDetail (arreglado en el Lote 1).
  - MealDetail, SocialOfficialList y RouteSoon: el botón va sobre un círculo oscuro propio.
  - `RoundButton` de Ruta: usa la superficie elevada del tema.
  - ExerciseDetail: usa la variante studio.
  - El resto de pantallas claras usan `BackButton` o `muted`, que se adaptan al tema.

## 3 · B-19 · MoveKitPlayer
- Se quita la barra de progreso por fases: el vídeo va en bucle.
- Quedan play/pausa, la **velocidad** y la pantalla completa. La velocidad rota 1× → 1,5× → 0,5× y ahora sí se aplica al vídeo (`rate` 1 / 1,5 / 0,5) en la vista normal y en pantalla completa.
- Los controles quedan alineados a la derecha. Nada más cambia.

## 4 · Distancia caminando
**Resultado:** el filtro **no contaba de menos**: contaba **de más**. Con ~5 m de ruido, los pasos de 5 m (el `distanceInterval`) sumaban el zigzag del ruido al caminar, porque en movimiento el umbral era solo 2 m. Por eso salían **+3 a +8 %** con ruido realista y hasta **+20 %** con ruido peor. Además, estando quieto la deriva se colaba: **11–32 m en 2 min**, porque el umbral de quietud, `max(precisión, 5 m)`, es menor que lo que deambula el GPS en un par de minutos.

**Cambio (solo `routeTracker.ts`, `judgeFix`):**

| | Antes | Ahora |
|---|---|---|
| En movimiento (≥ 0,8 m/s) | paso ≥ 2 m | paso ≥ max(1,5 × precisión, **8 m**) |
| Quieto (< 0,8 m/s) | paso ≥ max(precisión, 5 m) | paso ≥ max(2,5 × precisión, **12 m**) |

Un fix por debajo del umbral no suma, pero **el ancla no se mueve**. El desplazamiento real se sigue acumulando hasta pasar el umbral, así que en línea recta no se pierde nada. Lo máximo que puede quedar sin contar es el último tramo al terminar (< 1 umbral, ~8 m caminando).

**Test** (`__tests__/routeWalkDistance.test.ts`, 8 semillas, pasa por el reducer real):
- **Ruido:** precisión 5 m (radio del 68 %, σ ≈ 3,3 m por eje). Error que deriva despacio, como un GPS real (AR(1) a 1 Hz, ρ = 0,97). Fixes cada 5 m, como los envía expo-location.
- **500 m a 1,3 m/s:** 493–513 m (−1,4 % … +2,5 %), dentro de ±3 %. Antes, con el mismo ruido: 505–525 m.
- **Sin ruido:** 500 m (no se pierde nada).
- **Caminar lento (0,7 m/s), 500 m:** dentro de ±5 % (hasta +4 %).
- **2 min quieto:** **0 m**, con precisión 5 m y también con precisión 10 m.
- **Límite conocido:** con 10 min quieto sin pausar, en 3 de 8 semillas aún pasan 27–42 m (precisión 5 m) o 50–100 m (precisión 10 m). Arreglarlo pediría más estado en el filtro (p. ej. una ventana de velocidad) y queda fuera de este lote.

**Tests ajustados** (`routeTrackerFilters.test.ts`):
- «quieto»: el nombre pasa a decir 2,5 × precisión / 12 m.
- «un paso real cuenta en movimiento»: ahora 19 m con precisión 12. Además comprueba que un paso corto espera y no se pierde (10 m + 10 m = 20 m).
- «saltos imposibles»: comprueba los 180 m del trazado bueno en vez del número de puntos, que baja porque ahora se aceptan menos puntos.
- `routePace.test.ts` (ritmo actual B-08) pasa sin cambios.

## Verificación
- `tsc --noEmit`: ok.
- `eslint` (solo archivos tocados): 0 errores. Queda 1 warning de estilo en línea que ya estaba (`PersonalRecordsScreen`, `paddingBottom: 140`).
- `jest --findRelatedTests` sobre los archivos tocados: ok, 8 suites / 55 tests.
- No se ha ejecutado la suite completa ni ningún build de iOS (no se pedían).
- El experimento temporal que se usó para medir quedó borrado.

## Archivos
- **Nuevos:**
  - `src/navigation/stackScreenOptions.ts`
  - `__tests__/routeWalkDistance.test.ts`
  - este documento
- **Tocados:**
  - `src/navigation/RootNavigator.tsx`, `AuthStackNavigator.tsx`, `OnboardingStackNavigator.tsx`
  - `src/screens/progress/BodyScienceArticleDetailScreen.tsx`
  - `src/screens/home/PersonalRecordsScreen.tsx`
  - `src/features/workouts/movekit/MoveKitPlayer.tsx`
  - `src/features/route/routeTracker.ts`
  - `__tests__/routeTrackerFilters.test.ts`
- **Borrados:** ninguno.

## Qué probar en el iPhone (iOS 26, tema claro y oscuro)
1. **B-01:**
   - Abre Inicio, el detalle de una rutina, tu perfil, un perfil social, el resumen al terminar un entreno, Core33, Progreso, el detalle de un ejercicio, Login/Registro y un artículo de Body Science.
   - La foto llega hasta el borde de arriba, sin franja clara bajo la hora ni la Dynamic Island.
   - Haz scroll: arriba no aparece ninguna banda esmerilada clara.
   - Tira hacia abajo en el tope: si asoma algo claro solo en el rebote, anótalo aparte.
2. **B-04:** en Récords personales, abre un récord y haz scroll. El botón atrás es de cristal sobre la placa oscura y pasa a gris/oscuro legible sobre el fondo claro. Repite en tema oscuro.
3. **B-19:** en el detalle de un ejercicio, el vídeo va en bucle y no hay barra de progreso. Velocidad 1× → 1,5× → 0,5×: el vídeo cambia de velocidad. Pantalla completa: misma velocidad y los mismos controles.
4. **Distancia:**
   - Camina una distancia conocida (p. ej. una recta de 500 m medida en el mapa o una pista de atletismo de 400 m) a ritmo normal. La distancia debería quedar a ±3 %.
   - Luego quédate quieto 2 min sin pausar: la distancia no debe subir.
   - Corre un tramo: la distancia y el «Ritmo actual» se comportan como antes.
