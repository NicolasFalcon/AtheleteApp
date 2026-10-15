# Paso 3 · ELLIE · App

Contrato: `docs/backend/ELLIE_SHAPES.md` (copiado tal cual del backend; es la única fuente). Estado al 15-10-2026: partes A (chat) y B (voz) hechas; sin probar en dispositivo.

## A · Chat

### Servicio (`src/services/ellie/ellieService.ts`)
- `sendEllieMessage` llama a `ellie-chat` con `supabase.functions.invoke` (JWT de la sesión del usuario), `stream: false`, `conversation_id`, `client_message_id`, `message`, `mode` (`chat` por defecto / `generate_workout` / `generate_nutrition`), `image_path` (soportado, sin UI hasta la fase de Visión) y `client_context`.
- **Idempotencia:** el `client_message_id` es el id del mensaje del usuario en la pantalla y es el **mismo en cada reintento**; si el servidor ya lo había contestado devuelve `replayed: true` sin cobrar cupo.
- **409 `duplicate_in_progress`:** espera 1,5 s y 3 s y vuelve a preguntar en silencio con el mismo id (3 intentos en total); si sigue, falla como error normal.
- **`client_context`:** solo la pantalla de origen (`home`, `progress`, `nutrition_plan`, `voice`… sale del nombre de la ruta); nunca datos del usuario.
- **Errores** (`EllieError` con `code`, `status`, `used`, `limit`): todos los de la tabla del contrato; sin cuerpo legible decide el estado HTTP; sin respuesta del servidor es `offline`.
- `usage` de cada respuesta se guarda en la caché de React Query (`['ellie','usage',userId]`) y `get_ellie_usage` lo rellena si no hay nada; se usa para el aviso de límite. **El diseño no tiene un contador de cupo restante, así que no se muestra.**

### Lo viejo, eliminado
- `userContext` del cliente: `serializedContext` de `useEllieData` y `serializeEllieContext` (`shared/domain/ellie-context.ts`).
- Todo INSERT en `chat_messages` y el borrado por usuario: `insertEllieChatMessage`, `clearEllieChatHistory`, `fetchEllieChatHistory` (`services/supabase/ellie.ts`).
- El cliente SSE antiguo `services/ellie/chat.ts` (llamaba con la clave pública) y `callEllieChat` / `generateWithEllie`.
- Código muerto del chat v1: `hooks/useEllieChat.ts` y `features/ellie/components/*` (16 archivos que nada importaba), `hooks/useEllieHistory.ts`, `features/ellie/v2/voiceSceneModel.ts` (el paseo de demostración de estados).

### Historial (`ellieHistory.ts`, `hooks/useEllieConversations.ts`)
Lectura directa con RLS: `ellie_conversations` (lista, más reciente primero) y `chat_messages` (por conversación, `created_at` ascendente), más borrar conversación (borra sus mensajes en el servidor). React Query con claves por usuario: `conversations`, `messages`, `latest`, `usage`. Los mensajes de una conversación se leen frescos cada vez que se abre el chat. La app **no inserta** nada.
- **UI:** el menú del chat (⋯) ofrece **Nueva conversación** (el servidor la crea con el primer mensaje; ya no borra nada) y **Conversaciones** (lista con título y «Hoy / Ayer…», abrir y borrar con confirmación). La portada «Retomar» usa la última línea de la conversación más reciente. Sin parámetro, el chat continúa la más reciente; `conversationId: 'new'` o un id en la ruta fuerzan otra.

### UI optimista y errores
- El mensaje del usuario aparece al instante (`sending`); si falla queda **«No enviado · Reintentar»** (mismo `client_message_id`). Si ningún reintento puede funcionar (límite del día, sesión caducada, texto inválido, créditos) solo dice «No enviado», sin botón.
- Textos v2 en es/en (`ellieCopy.ts`, idioma = `profiles.language`, `es` por defecto) sin códigos ni nombres de proveedor:
  - `daily_limit` / `daily_image_limit`: «Hoy llegamos al límite (40 de 40). Se reinicia mañana…»; deja el compositor inactivo.
  - `unauthorized`: aviso y vuelta al login (`signOut`).
  - `rate_limited`, `ai_unavailable`, `ai_forbidden`, `duplicate_in_progress`, `internal`: mensaje genérico con Reintentar.
  - `ai_credits_exhausted`: «Ahora mismo no puedo responder. Inténtalo más tarde.» (sin detalles).
  - `invalid_input`: pide reescribir (hasta 4000 caracteres). `offline`: sin conexión, compositor inactivo.

