import { ACTIVITY_TYPES } from './constants';
import { round2 } from './co2';

const fmt = (n) => round2(n).toFixed(2);
const qtyText = (n) => String(Number(round2(n).toFixed(2)));

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
      saved = quantity * (info.factor - ACTIVITY_TYPES.bus.factor);
      tip = `Car travel is your biggest source this week (${fmt(co2_kg)} kg). Taking the bus for those ${q} km would have saved ${fmt(saved)} kg.`;
      break;
    case 'bus':
      saved = co2_kg * 0.25;
      tip = `Bus travel is your biggest source this week (${fmt(co2_kg)} kg). Walking or cycling for a quarter of those ${q} km would have saved ${fmt(saved)} kg.`;
      break;
    case 'flight':
      saved = quantity * (info.factor - ACTIVITY_TYPES.bus.factor);
      tip = `Flying is your biggest source this week (${fmt(co2_kg)} kg). Covering those ${q} km by bus or train instead would have saved about ${fmt(saved)} kg.`;
      break;
    case 'electricity':
      saved = co2_kg * 0.2;
      tip = `Electricity is your biggest source this week (${fmt(co2_kg)} kg). Cutting usage by 20% of those ${q} kWh would have saved ${fmt(saved)} kg.`;
      break;
    case 'nonveg_meal':
      saved = quantity * (info.factor - ACTIVITY_TYPES.veg_meal.factor);
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
