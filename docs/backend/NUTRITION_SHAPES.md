# NUTRITION_SHAPES · Nutrición v2 (backend)

Versión de contrato: `nut-1` · Lado: **backend (Lovable)** · La app se adapta después.
Fuente: rediseño de Nutrición (Hoy · Plan · Compras, suplementos, peso y código de barras), `ELLIE_CARDS_FLOW.md` §2 (plan nutricional) y las decisiones de producto de este documento.

**Regla general:** todas las cifras (kcal, macros, agua, recalibración) las calcula el **servidor** con una fórmula versionada. La IA nunca calcula objetivos, solo arma comidas que encajen en ellos.

## 0. Antes de cambiar nada: reporte de lo existente

Antes de tocar nada, Lovable reporta las tablas, RPC y Edge Functions actuales de:
- registro de comidas (foto, kcal rápidas), hidratación y planes de nutrición de ELLIE;
- objetivo de kcal mostrado hoy;
- datos del perfil (sexo, fecha de nacimiento, altura, peso, objetivo, días de entreno).

**Reglas:**
- Reutilizar y extender lo existente cuando encaje.
- No borrar nada que use la app actual.

## 1. Objetivos nutricionales · `compute_nutrition_targets`

```sql
compute_nutrition_targets(p_date date, p_tz text) returns jsonb   -- SECURITY DEFINER, auth.uid()
```

**Entradas** (desde el perfil y los registros):
- sexo (`hombre` | `mujer` | `otro`), edad, altura en cm;
- peso: el último registrado, o el del perfil si no hay ninguno;
- `% de grasa`, opcional;
- objetivo, días de entreno por semana y el tipo de día de `p_date` (entreno o descanso, según la semana planificada).

**Fórmula `formula_version = "nut-f1"`:**

1. **Metabolismo basal (BMR):**
   - Si hay `% de grasa`: Katch-McArdle, `370 + 21,6 × masa magra (kg)`.
   - Si no: Mifflin-St Jeor.
     - Hombre: `10 × peso + 6,25 × altura − 5 × edad + 5`.
     - Mujer: lo mismo con `− 161`.
     - Otro: lo mismo con `− 78`.
2. **Factor de actividad** según los días de entreno por semana:
   - 0–1 días: ×1,2
   - 2–3 días: ×1,375
   - 4–5 días: ×1,55
   - 6–7 días: ×1,725
3. **Ajuste por objetivo:**
   - Ganar músculo: +10 %
   - Perder grasa: −20 %
   - Mantener: 0 %
   - Rendimiento: +5 %
4. **Mínimo de seguridad:**
   - Valor: `max(BMR, 1.500 hombre · 1.200 mujer · 1.350 otro)`.
   - Si el objetivo queda por debajo, se sube a ese valor y se marca `safety_applied: true`.
   - **Menores de 18 años:** el ajuste por objetivo nunca es negativo (sin déficit) y se marca `minor_protection: true`.
5. **Proteína en g/kg:**
   - Valores: perder grasa 2,0 · ganar músculo 1,8 · rendimiento 1,7 · mantener 1,6.
   - Base del cálculo:
     - Si hay `% de grasa`, se calcula sobre la masa magra con +10 %.
     - Si el IMC es ≥ 30, sobre un peso ajustado: `peso ideal + 0,4 × (peso − peso ideal)`, con peso ideal = IMC 25.
6. **Grasas:** el 27 % de las kcal, y como mínimo `0,6 g/kg`.
7. **Carbohidratos:** el resto.
8. **Ajuste por entreno**, solo si el usuario lo activó (`adjust_by_training`):
   - Los días de entreno suben un +8 % de kcal, todo en carbohidratos.
   - Los días de descanso bajan lo justo para que el **total semanal no cambie**: `descanso = (total semanal − días_entreno × kcal_entreno) / días_descanso`.
   - Nunca se baja del mínimo de seguridad.
9. **Agua:**
   - `35 ml × peso`, más 500 ml en los días de entreno.
   - En vasos de 250 ml, redondeando hacia arriba.

**Respuesta:**

```jsonc
{ "ok": true, "formula_version": "nut-f1", "date": "2026-10-30", "day_type": "training",
  "source": "plan" | "profile_estimate",
  "kcal": 3117, "protein_g": 137, "carbs_g": 428, "fat_g": 94,
  "water": { "ml": 3160, "glasses": 13 },
  "calc": { "bmr": 1643, "bmr_method": "mifflin", "activity_factor": 1.725, "training_days": 6,
            "goal": "ganar_musculo", "goal_adjust_pct": 10, "safety_min": 1643, "safety_applied": false,
            "minor_protection": false },
  "training_adjust": { "enabled": false, "train_kcal": null, "rest_kcal": null } }
```

