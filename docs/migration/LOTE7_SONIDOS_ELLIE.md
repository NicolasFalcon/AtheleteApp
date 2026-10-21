# Lote 7 · Sonidos + Quiz + portada de ELLIE sin voz (B-27)

Solo app (el backend no cambia). Fuente: handoff v2.15 §25.7, §25.8 y §25.9 (ELLIE_08), §7 (Quiz · Ronda) y `ath-sound.js`.

Estado al 20-10-2026:
- Hecho en código, con build Debug de simulador (resultado abajo).
- **Sin probar en iPhone.**
- Sin commits.
- No se tocan backend, Ruta ni Comunidad.
- El ambiente de Respira queda para el lote 9.

Decisiones confirmadas antes de empezar:
- Se añade el temporizador de 15 s del Quiz (§7), que la app no tenía.
- Se añade un contador animado de puntos en el resultado.
- `tick-urgent` recibe los segundos, así que sube de tono de 5 a 2. En el prototipo nunca los recibía.
- El LivingHalo conserva reposo, sin conexión y pensando.
- `EllieVoice` de `ChatParts` se queda: es el mensaje de texto de ELLIE, no el modo voz.

## 1 · Archivos de sonido

`scripts/render-sounds.js` carga **`ath-sound.js` sin modificar** en Chrome headless (DevTools Protocol) y lo renderiza con un `OfflineAudioContext`. Así el resultado es idéntico a la síntesis del prototipo: osciladores, envolventes, volúmenes, reverb y compresor.

Tratamiento de los archivos:
- **Aleatoriedad:** semilla fija por evento para la reverb y el ruido. Dos ejecuciones dan los mismos archivos, salvo 1 bit (−90 dBFS) por el redondeo del convolver de Chrome. No se oye.
- **Recorte:** se quita el silencio inicial y la cola por debajo de −60 dBFS, con un fundido de salida de 20 ms.
- **Normalización:** una **sola ganancia para todos** (+4,0 dB), de modo que el más fuerte llega a −1 dBFS. Se mantiene la jerarquía del diseño: el tic casi inaudible queda por debajo de "complete".
- **Formato:** WAV de 16 bits, 44,1 kHz y estéreo (Android). Después, `.caf` LEI16 con `afconvert` (iOS).
- **Destino:** `src/assets/sounds/`. Cada plataforma solo empaqueta lo suyo (`soundAssets.ts` / `soundAssets.ios.ts`), unos 4,2 MB.

Uso: `node scripts/render-sounds.js`. Necesita macOS y Google Chrome.

**Salieron 22 eventos** (44 archivos):

| Archivo | Duración | Pico |
|---|---|---|
| `tick` | 0,21 s | −34,8 dB |
| `tick-urgent-5` · `-4` · `-3` · `-2` | 0,70–0,81 s | −27,6 → −24,6 dB |
| `tick-final` | 1,02 s | −16,6 dB |
| `correct` · `correct-streak` (racha ≥ 3) | 1,28 · 1,38 s | −8,7 · −8,8 dB |
| `wrong` | 1,03 s | −10,4 dB |
| `point-0` … `point-7` (escala E5–B6) | 0,71–0,86 s | −23,7 … −21,9 dB |
| `impact` | 1,49 s | −8,1 dB |
| `complete-low` · `-mid` · `-perfect` | 1,96 · 2,42 · 2,44 s | −5,6 · −1,8 · −1,0 dB |
| `day-close` | 1,45 s | −6,4 dB |

Las duraciones incluyen la cola de reverb del diseño, por eso son más largas que la columna "Duración" de la tabla 25.8.

`point` tiene 8 notas (la escala del JS), no 12: el contador de 12 pasos las recorre como hace `point(i, n)`.

## 2 · Servicio de sonido (expo-audio)

Punto de entrada único: `playSound(event)` (`src/features/sound/soundService.ts`).
- **Sesión de audio:** `playsInSilentMode: false` + `interruptionMode: 'mixWithOthers'`. En iOS es la categoría **ambient**: respeta el interruptor de silencio y no corta la música del usuario. En Android no suena con el teléfono en silencio o en vibración.
- **Precarga:** crea un reproductor por archivo al arrancar (`AppProviders`, después de leer Ajustes). Si los sonidos están apagados, no precarga nada; al encenderlos en Ajustes, sí.
- **Vibración:** cada sonido lleva su vibración donde ya la había. Acierto: impacto ligero; fallo o tiempo agotado: error. Las reglas son puras y tienen tests (`soundModel.ts`).

## 3 · Ajustes · Sonidos y vibración

Nueva sección con dos interruptores:
- **Sonidos:** "En el Quiz. Respetan el modo silencio".
- **Vibración:** "Respuesta táctil al tocar y al acertar".

