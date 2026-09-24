// Run with: npm test
// Pure-logic checks: emission factors, CO2 calculation, units, IST week and nudge.
import { ACTIVITY_TYPES, TYPE_KEYS } from '../lib/constants.js';
import { calculateCo2 } from '../lib/co2.js';
import { buildNudge } from '../lib/nudge.js';
import { targetStatus } from '../lib/target.js';
import { getWeekInfo, projectWeekTotal, todayIST, formatDate } from '../lib/week.js';
import { validateActivity, validateDate, validateQuantity } from '../lib/validate.js';
import { applyActivity, byNewest, matchesFilters } from '../lib/optimistic.js';
import { summarize } from '../lib/summary.js';
import { spawnSync } from 'node:child_process';
import { CATEGORY_GROUPS, groupTotals } from '../lib/groups.js';
import { targetState } from '../lib/target.js';
import { validateTarget } from '../lib/validate.js';
import { addToWeek, weekTotals } from '../lib/optimistic.js';
import { activeFilters, isRangeInvalid, summarizeRows } from '../lib/history.js';

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${actual}, expected ${expected})`}`);
}

console.log('--- Emission factors and units (central file)');
const spec = {
  car: [0.2, 'km'],
  bus: [0.08, 'km'],
  flight: [0.25, 'km'],
  electricity: [0.8, 'kWh'],
  veg_meal: [0.5, 'meals'],
  nonveg_meal: [2.0, 'meals'],
};
check('exactly 6 types', TYPE_KEYS.length, 6);
for (const [type, [factor, unit]] of Object.entries(spec)) {
  check(`${type} factor`, ACTIVITY_TYPES[type].factor, factor);
  check(`${type} unit`, ACTIVITY_TYPES[type].unit, unit);
}

console.log('--- CO2 calculation (calculateCo2)');
check('car 10 km = 2.00', calculateCo2('car', 10), 2);
check('bus 10 km = 0.80', calculateCo2('bus', 10), 0.8);
check('flight 10 km = 2.50', calculateCo2('flight', 10), 2.5);
check('electricity 10 kWh = 8.00', calculateCo2('electricity', 10), 8);
check('veg meal 2 = 1.00', calculateCo2('veg_meal', 2), 1);
check('non-veg meal 2 = 4.00', calculateCo2('nonveg_meal', 2), 4);
check('decimal: car 2.5 km = 0.50', calculateCo2('car', 2.5), 0.5);
check('decimal: electricity 3.5 kWh = 2.80', calculateCo2('electricity', 3.5), 2.8);
check('result rounded: bus 1.23 km = 0.10', calculateCo2('bus', 1.23), 0.1);
check('result rounded: car 0.07 km = 0.01', calculateCo2('car', 0.07), 0.01);
check('quantity rounded first: car 2.504 km = 0.50', calculateCo2('car', 2.504), 0.5);
check('quantity rounded first: car 0.004 km = 0.00', calculateCo2('car', 0.004), 0);
let threw = false;
try {
  calculateCo2('boat', 5);
} catch {
  threw = true;
}
check('unknown type throws', threw, true);

console.log('--- IST week (Monday to Sunday)');
const at = (iso) => getWeekInfo(Date.parse(iso));
check('Thu 24 Sep 2026: day name', at('2026-09-24T07:00:00Z').dayName, 'Thursday');
check('Thu 24 Sep 2026: day number', at('2026-09-24T07:00:00Z').dayNumber, 4);
check('week starts Monday', at('2026-09-24T07:00:00Z').start, '2026-09-21');
check('week ends Sunday', at('2026-09-24T07:00:00Z').end, '2026-09-27');
check('Sun 23:59 IST is still Sunday', at('2026-09-27T18:29:00Z').dayName, 'Sunday');
check('Mon 00:00 IST starts a new week', at('2026-09-27T18:30:00Z').start, '2026-09-28');
check('todayIST rolls over at 18:30 UTC', todayIST(Date.parse('2026-09-24T20:00:00Z')), '2026-09-25');
check('projection: 30 kg on day 3 -> 70', projectWeekTotal(30, 3), 70);

