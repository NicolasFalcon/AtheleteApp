// Feature flags: switch a feature off in the UI without removing its code.
export const FEATURES = {
  // Nutrición · Compras (the shopping list of get_nutrition_plan and of the
  // ELLIE plan proposal). Off for now: the data and its parsers stay; only
  // the UI is hidden until it is tuned.
  nutritionShopping: false,
  // Plan de entrenamiento · Versión gratis (31.12). Off: designed but not
  // active. On (or entitlement.multi_week false in the plan's state): Mes and
  // Plan carry a lock and open the Premium card; Crear plan opens the
  // Premium sheet. "Probar Premium" does nothing yet (TODO: subscription).
  trainingPlanPaywall: false,
} as const;
