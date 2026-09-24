import { round2 } from './co2.js';
import { projectWeekTotal } from './week.js';

// Target-dependent fields of the weekly summary. Used by the server (summary.js) and
// by the browser to update the target card instantly after "Save target".
export function targetStatus(totalKg, targetKg, dayNumber) {
  const hasTarget = targetKg != null;
  const exceeded = hasTarget && totalKg > targetKg;
  const projected = projectWeekTotal(totalKg, dayNumber);
  return {
    target_kg: hasTarget ? targetKg : null,
    percent: hasTarget ? Math.round((totalKg / targetKg) * 1000) / 10 : null,
    remaining_kg: hasTarget ? round2(Math.max(targetKg - totalKg, 0)) : null,
    exceeded,
    exceeded_by_kg: exceeded ? round2(totalKg - targetKg) : 0,
    projected_kg: projected,
    projected_exceeds: hasTarget && !exceeded && projected > targetKg,
  };
}

// Weekly progress at or above this percentage (but not over the target) counts as "near".
export const NEAR_PERCENT = 80;

// Which of the three weekly-target states applies:
//   'none'     no target set
//   'under'    below 80% of the target
//   'near'     80% up to and including 100%
//   'exceeded' above the target (this is what shows the nudge)
export function targetState(percent, exceeded) {
  if (percent == null) return 'none';
  if (exceeded) return 'exceeded';
  return percent >= NEAR_PERCENT ? 'near' : 'under';
}
