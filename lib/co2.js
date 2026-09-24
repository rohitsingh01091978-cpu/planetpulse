import { ACTIVITY_TYPES } from './constants';

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Server-side CO2 calculation, rounded to 2 decimals.
export function calculateCo2(type, quantity) {
  const info = ACTIVITY_TYPES[type];
  if (!info) throw new Error(`Unknown activity type: ${type}`);
  return round2(quantity * info.factor);
}
