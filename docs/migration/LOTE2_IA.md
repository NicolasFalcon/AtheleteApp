# Lote 2 · IA en la app · B-14/16, B-15, B-17, B-18, B-24, B-25 (+ zonas)

Contrato: secciones «Cambios Lote 2» de `docs/backend/VISION_SHAPES.md` (§6), `ELLIE_SHAPES.md` y `ROUTINES_SHAPES.md`. Estado al 17-10-2026: hecho en código; **sin probar en iPhone**. Sin commits. **No hay librería nueva** (el markdown lo pinta un parser propio, ver punto 5).

## 1 · Tiempos y reintentos (B-14/16)
- La app espera **35 s** en `ellie-vision` y en `ellie-chat` con foto (`AI_REQUEST_TIMEOUT_MS`, por encima de los ~25 s del servidor). El chat solo de texto sigue con la espera de la plataforma.
- **504 `ai_timeout`**, y también cuando se agota la espera de la propia app, se muestra como «Está tardando más de lo normal» con Reintentar: en la hoja de foto (comida y máquina) y en el chat. Nunca dice «sin conexión».
- **«Sin conexión»** sale solo con un error real de red. Cualquier otro fallo inesperado (por ejemplo, al subir la foto) se trata como fallo nuestro, con Reintentar.
- **`mode=meal`:** `client_request_id` se genera una vez por foto y se reutiliza en cada reintento de esa foto (`createPhotoRequestSession`, la misma idea que ya usaba la máquina). «Otra foto» genera uno nuevo. Cada nota a ELLIE («Dile algo a ELLIE») es una petición nueva, con su propio id.
- **409 `duplicate_in_progress`** en visión: espera y reintenta en silencio, como mucho 3 veces (2 s, 4 s y 8 s). El chat ya lo hacía con el mismo id.

## 2 · Escaneo de máquina (B-15)
- El título es `machine_type.name` («Prensa de piernas»). Si no llega, se usa el nombre del equipo, como antes.
- Los 3–6 ejercicios salen en el orden recibido.
- Se leen también los campos `machine_type_*` de los candidatos.
- El flujo de «¿Cuál de estas es?» / `choose_machine_candidate` no cambia.

## 3 · Borrador de comida (B-17)
- Un alimento contable muestra «4 huevos · 200 g · total» y debajo «por unidad: 50 g · 70 kcal · P 6 g». Con − / + cambia de unidad en unidad (nunca baja de 1). Uno no contable se edita por gramos, como antes.
- kcal y macros se recalculan al momento: unidades × valores por unidad, o en proporción a los gramos.
- `save_meal` / `update_meal` envían `unit_count`, `unit_label` y `*_per_unit` cuando hay unidades. `kcal_adjusted` se lee pero no se envía.
- Lo mismo en la tarjeta `meal_analysis` del chat (su «Editar» abre la misma pantalla de edición) y en el detalle de la comida. Una comida guardada vuelve a abrirse por unidades.

## 4 · Foto de la comida (B-18)
Nuevo `MealPhoto`, usado en el resultado/edición y en el detalle de la comida:
- La foto se ve entera (`contain`, centrada sobre fondo oscuro), sin cortar el plato.
- Empieza debajo de la barra de estado; los botones quedan encima.
- Al tocarla se abre a pantalla completa, con X para cerrar.

## 5 · Chat de ELLIE (B-24)
- **Markdown de verdad:**
  - Negrita, cursiva y negrita+cursiva; listas con viñetas y numeradas; un `### Título` se ve como una línea en negrita.
  - Enlaces, código y marcas sin cerrar se quedan como texto.
  - Va con la tipografía v2 (fuente del sistema, `bodyL`); nunca se ven `###`, `**` ni `*`.
  - Lo pinta un parser propio pequeño (`features/ellie/markdown.ts`, sin dependencias): para esto no hacía falta librería.
- **Historial:** los mensajes antiguos usan el mismo componente, así que también se ven bien. También se quitan las marcas en la última frase de la portada de ELLIE y en el texto de la pantalla de voz.
- **«Escribiendo»:** el indicador ya existía (orbe en «thinking» + tres puntos mientras se espera la respuesta, también con foto). No lo he cambiado.

## 6 · Agua (B-25)
- La meta sale **solo** de `profiles.daily_water_goal` (vasos de 250 ml), la misma fuente que ELLIE, con un único helper `waterGoalGlasses`. La usan:
  - Inicio (anillo y frase de «día completo»), Nutrición (tanque) y Progreso (semana);
  - la vista general de Inicio, el contexto de ELLIE y los recordatorios locales.
- **Quitado:** el respaldo fijo `DEFAULT_WATER_GOAL_GLASSES = 14`. No había ninguna meta calculada.
- **Sin meta en el perfil:**
  - se cuentan los vasos, pero no hay progreso ni «cumplida»;
  - el tanque dice «N vasos» sin «de X»;
  - Progreso dice «Sin meta de agua en tu perfil».
- **A confirmar con backend:** si `daily_water_goal` puede llegar vacío (hoy la app no lo escribe nunca).

