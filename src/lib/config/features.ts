// Feature flags: switch a feature off in the UI without removing its code.
export const FEATURES = {
  // Nutrición · Compras (the shopping list of get_nutrition_plan and of the
  // ELLIE plan proposal). Off for now: the data and its parsers stay; only
  // the UI is hidden until it is tuned.
  nutritionShopping: false,
} as const;
