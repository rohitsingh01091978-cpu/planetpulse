import { round2 } from './co2.js';
import { sharePercent } from './summary.js';
import { targetStatus } from './target.js';

// Applies a just-saved activity to the current summary so the dashboard and weekly target
// update instantly, before the server refetch lands. Uses the same maths as summarize().
// The nudge tip needs this week's per-type data, so it is cleared and filled by the refetch.
export function applyActivity(summary, activity) {
  if (!summary) return summary;
  const totalKg = round2(summary.total_kg + activity.co2_kg);

  const categories = summary.categories.map((c) => {
    const next =
      c.type === activity.type
        ? {
            ...c,
            count: c.count + 1,
            quantity: round2(c.quantity + activity.quantity),
            co2_kg: round2(c.co2_kg + activity.co2_kg),
          }
        : c;
    return { ...next, share_percent: sharePercent(next.co2_kg, totalKg) };
  });

  let week = summary.week;
  if (activity.activity_date >= week.start && activity.activity_date <= week.end) {
    const weekTotal = round2(week.total_kg + activity.co2_kg);
    week = {
      ...week,
      total_kg: weekTotal,
      ...targetStatus(weekTotal, week.target_kg, week.day_number),
      nudge: null,
    };
  }

  return { ...summary, total_kg: totalKg, entry_count: summary.entry_count + 1, categories, week };
}

// Same ordering the API uses: newest activity date first, then newest saved first.
export const byNewest = (a, b) =>
  a.activity_date === b.activity_date
    ? (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)
    : a.activity_date < b.activity_date
      ? 1
      : -1;

// Does this activity belong in a history list filtered by { type, from, to }?
export function matchesFilters(activity, filters) {
  if (filters.type !== 'all' && activity.type !== filters.type) return false;
  if (filters.from && activity.activity_date < filters.from) return false;
  if (filters.to && activity.activity_date > filters.to) return false;
  return true;
}
