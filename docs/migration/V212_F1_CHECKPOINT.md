# v2.12 · Fase 1 · Navbar e identidad de ELLIE — checkpoint

Fecha: 2026-10-09 · Rama `feature-migration` · Solo UI, sin backend, sin dependencias nuevas.
Fuente: `migration-source/ATHELETE Alive Minimalism/` (v2.12) y [`V2_12_DELTA.md`](V2_12_DELTA.md) (bloques A y C, y el modo voz del D).

## Estado

| Pieza | Estado |
|---|---|
| Navbar: 4 iconos propios + ELLIE como Halo, activo en Ember sin pill, 64 pt / radio 26 | ✅ (iconos y estado en el commit anterior; ajuste de medidas y orbe sin 50 % de opacidad aquí) |
| `LivingHalo` (mini, tab, chat, input, banda, portada, voz) con 4 estados + offline | ✅ |
| `EllieOrb` sin uso (envoltorio obsoleto, sin borrar) | ✅ |
| `EllieActionButton` (principal y compacto) en las acciones de IA | ✅ |
| Fondos neutros de ELLIE (portada, chat, bienvenida, bandas), Light y Dark | ✅ |
| Escena de voz (solo UI, `TODO(voice)`) y entrada desde el micrófono del compositor | ✅ |
| Micrófono, reconocimiento y TTS reales | ⏳ TestFlight |

## Qué quedó

- `src/components/v2/livingHaloModel.ts` (lógica pura de estados, tamaños y modo tab) y `LivingHalo.tsx` (react-native-svg + Reanimated; todo el movimiento en el hilo de UI). Con "Reducir movimiento": sin escala, deformación, ondas ni deriva, transiciones instantáneas; "pensando" solo late en opacidad (permitido por el handoff).
- `EllieActionButton.tsx`: principal (relleno `ember.strong`, texto blanco, Halo 20 a 22, gap 10) y compacto (Halo + texto Ember). Usado en: Crear con ELLIE (Nutrición), respuesta principal de la portada de ELLIE, Otra versión y Ajustar (chat), y "Ajustar con ELLIE" de la banda de Nutrición (`EllieSurface` con `action.ai`).
- `EllieComposer`: Halo de 32 y chip de micrófono neutro (`onVoice`) en portada y chat.
- `EllieVoiceScreen` (ruta `EllieVoice`): escena oscura en ambos temas, Halo de 176, línea de estado, texto, botón de chat y botón central Ember de 72 pt (micrófono / detener). En `__DEV__` el toque recorre los 4 estados; en release no hace nada (`TODO(voice)`). Dev: `athelete://dev/ellie?screen=voiceIdle|voiceListening|voiceThinking|voiceSpeaking`.
- Tokens: sin peach/lino (ver D-114); `ember.strong` `#D2420E` (4,64:1 con blanco).
- Tests: `__tests__/livingHalo.test.ts` (tamaños, tiempos, modo tab, cuándo animar, recorrido de la escena de voz) y `themeV2` (contraste, 64 pt y radio 26).

## Capturas (simulador iPhone 17 Pro, Light y Dark) contra las referencias v2.12

Comparadas: portada de ELLIE (ELLIE_01) Light y Dark, voz escuchando (ELLIE_05) y respondiendo (ELLIE_07), navbar en Inicio. Coinciden estructura, colores y controles. Diferencias que quedan, por orden de importancia:

1. El brillo Ember del contorno del Halo (arco abajo a la derecha) es más tenue que en la referencia; en voz el halo exterior es algo más ancho.
2. El Halo del tab bar y el de la portada no tienen el reflejo "smoked glass" pulido de la referencia (solo un brillo suave arriba a la izquierda).
3. El botón principal de IA usa `#D2420E` (D-119) y no `#FF5B1F`: se ve más oscuro que la referencia por contraste.
4. En voz, el texto del estado "pensando" y las líneas de ejemplo son datos de desarrollo; el texto del reposo sí es el real.
No capturado: estados "pensando" del chat, Nutrición sin plan y la bienvenida del onboarding (requieren estados de datos que no se pudieron forzar aquí).

## Pendiente

- `TODO(voice)` en `EllieVoiceScreen`: captura de micrófono, reconocimiento, respuesta y TTS; pasar `level` al Halo. Solo probable en iPhone real.
- Fijar el copy de la banda de Inicio ("Siempre aquí para tu entrenamiento." / "Hablar con ELLIE →") y su padding 28/20: es Inicio (fase siguiente).
- Confirmar si se borran `EllieOrb.tsx`, `BestMarkCard`, `RecentPRCard`, `bestMarkParts` y `prCurve`.
- Android sin compilar (sigue pendiente §8.1).

## Corrección de la portada de ELLIE (2026-10-09)
Orden, respuestas rápidas en una fila sin Halo mini, Halo sin arco ni media luna con sombra, margen inferior y animación de entrada: ver D-149 a D-153 en MIGRATION_PROGRESS.
