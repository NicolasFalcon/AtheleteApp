# Calorías con ELLIE · plan de implementación (v2.13)

Fecha: 2026-10-09 · Solo reconocimiento: sin código, sin dependencias nuevas, sin pedir nada al backend.
Fuente: `migration-source/ATHELETE Alive Minimalism/` (handoff §23, índice CAL_01 a CAL_22, `Calories.dc.html` / `CaloriesDark.dc.html`).

## 0. Inventario

- **Nuevos (v2.13):** CAL_01 a CAL_22. Todos "Capturado (v2.13)". Light y Dark: tienen las dos CAL_01, CAL_06 a CAL_22. CAL_02 a CAL_05 (Inicio → cámara, captura, permiso denegado, analizando) son **escena oscura en ambos modos**: una sola captura válida, como declara el índice.
- **Reemplaza:** NUTRI_01 a 03 (§23 "prevalece"); "Registrar nutrición" (NUTRI_03) queda retirada: hoy es `NutritionLogSheet`.
- **No hay copia anterior** (`~/athelete-design/v2.12/` no existe) y la carpeta está en `.gitignore`: no se puede diferenciar por archivo. Por el texto, las únicas marcas v2.13 del handoff son Calorías (§23 y las líneas de hojas, diálogos, Nutrición y estados) y las 17 capturas de Ruta ya completas. **No detecté ningún otro cambio** (si hubo alguno silencioso fuera de esas secciones, este método no lo ve).
- Fotos de comida: huecos para soltar imagen (`cal-*`); no existen en `images/`. Placeholder de foto: `#E6E1D8` / `#2A2622`.

## 1. Diseño frente a las decisiones de producto

| Decisión | Diseño | |
|---|---|---|
| Vive en Nutrición (contador, comidas por momento, historial) | §23.1 y 23.3 | ✅ |
| Inicio: el anillo de Nutrición abre la cámara | §23.7 regla 9, con transición de círculo (~0,36 s) y "Hoy llevas 1.240 kcal" | ✅ (añade la animación y el aviso) |
| ELLIE acepta una foto en el chat y la registra | CAL_19: tarjeta con "Añadir al día" y botón de foto en el composer | ✅ |
| Registro v1: foto (cámara o galería), Repetir, Kcal rápidas solo como salida | Foto y Repetir ✅. **Kcal rápidas sale como pill secundaria permanente** en Nutrición (§23.3 "Accesos secundarios: Repetir · Kcal rápidas"), además de ser la salida de los fallos | ⚠️ difiere |
| Corregir sin buscador: porción, quitar, escribir a ELLIE | CAL_06/07, stepper y "Dile algo a ELLIE" | ✅ |
| Meta: la del plan o estimada por perfil | CAL_22, nota "Meta estimada por tu perfil, sin plan activo." Ejemplo 2.600 kcal con 150/300/80 g | ✅ (ver pendiente 2) |
| ~10 análisis al día | "Has usado los 10 análisis de hoy"; aviso solo con ≤ 3 | ✅ |
| Fotos privadas, se borran al borrar la comida | Chip "Solo tú", diálogo CAL_16 lo dice | ✅ |
| Momento del día automático por la hora | Pills editables con nota "Según la hora (21:05)" | ✅ (cuatro momentos: Desayuno, Almuerzo, Cena, Snack) |
| Resultado marcado "estimación" | Regla 3 | ✅ |
| Puntos: se mantiene un `nutrition_logged` al día | **El diseño no dice nada de puntos** | ⚠️ sin definir |

Diferencias y huecos adicionales:
1. **Momentos del día:** el diseño usa Desayuno / Almuerzo / Cena / Snack; BT-32 proponía `desayuno | comida | cena | snack`. Fijar los valores (propongo `breakfast | lunch | dinner | snack`).
2. **Meta sin plan:** `genderModel.estimateBmr` da solo el metabolismo basal (Mifflin–St Jeor). El diseño necesita meta total y macros (150/300/80 con 2.600 kcal ≈ 23/46/27 %), y la actividad sale de `training_days_per_week`. Hay que añadir TDEE y reparto de macros (en la app, función pura con tests; el servidor no la necesita).
3. **Registrar nutrición actual** (kcal y macros a mano) desaparece: hay que decidir qué pasa con los registros ya existentes en `daily_nutrition_logs` sin comidas (se muestran como una "comida" de totales anteriores o solo en el contador).
4. **Cámara escena oscura y "Sin foto"** abren Kcal rápidas: coherente con la decisión.
5. El diseño añade una línea de ELLIE tras registrar (sin abrir el chat) y animaciones (athUp, pop en Repetir): UI, sin impacto de datos.