### Planes
`tool.type` `generate_workout_plan` / `generate_nutrition_plan` → la tarjeta de plan que ya existía (`RoutineCard` / `NutritionPlanCard`), con el `intro_message` como texto. Los ejercicios conservan su `exercise_id` del catálogo (también se guarda en `template_exercises.exercise_id` al pulsar «Guardar», que es lo que abre poster/MoveKit desde la rutina guardada) y se lee `dropped_exercises`. «Otra versión» pasa a ser un turno más de la misma conversación (`mode` según la tarjeta). Las tarjetas del historial se reconstruyen desde `tool_type` / `tool_data`. No se añadieron acciones.

### Zona horaria
`features/profile/timezoneSync.ts` + `useTimezoneSync` (montado en `App.tsx`): al iniciar sesión, al arrancar y al volver a primer plano compara `profiles.timezone` con la IANA del dispositivo (`Intl`) y la actualiza solo si difiere. Falla en silencio.

## B · Voz (todo en el dispositivo)

### Librerías instaladas (exactas) y compatibilidad con Expo SDK 56
- `expo-speech` **56.0.3** (la que fija `bundledNativeModules` del SDK 56).
- `expo-speech-recognition` **56.0.4** (comunitaria, versionada con el SDK; pares `expo`/`react-native` `*`).
- Ambas: iOS 16.4, dependen de `ExpoModulesCore` (56.0.27). `pod install` sin errores: `ExpoSpeech 56.0.3`, `ExpoSpeechRecognition 56.0.4`; **una sola** `RNWorklets 0.12.2` y `RNReanimated 4.6.0`.

### Piezas (`src/features/ellie/voice/`)
- `voiceMachine.ts` (pura): fases `idle · listening · thinking · speaking · error`; el halo usa `haloFor` (error = esfera quieta, el estado `offline` del halo). Etiquetas es/en, pista de reposo y textos de error.
- `voiceController.ts`: orquesta reconocedor → `ellie-chat` → voz con la máquina; testable con fakes. Fin de frase = **1,6 s sin cambios** en la transcripción; **8 s** sin hablar → reposo. Tocar mientras escucha envía lo dicho (una sola vez); mientras piensa cancela (la respuesta tardía se ignora); mientras habla interrumpe.
- `speaker.ts`: interfaz **`Speaker`** intercambiable (para pasar a una voz del servidor sin tocar pantallas) + `DeviceSpeaker` (expo-speech). `pickVoice`: la voz instalada con el locale exacto (es-ES / en-US), luego otra región del idioma, Premium/Enhanced antes que Default. `plainSpeech` quita markdown, enlaces y emoji antes de leer.
- `recognizer.ts`: `SpeechListener` + `ExpoSpeechListener`. Resultados parciales; idioma según `profiles.language` (es-ES / en-US); reconocimiento **en el dispositivo cuando el teléfono lo admite** y, si el idioma no está instalado para eso, el reconocedor normal de Apple (en ese caso iOS usa sus servidores; el texto de permiso del Info.plist ya lo cubre).
- `audioSession.ts`: **duck** de la música mientras habla (categoría `playback` + `duckOthers`, modo `spokenAudio`) y, al terminar o interrumpir, desactiva la sesión avisando a las demás apps (`notifyOthersOnDeactivation`) y restaura la categoría anterior. Al escuchar, el reconocedor usa `playAndRecord` + `duckOthers`.
- `useEllieVoice.ts`: lo que dices va a `ellie-chat` como mensaje normal (`mode: chat`, `client_context: voice`) de la conversación más reciente, así que también aparece en el chat. Si la respuesta trae un plan, lo lee (intro) y dice «Te dejé el plan en el chat.»
- **Pantalla** (`EllieVoiceScreen`): halo conectado a las fases, etiqueta, transcripción en vivo, respuesta, error con texto de ELLIE y, si es de permiso, botón **Abrir Ajustes**; el botón principal y el halo hacen lo mismo (hablar / detener).