## 7 · Zonas de varios músculos
`list_exercises` recibe la zona entera en `_muscles` (Brazos = bíceps, tríceps y antebrazos; Piernas = 5 músculos): una llamada por página en lugar de varias mezcladas. La mezcla por nombre queda solo para cuando se eligen varios equipos en Filtros, porque `_equipment` sigue aceptando un solo slug.

## Verificación
- `tsc --noEmit`: ok.
- `eslint` (solo archivos tocados): ok, 0 errores. Quedan 10 warnings que ya estaban (estilos en línea, `hasCompletedEver`, `no-catch-shadow` de `ellieService`). Corregí uno nuevo que había introducido en `visionService`.
- `jest --findRelatedTests` sobre los archivos tocados: ok, 18 suites / 233 tests. Hay 17 tests nuevos en `__tests__/lote2Ia.test.ts`.
- Ajusté tres tests existentes:
  - `nutritionModel` esperaba la meta fija de 14, que ya no existe;
  - `visionService` y `machineScanModel` cambiaron por las firmas nuevas;
  - `catalogCache` refleja `_muscles`.
- iOS: no hay build, porque no se tocó código nativo.

## Archivos
- **Nuevos:** `features/ellie/markdown.ts`, `features/vision/photoRequest.ts`, `features/nutrition/v2/MealPhoto.tsx`, `__tests__/lote2Ia.test.ts`, este documento.
- **Tocados:**
  - Servicios: `services/ellie/ellieService.ts`, `services/vision/visionService.ts`, `services/nutrition/mealsService.ts`, `services/catalog/catalogService.ts`, `services/supabase/ellie.ts`, `services/supabase/fitness.ts`, `services/supabase/progress.ts`.
  - ELLIE: `features/ellie/ellieCopy.ts`, `features/ellie/chatModel.ts`, `features/ellie/v2/ChatParts.tsx`.
  - Visión: `features/vision/visionCopy.ts`, `features/vision/machineScanModel.ts`.
  - Nutrición: `features/nutrition/mealDraft.ts`, `features/nutrition/nutritionModel.ts`, `features/nutrition/v2/MealResultView.tsx`.
  - Inicio y Progreso: `features/home/homePriority.ts`, `features/progress/progressModel.ts`, `features/progress/v2/SummaryBlocks.tsx`.
  - Componentes y catálogo: `components/v2/WaterTank.tsx`, `lib/catalog/exerciseStreams.ts`.
  - Hooks: `hooks/useCatalog.ts`, `hooks/useNutritionDay.ts`.
  - Pantallas: `screens/calories/CaloriesCameraScreen.tsx`, `MealReviewScreen.tsx`, `MealDetailScreen.tsx`, `screens/vision/MachineScanScreen.tsx`, `screens/ellie/EllieVoiceScreen.tsx`, `screens/tabs/HomeScreen.tsx`, `ProgressScreen.tsx`.
  - Tests: `__tests__/catalogCache.test.ts`, `machineScanModel.test.ts`, `visionService.test.ts`, `nutritionModel.test.ts`.
- **Borrados:** ninguno.

## Qué probar en el iPhone
1. **Foto de comida lenta:** analizar un plato con poca cobertura o una foto pesada. Si tarda, sale «Está tardando más de lo normal» con Reintentar (nunca «sin conexión»). Reintentar no cobra otro análisis: el contador de análisis del día no baja dos veces.
2. **Sin red de verdad (modo avión):** sale «No puedo analizar la foto ahora · Necesito conexión…».
3. **Chat con foto lenta:** el mensaje queda con «Reintentar» y la frase «Está tardando más de lo normal»; al reintentar llega la respuesta sin duplicarse.
4. **Máquina:** escanear una prensa: el título es «Prensa de piernas» y salen 3–6 ejercicios en orden. Con una foto dudosa sigue el «¿Cuál de estas es?».
5. **Comida contable:** foto de huevos o tostadas. Se ve «2 huevos · 100 g · total» y «por unidad: …». Con − / + cambian las unidades y las kcal/macros al momento. Guardar, abrir el detalle y Editar: sigue por unidades.
6. **Comida por gramos** (arroz, ensalada): − / + por gramos, como antes.
7. **Tarjeta del chat:** foto de comida en el chat → la tarjeta muestra unidades → Registrar en Calorías y también Editar.
8. **Foto:** en el resultado y en el detalle se ve el plato completo, debajo de la hora/batería. Tocar la foto la abre a pantalla completa y la X la cierra. Probar con una foto vertical y otra horizontal.
9. **Markdown:** pedir a ELLIE un resumen de la semana; negritas y listas bien pintadas, sin asteriscos ni almohadillas. Abrir una conversación antigua (también limpia) y la portada de ELLIE (la última frase sin marcas). Mientras responde, se ven el orbe y los tres puntos.
10. **Agua:** la meta de Inicio, Nutrición y Progreso coincide con lo que dice ELLIE («te faltan X vasos»). Con una cuenta sin `daily_water_goal`, nada inventa 14 vasos.
11. **Zonas:** Ejercicios → Brazos y Piernas: la lista carga de 30 en 30, sin repetidos. En debug, una sola línea `[perf] list_exercises` por página.
