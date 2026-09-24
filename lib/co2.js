import { ACTIVITY_TYPES } from './constants.js';

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// The one place CO2 is calculated (API route, live preview and nudge all use it).
// Rounds the quantity to 2 decimals, multiplies by the type's factor from
// constants.js, and rounds the result to 2 decimals.
export function calculateCo2(type, quantity) {
  const info = ACTIVITY_TYPES[type];
  if (!info) throw new Error(`Unknown activity type: ${type}`);
  return round2(round2(quantity) * info.factor);
}