- Con un plan activo, `source = "plan"` y los objetivos salen de la semana del plan.
- Sin plan, los objetivos salen de esta fórmula.

## 2. Preferencias de alimentación

```sql
food_preferences (user_id pk, allergies text[], diet text, dislikes text, meals_per_day smallint, updated_at)
-- allergies: lactosa | gluten | frutos_secos | mariscos | otra   ([] = Ninguna)
-- diet: omnivora | vegetariana | vegana | sin_cerdo | otra
```

- `get_food_preferences()` → `{ ok, prefs | null }`. Si devuelve `null`, se muestra la tarjeta de preguntas.
- `set_food_preferences(p_allergies, p_diet, p_dislikes, p_meals_per_day)` → `{ ok }`.

## 3. Plan nutricional

```sql
nutrition_plans (
  id uuid pk, user_id uuid,
  status text check (status in ('draft','active','replaced','archived','discarded')),
  version smallint, proposal_id uuid,            -- ver ELLIE_PROPOSALS_SHAPES
  targets jsonb,                                 -- snapshot de compute_nutrition_targets (+ train/rest si aplica)
  adjust_by_training boolean,
  week jsonb,      -- [7] { weekday, type: train|rest, kcal, meals[] { slot, time, name, kcal, p, c, g, ingredients[] {name, qty, unit, allergens[]}, equivalents[] } }
  shopping jsonb,  -- [{ name, qty, unit }] calculada en servidor desde week
  activated_at timestamptz, created_at timestamptz
)
```

- **Un solo plan `active` por usuario,** con un índice parcial único.
- Los borradores (`draft`) los crea ELLIE (ver `ELLIE_PROPOSALS_SHAPES`).

### `activate_nutrition_plan(p_plan_id, p_edits jsonb, p_confirm_replace boolean)`

- **`p_edits`:** `[{ weekday, slot, equivalent_index }]`, que son los cambios hechos en la hoja, solo para ese día.
- **Validaciones:**
  - el plan es del usuario y es un `draft`;
  - cada día queda dentro de **±5 %** de sus kcal y con la proteína a **±10 %**;
  - ningún ingrediente contiene un alérgeno de `food_preferences.allergies`.
  - Si alguna falla, error `plan_invalid` con el detalle.
- **Si ya hay un plan activo y `p_confirm_replace = false`:** error `plan_active_exists`. La app pide confirmación y reintenta con `true`.
- **Al activar:**
  - el plan anterior pasa a `replaced`;
  - se aplican los `edits`;
  - se recalcula `shopping`;
  - se marca `activated_at`.
- **Respuesta:** `{ ok, plan_id }`.

### `get_nutrition_plan(p_week_start date, p_tz)`

Devuelve el plan activo: semana, objetivos por día, `shopping`, y qué comidas se registraron desde el plan.

### `swap_plan_meal(p_plan_id, p_weekday, p_slot, p_equivalent_index)`

Cambia una comida del plan activo en la pestaña Plan, solo para ese día. Recalcula `shopping`.

## 4. Día de nutrición (pantalla Hoy)

### `get_nutrition_day(p_date, p_tz)`

```jsonc
{ "ok": true, "date": "…", "day_type": "training",
  "targets": { …compute_nutrition_targets… },
  "consumed": { "kcal": 1240, "p": 91, "c": 116, "g": 45 },
  "remaining": { "kcal": 1877, "p": 46, "c": 312, "g": 49 },     // negativo = se pasó
  "moments": [ { "slot": "desayuno", "kcal": 520,
                 "entries": [ { "id", "name", "kcal", "p", "c", "g", "time", "source": "foto|texto|codigo|plan|reciente|kcal_rapidas", "photo_url?" } ],
                 "planned": { "name", "kcal", "p", "c", "g", "logged": false } | null,
                 "tag": "pre_entreno" | "post_entreno" | null } ],
  "water": { "glasses": 6, "target": 13, "ml": 1500 },
  "supplements": { …ver §6… },
  "plan": { "active": true, "week_number": 1 } }
```

- **Etiqueta pre/post entreno:** según la hora de la sesión planificada de ese día.
  - El momento anterior más cercano lleva `pre_entreno`.
  - El posterior más cercano lleva `post_entreno`.

