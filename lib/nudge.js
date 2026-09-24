import { ACTIVITY_TYPES } from './constants.js';
import { calculateCo2, round2 } from './co2.js';

// Nudge assumptions (shares of usage, not emission factors).
const CYCLE_OR_WALK_SHARE = 0.25; // replace a quarter of bus km with walking/cycling
const ELECTRICITY_CUT_SHARE = 0.2; // cut electricity use by 20%

const fmt = (n) => round2(n).toFixed(2);
const qtyText = (n) => String(Number(round2(n).toFixed(2)));

// kg saved by doing the same quantity as `toType` instead of `fromType`.
const savedBySwitching = (fromType, toType, quantity) =>
  calculateCo2(fromType, quantity) - calculateCo2(toType, quantity);

// Builds the DP1 nudge from this week's per-type totals: finds the biggest source
// and suggests a concrete swap with the kg it would have saved.
export function buildNudge(byType) {
  const entries = Object.entries(byType).filter(([, v]) => v.co2_kg > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1].co2_kg - a[1].co2_kg);

  const [type, { quantity, co2_kg }] = entries[0];
  const info = ACTIVITY_TYPES[type];
  const q = qtyText(quantity);
  let saved = 0;
  let tip;

  switch (type) {
    case 'car':
      saved = savedBySwitching('car', 'bus', quantity);
      tip = `Car travel is your biggest source this week (${fmt(co2_kg)} kg). Taking the bus for those ${q} km would have saved ${fmt(saved)} kg.`;
      break;
    case 'bus':
      saved = co2_kg * CYCLE_OR_WALK_SHARE;
      tip = `Bus travel is your biggest source this week (${fmt(co2_kg)} kg). Walking or cycling for a quarter of those ${q} km would have saved ${fmt(saved)} kg.`;
      break;
    case 'flight':
      saved = savedBySwitching('flight', 'bus', quantity);
      tip = `Flying is your biggest source this week (${fmt(co2_kg)} kg). Covering those ${q} km by bus or train instead would have saved about ${fmt(saved)} kg.`;
      break;
    case 'electricity':
      saved = co2_kg * ELECTRICITY_CUT_SHARE;
      tip = `Electricity is your biggest source this week (${fmt(co2_kg)} kg). Cutting usage by 20% of those ${q} kWh would have saved ${fmt(saved)} kg.`;
      break;
    case 'nonveg_meal':
      saved = savedBySwitching('nonveg_meal', 'veg_meal', quantity);
      tip = `Non-veg meals are your biggest source this week (${fmt(co2_kg)} kg). Swapping those ${q} meals for veg ones would have saved ${fmt(saved)} kg.`;
      break;
    default:
      tip = `Veg meals are your biggest source this week (${fmt(co2_kg)} kg), and that is already the lowest-carbon food choice. Your target may be very tight; check travel and electricity next.`;
  }

  return {
    type,
    label: info.label,
    quantity: Number(qtyText(quantity)),
    unit: info.unit,
    co2_kg: round2(co2_kg),
    saved_kg: round2(saved),
    tip,
  };
}