console.log('--- Weekly target status');
check('exceeded when over', targetStatus(120, 100, 4).exceeded, true);
check('not exceeded when equal', targetStatus(100, 100, 4).exceeded, false);
check('exceeded by 20', targetStatus(120, 100, 4).exceeded_by_kg, 20);
check('percent 68.5', targetStatus(547.6, 800, 4).percent, 68.5);
check('no target: not exceeded', targetStatus(50, null, 4).exceeded, false);
check('no target: percent null', targetStatus(50, null, 4).percent, null);
check('projected exceeds flag', targetStatus(50, 100, 3).projected_exceeds, true);

console.log('--- Nudge');
const nudge = buildNudge({
  car: { quantity: 120, co2_kg: 24 },
  bus: { quantity: 10, co2_kg: 0.8 },
  nonveg_meal: { quantity: 5, co2_kg: 10 },
});
check('biggest source is car', nudge.type, 'car');
check('car nudge: bus would save 14.40 kg', nudge.saved_kg, 14.4);
check('no nudge when nothing logged', buildNudge({ car: { quantity: 0, co2_kg: 0 } }), null);

console.log('--- Form validation messages (friendly, client-side pre-checks)');
const has = (msg, part) => typeof msg === 'string' && msg.includes(part);
check('empty -> asks for a quantity', validateQuantity('', { type: 'car' }), 'Please enter a quantity.');
check('spaces only -> asks for a quantity', validateQuantity('   ', { type: 'car' }), 'Please enter a quantity.');
check('zero -> must be greater than zero', validateQuantity('0', { type: 'car' }), 'Quantity must be greater than zero.');
check("negative -> can't be negative", has(validateQuantity('-5', { type: 'car' }), "can't be negative"), true);
check('non-numeric text -> not a number', has(validateQuantity('abc', { type: 'car' }), "doesn't look like a number"), true);
check('browser badInput -> not a number', has(validateQuantity('', { type: 'car', badInput: true }), "doesn't look like a number"), true);
check('Infinity -> not a number', has(validateQuantity('Infinity', { type: 'car' }), "doesn't look like a number"), true);
check('decimal 2.5 accepted', validateQuantity('2.5', { type: 'car' }), null);
check('smallest 0.01 accepted', validateQuantity('0.01', { type: 'car' }), null);
check('0.004 -> too small', has(validateQuantity('0.004', { type: 'car' }), 'too small'), true);
check('absurd 5000 km is NOT blocked here (server asks to confirm)', validateQuantity('5000', { type: 'car' }), null);
check('over hard cap -> too large, names the unit', has(validateQuantity('1000001', { type: 'electricity' }), 'kWh'), true);
check('empty date', validateDate(''), 'Please choose a date.');
check('impossible date', has(validateDate('2026-02-30', '2026-09-24'), "isn't valid"), true);
check('future date rejected', has(validateDate('2026-09-25', '2026-09-24'), 'in the future'), true);
check('today accepted', validateDate('2026-09-24', '2026-09-24'), null);
check('past date accepted', validateDate('2026-01-01', '2026-09-24'), null);
check('invalid activity type', validateActivity({ type: 'boat', quantity: '5', date: '2026-09-24' }, '2026-09-24')?.field, 'type');
check('quantity problem reported before date problem', validateActivity({ type: 'car', quantity: '', date: '' }, '2026-09-24')?.field, 'quantity');
check('valid input -> no problem', validateActivity({ type: 'bus', quantity: '25', date: '2026-09-24' }, '2026-09-24'), null);