### Registro de comidas (reutiliza lo existente y lo amplía)

- `log_meal_entry(p_date, p_slot, p_items jsonb, p_source, p_client_id)`:
  - `p_items` = `[{ name, grams?, kcal, p, c, g, product_barcode? }]`.
  - Es idempotente por `p_client_id`.
- `log_planned_meal(p_date, p_slot)` → registra la comida del plan con un toque ("Lo comí").
- `update_meal_entry`, `delete_meal_entry`: para el swipe de editar y eliminar.
- `get_recent_and_favorite_foods()` → recientes (las últimas 20 distintas) y favoritos.
- `toggle_favorite_food(p_entry_id | p_item)`.

**Edge Function `parse-meal-text`:**
- Recibe un texto ("2 huevos y una arepa con queso") y devuelve `items[]` con porciones y macros **estimados**, marcados `estimate: true`. No guarda nada: la app confirma y llama a `log_meal_entry`.
- Usa el modelo rápido, con un timeout de 15 s y reembolso de la cuota en `ai_timeout`, igual que la visión.

## 5. Peso y recalibración

```sql
weight_logs (id, user_id, kg numeric(5,2), body_fat_pct numeric(4,1), measured_at timestamptz, source text check (source in ('manual','apple_health')), client_id text unique)
nutrition_recalibrations (id, user_id, created_at, period_start, period_end, observed_rate_kg_wk, target_rate_kg_wk, current_kcal, proposed_kcal, status text check (status in ('pending','applied','kept','expired')))
```

- `log_weight(p_kg, p_body_fat_pct, p_measured_at, p_source, p_client_id)` → `{ ok }`.
- `get_weight_trend(p_weeks int default 4)`:
  - Devuelve los puntos de peso y una tendencia suavizada (EMA, α = 0,25).
  - Incluye `rate_kg_wk` (el ritmo observado) y `target_rate_kg_wk`, según el objetivo:
    - ganar músculo: +0,25;
    - perder grasa: −0,5 % del peso corporal por semana;
    - mantener: 0;
    - rendimiento: 0.
  - Incluye `last_weight` y `days_since_last`.

**Recalibración (job semanal, o perezosa al llamar a `get_nutrition_plan`):**
- **Requisito:** al menos 4 registros de peso en los últimos 14 días. Si no se cumple, no se propone nada.
- **Cálculo:** si el ritmo observado se desvía más de 0,15 kg/semana del objetivo, se propone un ajuste de ±100 a 200 kcal, como máximo el ±10 %. Nunca baja del mínimo de seguridad.
- Se crea una recalibración `pending`, y la tarjeta de la app muestra el texto que corresponda: "Subiste 0,1 kg/sem (objetivo 0,25). Ajustamos a 2.750 kcal (+150)."
- `respond_recalibration(p_id, p_action 'apply'|'keep')`:
  - `apply` actualiza los objetivos del plan activo (o un `kcal_offset` del perfil si no hay plan);
  - `keep` la descarta.
- Las recalibraciones pendientes caducan a los 7 días.

## 6. Suplementos

```sql
user_supplements (id, user_id, name, type text check (type in ('vitamina','mineral','creatina','omega','proteina','otro')),
                  dose text, moments text[],        -- manana | tarde | noche
                  reminder_times jsonb,             -- { "manana": "08:00", ... } hora local
                  remind boolean, counts_as_meal boolean, kcal int, p numeric, c numeric, g numeric,
                  active boolean, created_at)
supplement_logs (id, user_id, supplement_id, local_date date, moment text, taken_at timestamptz, source text check (source in ('app','notification')), client_id text unique)
```

**RPC:**
- `upsert_supplement(...)`, `delete_supplement(id)` y `list_supplements()`.
- `get_supplements_day(p_date, p_tz)`:
  - por momento, cada suplemento con su estado: `taken` (con hora), `pending` o `upcoming`;
  - un resumen "2 de 4";
  - la adherencia de 7 días: `{ days_complete: 6, days: 7 }`.
- `mark_supplement(p_supplement_id, p_date, p_moment, p_taken boolean, p_source, p_client_id)`:
  - Si `counts_as_meal` y se marca, también registra la comida en `snacks` con sus macros. Si se desmarca, la elimina.

