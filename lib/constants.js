// Single source of truth for activity types, emission factors and sanity limits.
// factor: kg CO2 per unit. limit: quantities above this need user confirmation.
export const ACTIVITY_TYPES = {
  car: { label: 'Car', unit: 'km', factor: 0.2, limit: 2000 },
  bus: { label: 'Bus', unit: 'km', factor: 0.08, limit: 2000 },
  flight: { label: 'Flight', unit: 'km', factor: 0.25, limit: 20000 },
  electricity: { label: 'Electricity', unit: 'kWh', factor: 0.8, limit: 1000 },
  veg_meal: { label: 'Veg meal', unit: 'meals', factor: 0.5, limit: 10 },
  nonveg_meal: { label: 'Non-veg meal', unit: 'meals', factor: 2.0, limit: 10 },
};

export const TYPE_KEYS = Object.keys(ACTIVITY_TYPES);

// "meals" -> "meal" for "per meal" wording.
export const perUnit = (unit) => (unit === 'meals' ? 'meal' : unit);

// Hard ceiling so absurd values can never overflow the numeric column.
export const MAX_QUANTITY = 1000000;