## 2. Qué se reutiliza de Nutrición

| Pieza | Estado |
|---|---|
| `nutritionModel` (totales del día, `ratio`, `formatThousands`, vasos de agua) | Se amplía con comidas por momento, restantes y adherencia ±10 % |
| `ArcGauge` | Reutilizable: el arco de 270° ya existe; ajustar a 280 pt, trazo 18 |
| `MacroColumn` | Reutilizable; añadir la variante "Proteína · prioridad" (ancha, relleno Ember) y las columnas de 120 pt |
| `NutritionPlanScreen` | Se reorganiza: contador, Registrar con foto, Repetir / Kcal rápidas, Comidas de hoy, agua, historial |
| `NutritionLogSheet` | Se **sustituye** por Kcal rápidas (solo kcal, sin macros) |
| `useNutritionDay` / `useNutritionPlan` | Se mantienen; `useNutritionDay` pasa a leer comidas |
| `EllieActionButton`, `LivingHalo` (pensando, 88 pt, 36 pt) | Reutilizables para el CTA, "Analizando" y la hoja de fallo |
| `image-picker` (ya instalado, v8) | Galería y "Otra foto" |
| Chat de ELLIE (`useEllieConversation`, `services/ellie/chat.ts`) | Hay que añadir mensajes con imagen y la tarjeta de resultado |
| Nuevo | Cámara en vivo con guía de encuadre; tarjeta del chat; historial de 7 barras; detalle y borrado |

## 3. Propuesta de backend (sin pedirlo aún)

**`nutrition_entries`** (BT-32 ampliado): `id, user_id, date, meal_type, name, calories, protein, carbs, fats, items jsonb ([{name, grams, calories, protein, carbs, fats, step, confidence}]), source ('photo'|'chat'|'repeat'|'quick'|'manual'), photo_path null, estimate bool, eaten_at timestamptz, created_at`. RLS por `user_id`; solo el dueño lee y escribe.
- `daily_nutrition_logs` se mantiene como **agregado** (trigger o RPC `log_nutrition_entry` / `delete_nutrition_entry`): Inicio y Progreso siguen leyendo lo mismo.
- RPC `get_nutrition_day(_date)` y `get_nutrition_history(_days)` (7 días, comidas del día seleccionado) para no hacer N consultas.
- Puntos: `award_gamification_event('nutrition_logged', reference = 'YYYY-MM-DD')` **una vez al día** (ya existe, 10 puntos, límite diario 1): lo dispara el servidor al insertar la primera comida del día (o lo envía la app, como hoy). Pendiente de decidir: ¿también por "Kcal rápidas"? Propongo sí, para no castigar la salida de emergencia.

**Edge Function `analyze-meal`** (BT-33 ampliado), mismo proveedor que `ellie-chat` si admite visión (confirmar con backend):
- Entrada: `{ image_path | image_base64, hint?: string (el "Dile algo a ELLIE"), previous?: items[], locale }`. Preferible subir antes la foto al bucket y mandar la ruta (menos peso, reintento barato).
- Salida: `{ status: 'identified'|'uncertain'|'not_food', items: [{ name, grams, step, calories, protein, carbs, fats, confidence, alternatives?: string[] }], total: {...}, meal_type_suggestion, remaining, message? }`. `uncertain` rellena `alternatives` ("¿Es quinoa o cuscús?").
- Límite diario: 10 por usuario y día (hora del servidor, renueva a las 00:00 de su zona); devuelve `remaining`. Cuenta solo análisis iniciados, no los reintentos tras error del servidor.
- Errores: `rate_limit` (429, con `resetAt`), `not_food`, `offline` (lo detecta la app), `provider_error` (5xx, no consume cupo). Recalcular con texto cuenta como un análisis (decisión pendiente; propongo que no).
- Reutiliza la lógica de cuota de BT-26 (`X-RateLimit-*`).