console.log('--- Instant dashboard update equals the server summary');
const stable = (o) =>
  JSON.stringify(o, (k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v
  );
const wk = getWeekInfo(Date.parse('2026-09-24T07:00:00Z'));
const mk = (type, quantity, activity_date) => ({ type, quantity, co2_kg: calculateCo2(type, quantity), activity_date });
const baseRows = [mk('car', 10, '2026-09-21'), mk('bus', 8, '2026-09-24'), mk('flight', 105, '2026-09-20'), mk('veg_meal', 3, '2026-09-22')];
const newOnes = [
  mk('car', 2.5, '2026-09-24'),
  mk('electricity', 3.75, '2026-09-23'),
  mk('nonveg_meal', 2, '2026-09-10'),
  mk('flight', 10, '2026-09-27'),
  mk('bus', 0.01, '2026-09-24'),
];
let equalCount = 0;
let total = 0;
for (const target of [null, 5, 100]) {
  for (const rows of [[], baseRows]) {
    for (const a of newOnes) {
      const fast = applyActivity(summarize(rows, target, wk), a);
      const server = summarize([...rows, a], target, wk);
      fast.week.nudge = null; // the tip is filled in by the server refetch
      server.week.nudge = null;
      total++;
      if (stable(fast) === stable(server)) equalCount++;
    }
  }
}
check('applyActivity == summarize(rows + activity) in ' + total + ' cases', equalCount, total);
const twice = applyActivity(applyActivity(summarize(baseRows, 100, wk), newOnes[0]), newOnes[1]);
const twiceServer = summarize([...baseRows, newOnes[0], newOnes[1]], 100, wk);
twice.week.nudge = null;
twiceServer.week.nudge = null;
check('two activities in a row stay consistent', stable(twice), stable(twiceServer));
const untouched = summarize(baseRows, 100, wk);
applyActivity(untouched, newOnes[0]);
check('applyActivity does not mutate the old summary', untouched.entry_count, 4);

console.log('--- History ordering and filter matching');
const h = (id, date, created) => ({ id, activity_date: date, created_at: created, type: 'car' });
const ordered = [
  h('old', '2026-09-10', '2026-09-24T10:00:00+00:00'),
  h('b', '2026-09-24', '2026-09-24T09:00:00+00:00'),
  h('a', '2026-09-24', '2026-09-24T09:30:00+00:00'),
  h('mid', '2026-09-20', '2026-09-24T11:00:00+00:00'),
]
  .sort(byNewest)
  .map((x) => x.id)
  .join(',');
check('newest date first, then newest saved first', ordered, 'a,b,mid,old');
check('filter: matches type + range', matchesFilters({ type: 'bus', activity_date: '2026-09-15' }, { type: 'bus', from: '2026-09-01', to: '2026-09-30' }), true);
check('filter: wrong type excluded', matchesFilters({ type: 'car', activity_date: '2026-09-15' }, { type: 'bus', from: '', to: '' }), false);
check('filter: before "from" excluded', matchesFilters({ type: 'car', activity_date: '2026-08-31' }, { type: 'all', from: '2026-09-01', to: '' }), false);
check('filter: after "to" excluded', matchesFilters({ type: 'car', activity_date: '2026-10-01' }, { type: 'all', from: '', to: '2026-09-30' }), false);
check('filter: bounds are inclusive', matchesFilters({ type: 'car', activity_date: '2026-09-30' }, { type: 'all', from: '2026-09-30', to: '2026-09-30' }), true);

console.log('--- Dates never shift, whatever the computer time zone is');
const weekUrl = new URL('../lib/week.js', import.meta.url).href;
const probe = `import { formatDate, getWeekInfo, todayIST } from '${weekUrl}';
console.log(JSON.stringify([formatDate('2026-01-01'), formatDate('2026-12-31'), formatDate('2026-03-08'), todayIST(Date.parse('2026-09-24T20:00:00Z')), getWeekInfo(Date.parse('2026-09-27T18:30:00Z')).start, new Date(2026, 5, 1).getTimezoneOffset()]));`;
const outputs = {};
for (const tz of ['Asia/Kolkata', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/Los_Angeles', 'UTC']) {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
  outputs[tz] = JSON.parse(r.stdout.trim());
}
const expectedDates = JSON.stringify(['1 Jan 2026', '31 Dec 2026', '8 Mar 2026', '2026-09-25', '2026-09-28']);
for (const [tz, out] of Object.entries(outputs)) {
  check('TZ=' + tz + ': dates identical and correct', JSON.stringify(out.slice(0, 5)), expectedDates);
}
check('the TZ setting really took effect (offsets differ)', new Set(Object.values(outputs).map((o) => o[5])).size >= 4, true);
check('formatDate is stable for a leap day', formatDate('2028-02-29'), '29 Feb 2028');

console.log('--- Category groups (Transport / Energy / Food)');
check('groups are transport, energy, food', CATEGORY_GROUPS.map((g) => g.key).join(','), 'transport,energy,food');
check('transport = car + bus + flight', CATEGORY_GROUPS[0].types.join('+'), 'car+bus+flight');
check('energy = electricity', CATEGORY_GROUPS[1].types.join('+'), 'electricity');
check('food = veg meal + non-veg meal', CATEGORY_GROUPS[2].types.join('+'), 'veg_meal+nonveg_meal');
{
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const types = Object.keys(ACTIVITY_TYPES);
  const randomRows = (n) => Array.from({ length: n }, () => {
    const type = types[Math.floor(rnd() * types.length)];
    return mk(type, Math.round(rnd() * 5000) / 100 + 0.01, '2026-09-2' + Math.floor(rnd() * 8));
  });
  const scenarios = { 'zero activities': [], 'one activity': [mk('car', 7, '2026-09-24')], 'transport only': [mk('bus', 3, '2026-09-24'), mk('flight', 9, '2026-09-24')], 'food only': [mk('veg_meal', 1, '2026-09-24'), mk('nonveg_meal', 1, '2026-09-24')], 'many (5)': randomRows(5), 'many (60)': randomRows(60), 'many (400)': randomRows(400) };
  for (const [name, rows] of Object.entries(scenarios)) {
    const s = summarize(rows, 100, wk);
    const g = groupTotals(s.categories);
    const cents = g.groups.reduce((sum, x) => sum + Math.round(x.co2_kg * 100), 0);
    const tenths = g.groups.reduce((sum, x) => sum + Math.round(x.share_percent * 10), 0);
    check(name + ': groups add up EXACTLY to the total (' + s.total_kg.toFixed(2) + ' kg)', cents, Math.round(s.total_kg * 100));
    check(name + ': group total equals summary total', g.total_kg, s.total_kg);
    check(name + ': shares add up to 100.0% (or 0 when empty)', tenths, s.total_kg > 0 ? 1000 : 0);
    check(name + ': entry counts add up', g.groups.reduce((sum, x) => sum + x.count, 0), s.entry_count);
  }
  const s3 = summarize([mk('car', 10, '2026-09-24'), mk('electricity', 10, '2026-09-24'), mk('nonveg_meal', 2, '2026-09-24')], null, wk);
  const g3 = groupTotals(s3.categories).groups.map((x) => x.key + '=' + x.co2_kg).join(' ');
  check('mixed example: transport 2, energy 8, food 4', g3, 'transport=2 energy=8 food=4');
}

console.log('--- Weekly target states');
check('50% -> under', targetState(50, false), 'under');
check('79.9% -> under', targetState(79.9, false), 'under');
check('80% -> near', targetState(80, false), 'near');
check('99.9% -> near', targetState(99.9, false), 'near');
check('exactly 100% (not exceeded) -> near', targetState(100, false), 'near');
check('above target -> exceeded', targetState(100.1, true), 'exceeded');
check('no target -> none', targetState(null, false), 'none');
check('state follows real numbers: 60 of 100 -> under', targetState(targetStatus(60, 100, 4).percent, targetStatus(60, 100, 4).exceeded), 'under');
check('state follows real numbers: 85 of 100 -> near', targetState(targetStatus(85, 100, 4).percent, targetStatus(85, 100, 4).exceeded), 'near');
check('state follows real numbers: 100 of 100 -> near', targetState(targetStatus(100, 100, 4).percent, targetStatus(100, 100, 4).exceeded), 'near');
check('state follows real numbers: 100.01 of 100 -> exceeded', targetState(targetStatus(100.01, 100, 4).percent, targetStatus(100.01, 100, 4).exceeded), 'exceeded');

console.log('--- Weekly target validation');
check('empty target', validateTarget(''), 'Please enter a weekly target in kg.');
check('spaces only', validateTarget('   '), 'Please enter a weekly target in kg.');
check('zero target', validateTarget('0'), 'A weekly target must be greater than zero.');
check('negative target', has(validateTarget('-5'), "can't be negative"), true);
check('non-numeric target', has(validateTarget('abc'), "doesn't look like a number"), true);
check('browser badInput target', has(validateTarget('', { badInput: true }), "doesn't look like a number"), true);
check('0.004 -> too small', has(validateTarget('0.004'), 'too small'), true);
check('over maximum', has(validateTarget('100001'), 'maximum'), true);
check('50 accepted', validateTarget('50'), null);
check('42.5 accepted', validateTarget('42.5'), null);
check('0.01 accepted', validateTarget('0.01'), null);

console.log('--- Nudge: the browser builds exactly the same tip as the server');
{
  const weekRows = [mk('car', 120, '2026-09-21'), mk('bus', 10, '2026-09-22'), mk('nonveg_meal', 5, '2026-09-24'), mk('flight', 40, '2026-09-27')];
  const outside = [mk('flight', 900, '2026-09-20'), mk('electricity', 500, '2026-09-28')];
  const server = summarize([...weekRows, ...outside], 10, wk).week.nudge;
  const client = buildNudge(weekTotals(weekRows));
  check('client tip == server tip', client && client.tip, server && server.tip);
  check('tip is specific (biggest source + kg saved)', client.type + ':' + client.saved_kg, server.type + ':' + server.saved_kg);
  check('tip names the biggest source and its saving', /biggest source/.test(client.tip) && /would have saved [\d.]+ kg/.test(client.tip), true);
  const extra = mk('flight', 300, '2026-09-24');
  check('addToWeek == weekTotals(rows + activity)', stable(addToWeek(weekTotals(weekRows), extra)), stable(weekTotals([...weekRows, extra])));
  const flipped = buildNudge(addToWeek(weekTotals(weekRows), extra));
  check('adding a big flight changes the biggest source to flight', flipped.type, 'flight');
  check('no nudge text when the week is under target', summarize(weekRows, 1000, wk).week.nudge, null);
}

console.log('--- Week boundaries (Monday-Sunday, IST): only this week counts');
{
  const rows = [mk('car', 10, '2026-09-20'), mk('car', 10, '2026-09-21'), mk('car', 10, '2026-09-24'), mk('car', 10, '2026-09-27'), mk('car', 10, '2026-09-28')];
  const thu = summarize(rows, 100, getWeekInfo(Date.parse('2026-09-24T07:00:00Z')));
  check('Thu 24 Sep: week is Mon 21 - Sun 27', thu.week.start + '..' + thu.week.end, '2026-09-21..2026-09-27');
  check('previous Sunday (20th) is excluded, Mon 21 + Thu 24 + Sun 27 count = 6.00 kg', thu.week.total_kg, 6);
  check('next Monday (28th) is excluded', thu.week.total_kg < 8, true);
  check('all-time total still counts all five rows (10.00 kg)', thu.total_kg, 10);
  const sunLate = summarize(rows, 100, getWeekInfo(Date.parse('2026-09-27T18:29:00Z')));
  check('Sun 23:59 IST: still the same week (Sun 27 counts)', sunLate.week.start + ' total ' + sunLate.week.total_kg, '2026-09-21 total 6');
  const monEarly = summarize(rows, 100, getWeekInfo(Date.parse('2026-09-27T18:30:00Z')));
  check('Mon 00:00 IST: new week starts 28 Sep', monEarly.week.start + '..' + monEarly.week.end, '2026-09-28..2026-10-04');
  check('new week counts only Mon 28 (2.00 kg); last week drops out', monEarly.week.total_kg, 2);
}

console.log('--- History: filter chips, invalid range, count and total');
check('no filters -> no chips', activeFilters({ type: 'all', from: '', to: '' }).length, 0);
check('type chip label', activeFilters({ type: 'flight', from: '', to: '' })[0].label, 'Type: Flight');
check('non-veg chip label', activeFilters({ type: 'nonveg_meal', from: '', to: '' })[0].label, 'Type: Non-veg meal');
check('from chip label', activeFilters({ type: 'all', from: '2026-09-24', to: '' })[0].label, 'From: 24 Sept 2026');
check('to chip label', activeFilters({ type: 'all', from: '', to: '2026-01-05' })[0].label, 'To: 5 Jan 2026');
check('all three chips in order', activeFilters({ type: 'bus', from: '2026-09-01', to: '2026-09-30' }).map((c) => c.key).join(','), 'type,from,to');
check('From after To -> invalid', isRangeInvalid({ type: 'all', from: '2026-09-25', to: '2026-09-24' }), true);
check('same day is valid (inclusive)', isRangeInvalid({ type: 'all', from: '2026-09-24', to: '2026-09-24' }), false);
check('From-only is valid', isRangeInvalid({ type: 'all', from: '2026-09-24', to: '' }), false);
check('To-only is valid', isRangeInvalid({ type: 'all', from: '', to: '2026-09-24' }), false);
check('empty list -> 0 rows, 0.00 kg', JSON.stringify(summarizeRows([])), JSON.stringify({ count: 0, total_kg: 0 }));
check('row total is exact in cents (0.1 + 0.2 = 0.3)', summarizeRows([{ co2_kg: 0.1 }, { co2_kg: 0.2 }]).total_kg, 0.3);
check('row total of many rows', summarizeRows([{ co2_kg: 26.25 }, { co2_kg: 0.64 }, { co2_kg: 2.5 }, { co2_kg: 0.16 }]).total_kg, 29.55);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
