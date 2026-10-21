# Lote 9 · Sueño (Apple Health + manual), Respira y tarjetas nuevas de Inicio

Solo app (backend cerrado: `docs/backend/V2_15_SHAPES.md` §1, §4 y §5). Diseño: handoff v2.15 §25.2 (SLEEP_01–04), §25.3 (BREATHE_01–05), §25.5 (tiles de Inicio y card Ruta) y §25.8 (ambiente de Respira).

Estado al 21-10-2026:
- Hecho en código.
- **Sin compilar y sin probar**, como se pidió.
- Solo se ejecutó `tsc --noEmit`.
- Sin commits.
- No se tocan backend, Comunidad, ELLIE, MoveKitPlayer ni la grabación de Ruta.

## Librerías

| Librería | Versión | Motivo |
|---|---|---|
| `@kingstinct/react-native-healthkit` | **16.2.0** (exacta) | HealthKit, solo lectura. Peers: `react-native >= 0.79`, `react >= 19`, `react-native-nitro-modules >= 0.35`. Compatible con RN 0.85.2 / React 19.2.3. |
| `react-native-nitro-modules` | **0.37.1** (exacta) | Peer obligatorio de la anterior. |

- **Pods:** `pod install` OK (entran `NitroModules` y `ReactNativeHealthkit`).
- **React precompilado:** tras el `pod install` se dejó en **Debug** (`replace-rncore-version.js -c Debug`, ejecutado desde `ios/Pods`), para evitar el error de enlace conocido (LOTE1/LOTE7).
- **Pantalla encendida:** sin dependencia nueva. Se usa el módulo nativo `ExpoKeepAwake`, que Expo ya enlaza, con `requireOptionalNativeModule` de `expo-modules-core`.

## 1 · Apple Health (solo lectura)

- **Lectura:**
  - Sueño con fases (`SleepAnalysis`: core, profundo, REM y despierto), FC en reposo y VFC (SDNN).
  - Las muestras de las últimas 15 noches se agrupan en una noche por día de despertar: la sesión más larga, y las siestas de menos de 2 h se descartan.
  - Las muestras con fases mandan sobre las de "dormido" sin fase, y "en cama" solo cuenta si no hay nada más.
  - La agrupación es pura (`sleepModel.buildHealthNights`).
- **Sincronización:** `upsert_sleep_from_health` con hasta 14 noches, fases, `resting_hr` y `hrv_ms`.
  - Al arrancar y al volver a primer plano: como mucho cada 3 h.
  - Al abrir Sueño: como mucho cada 10 min.
  - "Sincronizar ahora" en Ajustes › Apple Health.
- **Explicación antes del permiso:** la hoja "Conecta tus datos de salud" (HEALTH_01 adaptada a v2.15: sueño, corazón, recuperación). Después, la hoja del sistema.
- **Denegado:** HealthKit no dice si se denegó la lectura. Si tras conectar Salud no da ninguna noche, el estado es **"Sin acceso a Salud"**:
  - Sueño muestra el estado sin Health (SLEEP_02) con un texto que explica dónde activarlo y el botón **"Abrir Ajustes"** (abre Salud; si no puede, los ajustes de la app).
  - El registro manual sigue disponible.
- **Info.plist:** `NSHealthShareUsageDescription` ahora dice "Athelete lee de Apple Health tus entrenos, tu sueño (con sus fases), tu frecuencia cardíaca en reposo y tu VFC…". El entitlement ya existía.
- **Ajustes › Apple Health** deja de ser un marcador:
  - estado real (Sin conectar · Conectado · Sin acceso · No disponible);
  - conectar con la hoja de invitación;
  - "Gestionar permisos en Salud" y "Sincronizar ahora".
  - La fila de Ajustes muestra el estado.
- **Sin Health** (Android, iPad, sin permiso), todo funciona con el registro manual.

## 2 · Sueño (SLEEP_01–04)

Todo sale de `get_sleep_overview`, con material de noche en ambos temas y sin el verde fuera de paleta.

**Con Apple Health (SLEEP_01):**
- **Hero de 520 pt:** foto con duotono Recovery, recuperación 148/800 "/ 100", la etiqueta **"ESTIMACIÓN"**, el titular según `headline_code`, el texto y la escala Baja · Media · Alta con su marcador.
- **Noche:** "h / min", hipnograma de 4 filas a partir de `stages.segments`, y totales y % por fase.
- **7 noches:** promedio, consistencia y diferencia frente a la semana pasada, con barras y meta de 8 h. Tocar una barra cambia la noche mostrada (las otras noches no traen fases).
- **Horario:** cápsulas de 22:00 a 09:00; las noches después de medianoche llevan punto Ember.
- **Señales del cuerpo:** FC en reposo, VFC y carga de ayer.
- Banda de ELLIE y nota legal.

