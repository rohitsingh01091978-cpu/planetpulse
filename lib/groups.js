// Dashboard groups: the six activity types rolled up into three categories.
export const CATEGORY_GROUPS = [
  { key: 'transport', label: 'Transport', types: ['car', 'bus', 'flight'] },
  { key: 'energy', label: 'Energy', types: ['electricity'] },
  { key: 'food', label: 'Food', types: ['veg_meal', 'nonveg_meal'] },
];

const toCents = (kg) => Math.round(kg * 100);

// Rolls the per-type summary rows up into the three groups. Works in whole cents so the
// groups add up EXACTLY to the total, and shares use the largest-remainder method (in tenths
// of a percent) so they add up to exactly 100.0%.
export function groupTotals(categories) {
  const byType = Object.fromEntries(categories.map((c) => [c.type, c]));
  const groups = CATEGORY_GROUPS.map((g) => {
    const members = g.types.map((t) => byType[t]).filter(Boolean);
    return {
      key: g.key,
      label: g.label,
      types: g.types,
      count: members.reduce((s, c) => s + c.count, 0),
      cents: members.reduce((s, c) => s + toCents(c.co2_kg), 0),
    };
  });
  const totalCents = groups.reduce((s, g) => s + g.cents, 0);

  let tenths = groups.map(() => 0);
  if (totalCents > 0) {
    const raw = groups.map((g) => (g.cents / totalCents) * 1000);
    tenths = raw.map(Math.floor);
    let left = 1000 - tenths.reduce((s, n) => s + n, 0);
    raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i)
      .forEach(({ i }) => {
        if (left > 0) {
          tenths[i] += 1;
          left -= 1;
        }
      });
  }

  return {
    total_kg: totalCents / 100,
    groups: groups.map((g, i) => ({
      key: g.key,
      label: g.label,
      types: g.types,
      count: g.count,
      co2_kg: g.cents / 100,
      share_percent: tenths[i] / 10,
    })),
  };
}