Se guardan en el dispositivo (`@athelete/feedback-prefs`, `src/lib/feedbackPrefs.ts`).

**Vibración apagada silencia toda la app:** el interruptor actúa en `haptics.ts`, por donde pasan las 32 vibraciones de la app.

## 4 · Quiz

- **Temporizador de 15 s (§7):**
  - Barra de 4 pt bajo el contador con los segundos a la derecha. En los últimos 5 s, barra y cifra pasan a Ember con brillo.
  - Al llegar a 0 cuenta como fallo: 0 puntos, se rompe la racha, título "Se acabó el tiempo" y se marca la respuesta correcta.
  - El tiempo agotado se guarda como `selectedAnswer: -1`. El backend no cambia (`answers` es jsonb).
  - El tiempo se congela al responder y **se pausa con la hoja "¿Salir de la ronda?" abierta y con la app en segundo plano**. Esto último es una decisión mía: el prototipo no lo define.
- **Sonidos de la ronda:**
  - Tic suave de 14 a 6 s y tic urgente de 5 a 2 s, que sube de tono.
  - Tic final en el último segundo.
  - "Acierto" (más brillante desde 3 seguidas) o "fallo".
- **Resultado:**
  - "complete" según el nivel a los 140 ms.
  - La cifra de puntos cuenta desde 0 en hasta 12 pasos de 75 ms a partir de los 700 ms, con un "point" por paso e "impact" en la cifra final.
  - Después muestra los puntos del servidor y, mientras guarda, los de la ronda. Antes mostraba "—" hasta guardar; ahora "—" solo aparece si falla el guardado.
- **Core 33 (`day-close`):** el archivo existe, pero no está conectado: el lote solo pedía el Quiz.

## 5 · Portada de ELLIE (ELLIE_08) y retirada del modo voz (B-27)

**Portada según 25.9:**
- Cabecera: wordmark "ELLIE" (20/500, tracking .42 em) sobre "ATHELETE INTELLIGENCE" (9/600, .32 em). A la derecha, botón reloj de 44 pt que abre el chat con la lista "Conversaciones" (parámetro nuevo `showConversations`).
- Centro: Halo de **168 pt** (antes 128) en un anillo de 236 pt al 8 % con arco Ember de 2 pt, y la pill "● ELLIE EN LÍNEA". La pill dice "SIN CONEXIÓN" si falla el historial.
- Mensaje: titular 28/500 (el insight de ELLIE o el saludo) y subtítulo 16 fijo.
- Respuestas: rejilla 1,3 : 1. La primaria es Ember con Halo mini de 22 pt y flecha; la secundaria va en contorno.
- "TAMBIÉN PUEDO AYUDARTE CON": 2 × 2 (Entrenamiento, Nutrición, Recuperación, Análisis) y card ancha "Escanear máquina" con miniatura de 56 pt.
- "CONVERSA CON ELLIE": campo en flujo de 60 pt con Halo de 36 pt. Sustituye al campo flotante.
- Eliminados: "Para leer con ELLIE" y la fila "Retomar conversación".
- La animación de entrada se mantiene: el Halo sale del tab hasta 168 pt y el mensaje sube.

**Retirada del modo voz:**
- Pantalla, ruta `EllieVoice`, máquina de estados, controlador, reconocedor, "speaker", sesión de audio y sus dos tests.
- El micrófono del compositor, en la portada y en el chat.
- Las librerías `expo-speech` y `expo-speech-recognition`.

**LivingHalo:**
- Quedan `idle`, `thinking` y `offline`.
- Fuera `listening`, `speaking`, los textos de la escena de voz, el tamaño `voice` (176), la reactividad a la voz (`level`) y las ondas.

**Info.plist:**
- Fuera `NSSpeechRecognitionUsageDescription`.
- **`NSMicrophoneUsageDescription` se queda** con texto nuevo ("Athelete no graba audio…"). `expo-camera` y `expo-audio` tienen código nativo de micrófono, y sin esa clave la subida a App Store Connect puede rechazarse (ITMS-90683). La app no pide nunca ese permiso.

## Archivos

**Nuevos:**
- `scripts/render-sounds.js`
- `src/assets/sounds/*.wav` y `*.caf` (44)
- `src/features/sound/soundModel.ts`, `soundService.ts`, `soundAssets.ts`, `soundAssets.ios.ts`
- `src/lib/feedbackPrefs.ts`
- `src/types/assets.d.ts`
- `src/features/quiz/useQuestionTimer.ts`, `useResultCount.ts`
- `__tests__/soundModel.test.ts`