**`recovery: null` con Health:** el hero cambia la puntuación por la duración de la última noche, con "SIN ESTIMACIÓN HOY." y la explicación. Es una decisión propia: no estaba diseñado.

**Sin Health (SLEEP_02):** "¿CÓMO DORMISTE?", Conectar Apple Health o Abrir Ajustes, "Registrar sueño manualmente" y "Dos formas de seguir tu descanso".

**Formulario (SLEEP_03):**
- Horas con −/+ en pasos de 15 min (23:30 → 07:15 por defecto, o las de la noche al editar), con "en cama".
- Calidad 1–5 (la elegida en Recovery Blue con brillo) y los 5 chips de "Al despertar".
- "Guardar noche" está al 35 % hasta elegir calidad y sensación. Llama a `log_sleep_manual` con la noche que termina hoy.

**Registrada a mano (SLEEP_04):** duración a 124 pt, titular según la calidad, "Tu registro" con **Editar** (el mismo upsert), banda de ELLIE (propone bajar el volumen si te despertaste agotado o cansado) y la card "Deja de registrarlo a mano".

**Progreso · Sueño 7 noches:** card de noche con promedio, consistencia, 7 barras, "Recuperación N" y "Ver sueño y recuperación". Solo aparece con Apple Health, como en el diseño.

**Adaptaciones al contrato:**
- **Consistencia:** el diseño muestra "86 %", pero el contrato da `consistency_min` (desviación de la hora de acostarse). Se muestra **"± N min"**.
- **Señales:** las líneas "↓ 2 vs media" no tienen dato en el contrato. Se muestra "Anoche", y la carga de ayer con sus minutos (Ember si es alta).

## 3 · Respira (BREATHE_01–05)

- **Sesión guiada:**
  - Fondo radial y 16 partículas que derivan.
  - Masa de luz Recovery Blue: núcleo, dos lóbulos que giran (19 s y 27 s) y anillo en "Mantén".
  - Escalas por fase: 0,42 entrada, 1 al inhalar en 4 s, 1,02 al mantener, 0,44 al exhalar en 6 s y 0,62 al terminar.
  - INHALA · MANTÉN · EXHALA con fundido y subida de 0,7 s, y el contador "00:SS".
  - Cinco ciclos de 4/2/6 s.
  - "Listo." y "Volver a Inicio".
- **Sonido ambiente:**
  - Generado con el **mismo script** (`node scripts/render-sounds.js` → `breathe-ambient.caf` y `.wav`).
  - El ambiente **no está en `ath-sound.js`**: está en `Breathe.dc.html`. Se reprodujo su algoritmo (ruido marrón, paso bajo de 420 Hz, nivel 0,16) en un bucle de 4 s con fundido cruzado, sin clic.
  - Fundido de entrada de 2,5 s y de salida de 0,6 s.
  - Respeta el interruptor de silencio (sesión ambient) y Ajustes › Sonidos: si están apagados, no suena y la pill "Sonido/Silencio" no se muestra.
  - La pill solo cambia esta sesión (25.10.7: no se guarda).
- **Registro:**
  - `log_breathing_session(60)` **solo al llegar a 60 s**; cerrar antes no registra nada.
  - El contador de la tile se actualiza con la respuesta (`week_count`) y después se recarga `get_breathing_week`.
- **Pantalla encendida** mientras dura la sesión; se apaga al terminar o al salir.
- **"Reducir movimiento":** las partículas y los lóbulos se quedan quietos. La escala de la respiración se mantiene, porque es la guía.

## 4 · Inicio (25.5)

- **Tiles Sueño + Respira** entre Tu día y Tu ruta (orden `week → rings → recovery → route…`):
  - **Sueño**, desde `get_sleep_overview`, la misma lectura que la pantalla, así que la cifra coincide:
    - con una noche de hoy o de ayer: "7h 24m" y "● Recuperación alta" (Health) o "● Buena calidad" (manual);
    - si no: "¿CÓMO DORMISTE?".
  - **Respira**, desde `get_breathing_week`: "Respira · Un minuto para ti." o "N sesiones · esta semana", con el brillo que respira (12 s).
- **Card Ruta rediseñada (212 pt):**
  - Mapa oscuro al 70 %: el `RouteStaticMap` de la última actividad, o la placa si no hay ninguna. Punto Ember con su halo.
  - Textos: "TU RUTA" y "Sal a moverte." / "N km · Hoy".
  - Bajo el divisor: "Sin rutas registradas" o "Última · N km · hace X" con "Ver todas" (abre Perfil, donde está la lista).
  - Tocar la card abre la actividad de hoy o, si no hay, "Preparar ruta".
  - **Sin la variante Premium.**
  - Se borraron las cards antiguas (`RouteInviteCard`, `RouteDoneCard`).

## Archivos

