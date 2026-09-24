// Run with: npm test
// Pure-logic checks: emission factors, CO2 calculation, units, IST week and nudge.
import { ACTIVITY_TYPES, TYPE_KEYS } from '../lib/constants.js';
import { calculateCo2 } from '../lib/co2.js';
import { buildNudge } from '../lib/nudge.js';
import { targetStatus } from '../lib/target.js';
import { getWeekInfo, projectWeekTotal, todayIST } from '../lib/week.js';

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