**Modificados:**
- `src/app/AppProviders.tsx`
- `src/components/v2/haptics.ts`, `LivingHalo.tsx`, `livingHaloModel.ts`, `EllieComposer.tsx`
- `src/screens/profile/SettingsScreen.tsx`
- `src/features/quiz/quizModel.ts`, `v2/RoundParts.tsx`
- `src/screens/quiz/QuizQuestionScreen.tsx`, `QuizResultScreen.tsx`
- `src/features/ellie/v2/EllieHome.tsx` (reescrito), `ellieEntryModel.ts`
- `src/screens/tabs/EllieScreen.tsx` (reescrito), `src/screens/ellie/EllieChatScreen.tsx`
- `src/navigation/RootNavigator.tsx`, `src/types/navigation.ts`, `src/constants/routes.ts`
- `ios/Athelete/Info.plist`, `ios/Podfile.lock`
- `package.json`, `package-lock.json`
- `jest.setup.ts` (mock de expo-audio)
- `__tests__/livingHalo.test.ts`, `ellieEntryModel.test.ts`, `quizModel.test.ts`

**Borrados (uno a uno):**
- `src/features/ellie/voice/` (6 archivos y la carpeta vacía): `audioSession.ts`, `recognizer.ts`, `speaker.ts`, `useEllieVoice.ts`, `voiceController.ts`, `voiceMachine.ts`
- `src/screens/ellie/EllieVoiceScreen.tsx`
- `__tests__/ellieVoiceController.test.ts`, `__tests__/ellieVoiceMachine.test.ts`

## Librerías

| Librería | Cambio |
|---|---|
| `expo-audio` | **+ 56.0.13**: la versión de SDK 56 en `expo/bundledNativeModules.json`, exacta. En Android solo añade `MODIFY_AUDIO_SETTINGS`. |
| `expo-speech` | **− 56.0.3** |
| `expo-speech-recognition` | **− 56.0.4** |

Pods: entra `ExpoAudio` y salen los dos de voz.

## Verificación

- `tsc --noEmit`: 0 errores.
- `eslint` (archivos tocados): 0 errores. Quedan 6 avisos `no-inline-styles` que ya existían (`EllieComposer`, `RoundParts`, `SettingsScreen`).
- `jest --findRelatedTests`: 14 suites, 180 tests OK. `App.test.tsx` aparte: 2/2.
- `pod install`: OK.
- Build Debug de simulador (iPhone 17 Pro): **BUILD SUCCEEDED**.
  - El primer intento falló al enlazar (`facebook::react::Sealable`). Es el problema ya conocido de LOTE1 y STEP3: tras `pod install`, `Pods/React-Core-prebuilt` queda en sabor Release.
  - Se arregló con `replace-rncore-version.js -c Debug`. Hay que ejecutarlo **desde `ios/Pods`**, porque busca `.last_build_configuration` en la carpeta actual. Antes se escribe `Release` en ese archivo.

## Qué probar en el iPhone

1. **Quiz:**
   - La barra se vacía en 15 s y pasa a Ember en los últimos 5.
   - Se oyen los tics y suben de tono de 5 a 2.
   - Al llegar a 0: "Se acabó el tiempo", la respuesta correcta marcada, sonido de fallo y vibración.
2. **Acierto y fallo:** suenan y vibran. Desde 3 aciertos seguidos, el acierto suena más brillante.
3. **Resultado:**
   - "complete" suena distinto según el nivel (bajo, medio, perfecto).
   - La cifra de puntos cuenta con un sonido por paso y un golpe final.
   - Después queda el valor guardado.
4. **Interruptor de silencio:** con el iPhone en silencio, el Quiz no suena pero sí vibra.
5. **Música:** con Spotify o Música sonando, el Quiz suena encima sin pausarla.
6. **Ajustes:**
   - Con Sonidos apagado, el Quiz no suena. Con Vibración apagada, no vibra nada en la app (botones, pestañas, Quiz).
   - Los dos valores se mantienen al cerrar y abrir la app.
7. **Pausa del tiempo:** abrir "¿Salir de la ronda?" o mandar la app a segundo plano pausa el tiempo.
8. **Portada de ELLIE (Light y Dark):**
   - Comparar con `ELLIE_08_HOME_V215_LIGHT/DARK.png`.
   - Halo de 168 pt con su anillo y arco, la pill, las respuestas, el 2 × 2, Escanear y el campo en flujo.
   - El reloj abre el chat con "Conversaciones".
   - La entrada desde el tab hace crecer el Halo.
9. **Voz:** no queda ningún micrófono ni modo voz, ni en la portada ni en el chat.

## Pendiente o abierto

- El ambiente de Respira (lote 9).
- Conectar `day-close` en Core 33.
- La variante `button` de `EllieComposer` ya no la usa nadie. Se dejó para no ampliar el lote.
- Android sin probar.
