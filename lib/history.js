import { ACTIVITY_TYPES } from './constants.js';
import { formatDate } from './week.js';

// True when both dates are set and "From" is after "To" (nothing can match).
export const isRangeInvalid = (filters) => !!(filters.from && filters.to && filters.from > filters.to);

// The filters that are currently switched on, as chips: [{ key, label }].
export function activeFilters(filters) {
  const chips = [];
  if (filters.type !== 'all' && ACTIVITY_TYPES[filters.type]) {
    chips.push({ key: 'type', label: `Type: ${ACTIVITY_TYPES[filters.type].label}` });
  }
  if (filters.from) chips.push({ key: 'from', label: `From: ${formatDate(filters.from)}` });
  if (filters.to) chips.push({ key: 'to', label: `To: ${formatDate(filters.to)}` });
  return chips;
}

// Count and total CO2 of the rows on screen. Summed in whole cents so it is exact.
export function summarizeRows(activities) {
  const cents = activities.reduce((sum, a) => sum + Math.round(a.co2_kg * 100), 0);
  return { count: activities.length, total_kg: cents / 100 };
}
