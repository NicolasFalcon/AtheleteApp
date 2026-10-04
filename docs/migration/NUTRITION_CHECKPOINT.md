# NUTRITION_CHECKPOINT · Nutrición (módulo autónomo, 2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). Sin escrituras de prueba en la base: las escrituras reales solo se validan con tsc; el QA real lo hace el usuario. Sin commits.

## Plan de bloques
- A · Recon (este documento).
- B · Hoy: indicador de 270° (kcal), tres columnas de macros, depósito de agua, tarjeta "Ajustar con ELLIE", CTA Registrar comida; estado sin plan.
- C · Plan: el plan activo (objetivos de kcal y macros) y el acceso a ELLIE con su prompt (crear / ajustar).
- D · Registrar comida (NUTRI_03): hoja con atajos +250/+500/+750, calorías, macros ± con guardando/error. Escaneo → placeholder.
- E · Hidratación: +1 vaso con respuesta inmediata (optimista), objetivo diario y medallas (hydration_logged ya evaluado en cada llamada).
- F · Conexiones: modelo único de totales para Nutrición, Inicio (anillos) y Progreso (proteína, hidratación).
- G · Estados y cierre.

## A · Recon
Referencias: NUTRI_01_NO_PLAN, NUTRI_02_PLAN, NUTRI_03_LOG_SHEET (Light/Dark) y `Nutrition.dc.html` + hoja en `Overlays.dc.html`. No hay referencias de estado cargando/error de Nutrición: se usan los patrones STATE_0x. El diseño **no** tiene lista de comidas, búsqueda de alimentos ni detalle del plan: el "registro" es el total del día (kcal + macros), igual que el backend (`daily_nutrition_logs`, una fila por usuario y día).

Código actual: `screens/nutrition/NutritionPlanScreen.tsx` (v1, ruta `NutritionPlan` con param `openLog`), `hooks/useNutritionPlan.ts` (plan activo + log de hoy, `saveTodayLog`, `deactivatePlan`), `services/supabase/nutrition.ts` (`fetchNutritionPlanScreenData`, `upsertTodayNutritionLog` con `nutrition_logged` por día), hidratación en `fitness.ts` (`addHydrationAmount` + `hydration_logged` en cada llamada) y `hooks/useHomeFeed.ts`; Inicio usa `buildDayRings` (homePriority) y el `NutritionLogModal` v1; Progreso usa `buildNutritionWeek` / `buildHydrationWeek` (progressModel). ELLIE activa planes con `saveEllieNutritionPlan` (`nutrition_plans`, `is_active`).

Mapeo dato → fuente
| Diseño | Fuente |
|---|---|
| Subtítulo "Hoy · ganar músculo" | `profile.goal` |
| kcal consumidas / objetivo | `daily_nutrition_logs.calories` de hoy / `nutrition_plans.target_calories` (plan activo) |
| Macros (proteína, carbos, grasas) | `protein`, `carbs`, `fats` de hoy / `target_protein`, `target_carbs`, `target_fats` |
| Vasos y litros | `daily_hydration_logs.water_ml` de hoy (÷ 250), meta `profile.dailyWaterGoal` (vasos de 250 ml, 14 por defecto) |
| "Te faltan 76 g de proteína…" | calculado del plan y el log de hoy |
| Crear / Ajustar con ELLIE | `ELLIE_ASKS.nutritionPlan` / nuevo prompt de ajuste (`EllieChat`) |
| Registrar nutrición | `upsertTodayNutritionLog` (totales nuevos = actuales + incrementos), adherencia como en v1 |
| Escáner de comida | módulo Scan: placeholder |

## Hecho
- Bloque A (recon).
- Modelo `features/nutrition/nutritionModel.ts` (+9 tests) como fuente única de totales; `homePriority` lo reexporta/usa (vasos, miles, progreso de kcal).
- Primitivos `ArcGauge`, `MacroColumn`, `WaterTank` (+ `GlassHeader.subtitle`); `NutritionLogSheet`; `useNutritionDay`, `useHydration` (optimista y encolado), `fetchTodayWaterMl`; `NutritionPlanScreen` v2; Inicio usa `useHydration` y abre Nutrición con la hoja (`openLog`) en lugar del modal v1; dev kit (menú + deep link).

- Capturas Light/Dark: sin plan, con plan, objetivos cumplidos, sin registros, error y hoja de registro vs NUTRI_01/02/03.
- BT-32 a BT-34 y sección 25 de MIGRATION_PROGRESS.

## COMPLETADO
