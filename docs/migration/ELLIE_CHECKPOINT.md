# Checkpoint · Módulo ELLIE (tarea autónoma)

**Estado:** EN CURSO · **Bloque actual:** B (portada) tras A

Cuenta de prueba: `falcon1989@gmail.com` (id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5`).
**Regla de oro: no se envían mensajes reales a ELLIE** (gastan créditos y escriben en la base). Modo dev con fixtures (`devState`, sin red ni escrituras); la conexión real solo se valida con tsc.
Si al empezar este archivo ya existe: léelo primero y sigue desde "Siguiente paso" sin rehacer nada.

## Plan de bloques
- **A** · Reconocimiento ✅ (abajo) · **B** · Portada · **C** · Conversación · **D** · Historial y límites · **E** · Puntos de entrada · **F** · Estados · **G** · Cierre.

## Bloque A · referencias y mapa dato → fuente
**Referencias** (índice y handoff §ELLIE): ELLIE_01_HOME (portada), ELLIE_02_CHAT (conversación + pensando), ELLIE_03_CHAT_PLAN (plan propuesto / activo), STATE_08_ERROR_ELLIE (sin conexión), ONB_03_ELLIE_WELCOME (bienvenida). Prototipo `Ellie.dc.html` (+Dark). Estados del handoff: pensando (esfera con pulso y "Pensando…", sin skeleton) · plan propuesto · activando · error de activación (inline, con reintento) · activo · sin conexión (esfera apagada, mensaje no enviado + "Reintentar", campo inactivo). Comportamiento del prototipo: `askEllie(prompt)` abre el **chat como pantalla aparte (sin tab bar)** y, si hay prompt, lo **envía solo**.

**ELLIE v1 (hoy):**
- Una pantalla de tab con portada + chat embebido (`EllieScreen`, 741 líneas) y `useEllieChat`.
- **Edge function** `POST {SUPABASE_URL}/functions/v1/ellie-chat` (`services/ellie/chat.ts`): cabecera `Authorization: Bearer <anon key>`, cuerpo `{messages, userContext, mode?}`. Respuesta: `application/json` (tool result `generate_workout_plan` | `generate_nutrition_plan` | `text`) o SSE `data: {choices[0].delta.content}`.
- **No hay streaming progresivo real:** RN lee `response.text()` entero y luego emite los deltas de golpe.
- Tablas: `chat_messages` (`user_id, role, content, created_at`): **una sola conversación por usuario**, sin `conversation_id`. Historial: `fetchEllieChatHistory`; alta: `insertEllieChatMessage`; borrar todo: `clearEllieChatHistory`.
- Acciones de las tarjetas (`ellie-actions.ts`): `saveEllieWorkout` (→ `workout_templates` + `template_exercises`, devuelve `workoutId`) y `saveEllieNutritionPlan` (→ `nutrition_plans`); regenerar con `generateWithEllie`.
- Contexto enviado: `useEllieData().serializedContext` (perfil, entrenos, nutrición, reto, logros, récords, hidratación). Insights/nudges/prompts: `ellie-engine.ts`.
- **Límites:** el cliente no conoce ninguna cuota; solo recibe `{error}` y el código HTTP.

| Elemento del diseño | Fuente |
|---|---|
| Orbe, halo, lino | `EllieOrb` + tokens `ellie.*` (existen) |
| Frase de apertura de la portada | `useEllieData().heroInsight` (motor local) |
| Dos botones de respuesta | Los dos primeros prompts sugeridos (`promptCards`) — el diseño propone un sí/no a una propuesta concreta (BT) |
| "También puedo" (3 filas) | Prompts fijos del prototipo |
| "Escanéala con ELLIE" | Scan: sin acción (DA-54 de Entrenos) |
| "Para leer con ELLIE" | Tres temas fijos (como el prototipo); tocar envía un prompt |
| "Retomar conversación" | Último mensaje de `chat_messages` |
| Chat: voz sin burbuja / píldora del usuario | Mensajes de `chat_messages` + los de la sesión |
| Tarjeta plan nutricional | `nutrition_preview` → `saveEllieNutritionPlan` |
| Tarjeta rutina | `workout_preview` → `saveEllieWorkout` (+ abrir el detalle) |
| Tarjeta recuperación ("Movilidad de cadera") | **No existe** en el backend (la edge function solo genera rutina y plan) → BT |
| "…" del chat | Nueva conversación = `clearEllieChatHistory` |
| Lista de conversaciones | **No existe** (hilo único) → BT |
| Cuota / límite | **No existe** → BT; el cliente trata 429/402 como límite |

## Hecho
- Bloque A (recon).
- Bloque B (parcial): modelo puro `features/ellie/chatModel.ts` + `resultParsing.ts` con tests (17); primitivos `EllieLinen`, `EllieComposer`; tipos y ruta `EllieChat`; hook `useEllieHistory`; portada `screens/tabs/EllieScreen.tsx` + `features/ellie/v2/EllieHome.tsx`; hook `useEllieConversation`; `callEllieChat.onError` recibe el status HTTP (2.º argumento opcional, compatible con v1).
- Ruta `EllieChat` registrada en RootNavigator (apunta a `screens/ellie/EllieChatScreen`, aún por crear).

- Bloque C (código): `screens/ellie/EllieChatScreen.tsx`, `features/ellie/v2/ChatParts.tsx` (voz, pastilla, indicador, sugerencias, plan nutricional, rutina), `dev/ellieFixtures.ts`, `dev/devEllieScreens.ts` (menú + deep link registrados en DevCatalogHost). tsc limpio.

- Bloques D–G: límites/nueva conversación, puntos de entrada (Inicio, Progreso, Notificaciones, Nutrición), estados, dev kit, BT-25–29 y sección 23 de MIGRATION_PROGRESS.

## COMPLETADO