**Recordatorios (con el `push_outbox` existente):**
- Hay un push por cada momento y hora local, solo con `remind = true`. Agrupa los suplementos de ese momento: "Mañana · Multivitamínico y Omega 3".
- Respeta las horas de silencio.
- No se envía si todos los suplementos de ese momento ya están marcados.
- Usa la categoría de notificación `SUPPLEMENT_REMINDER`, con las acciones `TAKEN` ("Tomado") y `SNOOZE_30` ("Recordar en 30 min").
  - El payload lleva `supplement_ids`, `local_date` y `moment`.
  - `TAKEN` llama a `mark_supplement` con `source = 'notification'`.
  - `SNOOZE_30` reprograma el push 30 min después, una sola vez.

**Regla para ELLIE:** registra y comenta la adherencia, pero **no recomienda suplementos ni dosis**.

## 7. Código de barras (Open Food Facts + caché propia)

```sql
food_products (barcode text pk, name text, brand text, image_url text,
               per100 jsonb,              -- { kcal, p, c, g }
               serving jsonb,             -- { label: "1 barra (40 g)", grams: 40 } | null
               source text check (source in ('off','label_photo','manual')),
               verified boolean default false, created_by uuid, created_at, updated_at)
```

- `lookup_barcode(p_barcode)` → `{ ok, product | null }`, solo desde la caché.
- `upsert_food_product(p_barcode, p_name, p_brand, p_image_url, p_per100, p_serving, p_source)`:
  - La app la llama tras consultar Open Food Facts **desde el dispositivo**: así cada usuario usa su propia IP, que tiene un límite de 15 lecturas por minuto, y se identifica con el User-Agent `ATHELETE/1.0 (contacto)`.
  - Valida que los valores sean plausibles: `kcal ≈ 4p + 4c + 9g` con ±20 %, y todos los valores entre 0 y 900 kcal por 100 g. Si fallan, error `implausible_values`.
  - Un producto de `source = 'off'` no se sobrescribe con uno de `manual` salvo que el existente no tenga `per100`.
- **Edge Function `parse-nutrition-label`:**
  - Recibe una foto de la tabla nutricional (base64, 1024 px, como la visión actual) y devuelve `per100`, la porción y el nombre si aparece.
  - No guarda nada: la app confirma y llama a `upsert_food_product` con `source = 'label_photo'`.
- **Atribución:** la app muestra "Datos de Open Food Facts" en los productos `source = 'off'` (licencia ODbL).

## 8. Integración con ELLIE (ctx-1)

`get_athlete_context`:
- toma `today.nutrition` de `get_nutrition_day`, con `target_source = plan | profile_estimate`;
- añade `today.supplements` (tomados y pendientes por momento) y `profile.weight_trend` (`rate_kg_wk` y `days_since_last`);
- `plans.nutrition` = `{ id, week_number, adjust_by_training }`;
- incluye las `food_preferences`.

## 9. Escenarios de verificación

1. **Perfil de ejemplo** (hombre, 76 kg, 170 cm, 37 años, 6 días, ganar músculo): BMR 1.643, factor 1,725 y 3.117 kcal.
2. **Mujer, perder grasa, objetivo por debajo del mínimo:** `safety_applied = true` y kcal = mínimo.
3. **Menor de 18 con perder grasa:** el ajuste queda en 0 y `minor_protection = true`.
4. **Ajuste por entreno con 3 días de entreno y 4 de descanso:** la suma semanal es igual que sin ajuste (±7 kcal de redondeo).
5. **Activar un plan con un alérgeno marcado:** error `plan_invalid`.
6. **Activar con otro plan activo** sin confirmar da `plan_active_exists`; con confirmación, el anterior queda `replaced`.
7. **"Lo comí":** registra la comida planificada, y `get_nutrition_day` la muestra como `logged`.
8. **4 pesos en 14 días con desviación > 0,15 kg/sem:** se crea una recalibración `pending`; `apply` cambia las kcal.
9. **Suplemento con `counts_as_meal`:** al marcarlo aparece en Snacks y suma al anillo; al desmarcarlo se quita.
10. **Push de suplementos:** no se envía si el momento ya está completo; `TAKEN` lo marca con `source = notification`.
11. **`upsert_food_product` con valores imposibles:** error `implausible_values`.
12. **Zona horaria:** un registro a las 23:50 en Santiago cuenta para ese día.

## 10. Entregables de Lovable

1. El reporte del §0 y qué se reutilizó.
2. Las tablas creadas o modificadas, con su RLS. Como siempre, las escrituras van solo por RPC.
3. La firma final de cada RPC y Edge Function, con un JSON real de `compute_nutrition_targets` y de `get_nutrition_day` para la cuenta de prueba.
4. El resultado de los escenarios 1 a 12.
