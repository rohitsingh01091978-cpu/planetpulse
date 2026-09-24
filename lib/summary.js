import { ACTIVITY_TYPES, TYPE_KEYS } from './constants.js';
import { round2 } from './co2.js';
import { buildNudge } from './nudge.js';
import { targetStatus } from './target.js';
import { getWeekInfo } from './week.js';

const PAGE = 1000; // PostgREST returns at most 1000 rows per request

async function fetchAllActivities(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('activities')
      .select('type, quantity, co2_kg, activity_date')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

function emptyTotals() {
  return Object.fromEntries(TYPE_KEYS.map((t) => [t, { count: 0, quantity: 0, co2_kg: 0 }]));
}

function roundTotals(totals) {
  for (const t of TYPE_KEYS) {
    totals[t].quantity = round2(totals[t].quantity);
    totals[t].co2_kg = round2(totals[t].co2_kg);
  }
}

// Everything the dashboard and weekly-target cards need, in one call.
export async function buildSummary(supabase) {
  const [rows, settingsRes] = await Promise.all([
    fetchAllActivities(supabase),
    supabase.from('settings').select('weekly_target_kg').eq('id', 1).maybeSingle(),
  ]);
  if (settingsRes.error) throw settingsRes.error;

  const target = settingsRes.data?.weekly_target_kg;
  const targetKg = target == null ? null : Number(target);
  const week = getWeekInfo();

  const all = emptyTotals();
  const thisWeek = emptyTotals();
  for (const r of rows) {
    const bucket = all[r.type];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.quantity += Number(r.quantity);
    bucket.co2_kg += Number(r.co2_kg);
    if (r.activity_date >= week.start && r.activity_date <= week.end) {
      const w = thisWeek[r.type];
      w.count += 1;
      w.quantity += Number(r.quantity);
      w.co2_kg += Number(r.co2_kg);
    }
  }
  roundTotals(all);
  roundTotals(thisWeek);

  const totalKg = round2(TYPE_KEYS.reduce((s, t) => s + all[t].co2_kg, 0));
  const categories = TYPE_KEYS.map((t) => ({
    type: t,
    label: ACTIVITY_TYPES[t].label,
    unit: ACTIVITY_TYPES[t].unit,
    ...all[t],
    share_percent: totalKg > 0 ? Math.round((all[t].co2_kg / totalKg) * 1000) / 10 : 0,
  }));

  const weekTotal = round2(TYPE_KEYS.reduce((s, t) => s + thisWeek[t].co2_kg, 0));
  const status = targetStatus(weekTotal, targetKg, week.dayNumber);

  return {
    total_kg: totalKg,
    entry_count: rows.length,
    categories,
    week: {
      start: week.start,
      end: week.end,
      today: week.today,
      day_name: week.dayName,
      day_number: week.dayNumber,
      total_kg: weekTotal,
      ...status,
      nudge: status.exceeded ? buildNudge(thisWeek) : null,
    },
  };
}