**Almacenamiento:** bucket privado `meal-photos`, ruta `{user_id}/{entry_id}.jpg`, solo el dueño (URL firmada), 5 MB, JPEG redimensionado a 1280 px en la app (quita EXIF y ubicación). Borrar la comida borra el archivo (trigger o la función de borrado); limpieza diaria de huérfanos de más de 24 h, como `social-photos`. Las fotos nunca pasan a Comunidad (regla 5): sin política de lectura para amigos.

**Chat de ELLIE con foto:** el mensaje lleva `attachments: [{type:'image', path}]`; `ellie-chat` llama a `analyze-meal` (o la propia función lo hace por herramienta) y responde con un bloque estructurado `meal_card` (resultado). "Añadir al día" llama a `log_nutrition_entry`. Persistir en `chat_messages` la ruta, no la imagen.

## 4. Simulador frente a iPhone

| Simulador (galería y datos) | Solo iPhone |
|---|---|
| Contador, comidas, historial, detalle y borrado, Repetir, Kcal rápidas, vacíos, sin plan | Cámara en vivo, guía de encuadre y detección de plato |
| Elegir foto de la galería, analizar (con la función real o un simulado), resultado, corrección, estados de fallo | Permiso de cámara (concedido, denegado, "Abrir Ajustes"), flash, rendimiento del arco y de las animaciones |
| Chat con foto desde la galería | Foto real con luz y encuadre reales; calidad del reconocimiento |
| Transición círculo Inicio → Cámara con una pantalla negra | Latencia real de subida con datos móviles |

## 5. Fases

1. **Modelo y lógica (sin backend):** `nutritionModel` por comidas y momentos, meta estimada (TDEE y macros), adherencia ±10 %, tests. Datos de ejemplo en dev.
2. **Nutrición rediseñada** (contador, macros con proteína, comidas, vacíos, sin plan, historial, detalle, borrar) sobre fixtures; Kcal rápidas y Repetir.
3. **Backend (lote único con Ruta):** `nutrition_entries`, RPC, bucket y `analyze-meal`.
4. **Registro con foto:** galería → analizando → resultado → corrección → añadir; estados de fallo; límite.
5. **Chat de ELLIE con foto** y línea de ELLIE tras registrar.
6. **Cámara en vivo** (iPhone) y transición desde Inicio; el anillo de Nutrición abre la cámara. Librería: pendiente de elegir (`react-native-vision-camera` v5, MIT; compatibilidad con RN 0.85 y New Architecture **no confirmada** en esta consulta, revisar su changelog antes de instalar).
7. **QA en iPhone** y retirada de `NutritionLogSheet`.

## 6. Decisiones pendientes

1. ¿Kcal rápidas como pill permanente (diseño) o solo salida de emergencia (decisión de producto)?
2. Puntos: ¿`nutrition_logged` también con Kcal rápidas y con Repetir?
3. Recalcular con texto: ¿consume cupo?
4. Valores de `meal_type` y qué hora corta cada momento (propongo desayuno < 11:00, almuerzo 11:00 a 16:59, cena 17:00 a 22:59, snack el resto o fuera de rango).
5. Qué hacer con los totales ya guardados sin comidas.
6. ¿Mismo proveedor de visión que `ellie-chat`? Si no admite imágenes, qué proveedor y quién guarda la clave.

## 7. Orden recomendado (con Ruta)

1. **Calorías primero:** casi todo se prueba en el simulador (galería), no depende de permisos de segundo plano y activa antes el valor del plan de ELLIE. Fases 1 y 2 del plan (modelo y UI sobre fixtures) pueden empezar **ya**, sin backend.
2. **Un solo lote a Lovable** cuando las dos UI estén listas con datos de ejemplo: `nutrition_entries` + RPC + bucket `meal-photos` + `analyze-meal` (Calorías) y `route_activities` + `planned_routes` + RPC con recorte + tipo `route` en `create_post` + `generate-route` (Ruta). Comparten: cuota diaria (BT-26, un patrón para `ellie-chat`, `analyze-meal` y `generate-route`), limpieza de huérfanos en buckets privados, eventos de gamificación (`nutrition_logged`, `workout_completed`) y el contexto de ELLIE.
3. **Ruta después:** necesita iPhone (segundo plano, GPS real) y decisiones de coste (mapas, rutas, ubicación). Se avanza en el simulador con GPX hasta donde llegue.
Detalle de Ruta: [`ROUTE_PLAN.md`](ROUTE_PLAN.md).