### Permisos
Explicación previa v2 (hoja «Para escucharte», es/en) antes del diálogo del sistema (micrófono + reconocimiento de voz); si se deniegan, estado de error con «Abrir Ajustes». Los textos de `NSMicrophoneUsageDescription` y `NSSpeechRecognitionUsageDescription` ya estaban en el Info.plist (1b).

## Tests (727 en total; +61 de este paso)
`ellieService` (cuerpo de la petición, idempotencia del reintento, 409 con espera y tope de 3, mapeo de todos los errores, lectura de `tool` y `usage`), `ellieCopy` (es/en, sin filtrar códigos ni proveedores, efectos y reintentabilidad), `timezoneSync`, `ellieVoiceMachine` (+ `pickVoice`, `plainSpeech`), `ellieVoiceController` (flujo completo con fakes: duck y liberación, silencio, interrupción, cancelación, permisos, errores, destrucción), y adaptados `ellieChatModel` / `ellieResultParsing` (`historyToMessages`, `exercise_id`, `dropped_exercises`). Se quitó el test del paseo demo de estados de voz de `livingHalo.test.ts` (el modelo ya no existe) y los de `classifyEllieError` / `toClientMessages` / `persisted` (la lógica que probaban se fue con el servidor que guarda el historial).

## Archivos
- **Nuevos:** `docs/backend/ELLIE_SHAPES.md`, `services/ellie/{ellieService,ellieHistory}.ts`, `features/ellie/ellieCopy.ts`, `features/ellie/voice/*` (7 archivos), `features/profile/{timezoneSync,useTimezoneSync}.ts`, `hooks/{useEllieConversations,useProfileLanguage}.ts` y 5 archivos de test.
- **Tocados:** `chatModel.ts`, `resultParsing.ts`, `useOpenEllieChat.ts`, `v2/useEllieConversation.ts`, `v2/ChatParts.tsx`, `EllieChatScreen.tsx`, `EllieVoiceScreen.tsx`, `tabs/EllieScreen.tsx`, `useEllieData.ts`, `ellie.ts`, `ellie-actions.ts`, `ellie-context.ts`, `types/navigation.ts`, `App.tsx`, `jest.config.js`, `package.json`, `package-lock.json`, `Podfile.lock`.
- **Borrados:** ver «Lo viejo, eliminado».

## Pendiente / a tener en cuenta
- Foto (`image_path`) y escaneos: el servicio ya lo soporta; la UI llega con Visión.
- Contador de cupo restante: cacheado, sin pantalla donde mostrarlo.
- Mientras habla, la música baja pero no se pausa (por diseño: «no cortar más de lo necesario»); algunas apps de audio no obedecen el duck.
- Voz del servidor: cambiar la implementación de `Speaker` en `useEllieVoice.ts`.

## Verificación (15-10-2026)
`tsc` y `eslint` limpios, 727 tests en 69 suites, bundle de Release (`react-native bundle --dev false`) correcto y **build Debug de iOS (simulador) correcto** con `ExpoSpeech` y `ExpoSpeechRecognition`. No se recompiló Release (dispositivo) tras añadir las dos librerías.

Nota de herramientas: el `xcodebuild` Release que se lanzó en el spike dejó en `ios/Pods/React-Core-prebuilt` el *flavor* Release de React; un build Debug posterior fallaba al enlazar (`facebook::react::Sealable` sin definir). Se restauró el flavor Debug con `node node_modules/react-native/scripts/replace-rncore-version.js -c Debug -r 0.85.2 -p ios/Pods` (con `.last_build_configuration` escrito). Xcode normalmente lo cambia solo según la configuración; si vuelve a verse ese error, repetir ese comando.