**Nuevos:**
- Sueño: `src/features/sleep/sleepModel.ts`, `src/features/sleep/v2/SleepParts.tsx`, `src/features/sleep/v2/SleepWeekCard.tsx`, `src/services/sleep/sleepService.ts`, `src/hooks/useSleep.ts`, `src/screens/sleep/SleepScreen.tsx`.
- Health: `src/features/health/healthKit.ts`, `healthStore.ts`, `HealthInviteSheet.tsx`.
- Respira: `src/screens/breathe/BreatheScreen.tsx`.
- Inicio: `src/features/home/v2/RecoveryTiles.tsx`, `src/features/home/v2/RouteCard.tsx`.
- Sonido: `src/assets/sounds/breathe-ambient.wav` y `.caf`.

**Modificados:**
- App y navegación: `src/app/App.tsx` (`useHealthSync`), `src/constants/routes.ts`, `src/types/navigation.ts`, `src/navigation/RootNavigator.tsx`.
- Inicio: `src/screens/tabs/HomeScreen.tsx`, `src/features/home/homePriority.ts`.
- Progreso: `src/screens/tabs/ProgressScreen.tsx`.
- Perfil: `src/screens/profile/HealthSettingsScreen.tsx` (reescrita), `src/screens/profile/SettingsScreen.tsx`.
- Sonido: `src/features/sound/soundService.ts` (ambiente), `soundAssets.ts`, `soundAssets.ios.ts`, `scripts/render-sounds.js` (ambiente).
- Errores: `src/features/workouts/routineErrors.ts` (campos de sueño y Respira).
- Nativo y dependencias: `ios/Athelete/Info.plist`, `ios/Podfile.lock`, `package.json`, `package-lock.json`.
- Tests: `__tests__/homePriority.test.ts` (solo la expectativa del orden; **sin ejecutar**).

**Borrados (uno a uno):** `src/features/home/v2/RouteInviteCard.tsx` y `src/features/home/v2/RouteDoneCard.tsx`.

## Verificación

- `tsc --noEmit`: 0 errores.
- jest, eslint y build: **no ejecutados**, como se pidió.

## Qué probar en el iPhone (con Apple Watch si es posible)

1. **Arranque:** no debe aparecer ningún permiso solo. Ajustes › Apple Health dice "Sin conectar".
2. **Conectar:**
   - Desde Sueño ("Conectar Apple Health") o Ajustes: aparece la invitación y después la hoja de Salud.
   - Al aceptar: toast "Apple Health conectado" y Sueño pasa a SLEEP_01 con la noche de anoche.
   - En Supabase hay filas `apple_health` en `sleep_nights` con fases, FC y VFC.
3. **Denegar en la hoja de Salud:** Sueño muestra "Sin acceso a Salud" con "Abrir Ajustes", que abre Salud, y el registro manual funciona.
4. **SLEEP_01:**
   - Puntuación con "ESTIMACIÓN", escala con marcador e hipnograma coherente con la app Salud.
   - Tocar barras de otros días, el horario con puntos Ember tras medianoche y las señales.
   - Sin la noche de ayer en Salud: "SIN ESTIMACIÓN HOY."
5. **Manual:**
   - Sin Health: registrar, ver SLEEP_04, Editar (el formulario sale con los valores) y guardar.
   - "Guardar noche" está apagado hasta elegir calidad y sensación.
6. **Primer plano:** volver a la app tras 3 h vuelve a sincronizar; abrir Sueño tras 10 min, también.
7. **Respira:**
   - Comenzar y ver las fases, el contador y el sonido.
   - La pantalla no se apaga durante la sesión.
   - Al terminar, el contador de la tile sube.
   - Cerrar a mitad no suma.
   - Con el iPhone en silencio, o con Ajustes › Sonidos apagado, no suena y no aparece la pill.
   - Con música sonando, se mezcla.
8. **Inicio:**
   - Las tiles muestran lo mismo que Sueño y que Respira.
   - La card Ruta con y sin actividades; "Ver todas" abre Perfil.
   - En Light y Dark: tiles y card oscuras.
9. **Progreso:** con Health aparece "Sueño · 7 noches" y abre Sueño. Sin Health no aparece.
10. **Android:** no hay Health; Sueño ofrece solo el registro manual. Sin probar.

## Pendiente o abierto

- **El denegado se deduce** de que Salud no dé noches; iOS no permite saberlo con seguridad.
- **Consistencia en minutos** y no en %, por el contrato.
- **Estado sin estimación** con Health: es mío, no del diseño.
- **La noche manual se registra para hoy** (la que acaba de terminar). No hay selector de fecha.
- **Respira:** la variante de "Reducir movimiento" es mía; el diseño no la tenía (25.10.7).
- **Entrenos de Salud:** el texto de permiso los menciona, pero la app aún no los lee.
