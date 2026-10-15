# Paso 4 · Visión en la app

Contratos: `docs/backend/VISION_SHAPES.md` y `docs/backend/ELLIE_SHAPES.md` (únicas fuentes). Diseño: handoff §23 y §10. Estado al 15-10-2026: lotes 4a, 4b y 4c hechos; **sin probar en iPhone**. **Paso 4 cerrado** (a la espera de la prueba en dispositivo).

## Base común
- Librerías nuevas (exactas): `expo-camera` **56.0.8**, `expo-image-manipulator` **56.0.26** (pods ExpoCamera, ExpoCameraBarcodeScanning, ExpoImageManipulator; sin MLKit). La galería usa `react-native-image-picker` (ya estaba; PHPicker, sin permiso).
- `features/vision/imageUpload.ts`: compresión JPEG (lado largo ~1600 px, HEIC incluido; calidad 0,8→0,35 hasta <4,5 MB; error `ImageTooLargeError` si no cabe en 5 MB) y subida a `ellie-uploads`: `<uid>/meals/`, `<uid>/machines/`, `<uid>/` (chat).
- `services/vision/visionService.ts`: `analyzeMeal`, `scanMachine` (mismo `client_request_id` al reintentar), `chooseMachineCandidate`, parsers defensivos y `VisionError` con `usage`.
- `features/vision/visionCopy.ts`: textos v2 es/en para not_food, low_confidence, daily_image_limit, daily_machine_limit, vision_attempts_limit, rate_limited, ai_unavailable, offline, etc. Aviso de cupo bajo (≤3).
- Cámara (`v2/CameraCapture`) con explicación previa del permiso y estado denegado con «Abrir Ajustes»; `PhotoSourceSheet` (Cámara/Galería) para el chat.

## 4a · Calorías
- `get_nutrition_day` con `goal.source` plan/profile/none; foto → `ellie-vision` meal → borrador editable (`MealReviewScreen`) → `save_meal` source=photo **solo al confirmar**; Repetir (`get_recent_meals` → `repeat_meal`); Añadir a mano (`save_meal` source=manual); editar/borrar (`update_meal`/`delete_meal`) con UI optimista y vuelta atrás si falla.
- Ya no se escribe nada en `daily_nutrition_logs` (solo lectura). Eliminados `NutritionLogSheet`, los 8 componentes v1 de nutrición, `upsertTodayNutritionLog` y la mutación `saveTodayLog`.
- El anillo de Nutrición de Home y la notificación abren la cámara.
- Pantallas nuevas: `CaloriesCameraScreen`, `MealReviewScreen`, `MealDetailScreen`; `NutritionPlanScreen` reescrita.

## 4b · Foto en el chat
- Botón de foto en el compositor (Cámara/Galería) → sube a `<uid>/` → envía `image_path`; vista previa y foto en la burbuja.
- Tool `meal_analysis` → tarjeta con «Registrar en Calorías» → `save_meal` source=chat + `chat_message_id` + el mismo `image_path`. Si ya está registrada (se lee `nutrition_meals` por `chat_message_id`) la tarjeta lo dice y no se puede duplicar (`mealRegistrar`: en curso / hecha / reintento tras fallo).
- Un tipo de tool desconocido muestra solo `content`.

## 4c · Escaneo de máquina
- `MachineScanScreen` (ruta `MachineScan`): cámara/galería → subida a `<uid>/machines/` → `ellie-vision` machine con `client_request_id` generado **una vez por foto** (`createScanSession`; igual al reintentar, nuevo al cambiar de foto).
- Confiada: nombre del equipo, % de seguridad y lista de ejercicios que abre `ExerciseDetail` por `exercise_id`. Ambigua: hasta 3 candidatos → `choose_machine_candidate` → ejercicios (nombres desde la biblioteca de ejercicios de la app).
- Fallos: `low_confidence` (otra foto / elegir a mano → lista de ejercicios), cupo, red, etc.
- «Preguntar a ELLIE» abre el chat con «¿Cómo uso esta máquina?» (`source: machine_scan`), sin más datos.
- Entradas: tarjeta «Escanear máquina» de Entrenos › Ejercicios y de la portada de ELLIE.

## Tests
`visionUpload`, `visionService`, `mealDraft`, `mealCache`, `mealMutations` (optimista + rollback), `mealRegistrar` (no se registra dos veces), `machineScanModel` (resultado, candidatos, idempotencia), y ampliados `ellieService`, `ellieResultParsing`, `nutritionModel`.

## Diseño cubierto / pendiente
- Cubierto: CAL (cámara, analizando, resultado editable, fallos, Kcal rápidas, Repetir, detalle, vacío) y escáner §10.
- No hecho por falta de dato en el contrato: alternativas por ingrediente en baja confianza, marco Ember al detectar comida en vivo, línea de ELLIE tras registrar, transición circular desde Home, «N veces» en Repetir, músculos/configuración de la máquina, «Agregar a rutina».
