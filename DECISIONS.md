# Decisions

## DP1 · The nudge
**Choice:** Warn and encourage, never block or shame. When this week's total crosses the target, the app shows how far over the user is and a specific tip based on their own biggest source this week (e.g. "Swapping those 65 non-veg meals for veg ones would have saved 97.50 kg").

**Why:** If the app blocked logging or made people feel bad, they would simply stop logging honestly, and a tracker with missing data is useless. A generic "try harder" message is easy to ignore, but a tip built from the user's own numbers shows exactly which one change would matter most. Below 80% the card stays positive, and between 80–100% it gives a gentle heads-up, so the warning only appears when it is actually needed.

## DP2 · Absurd input
**Choice:** Hard-reject values that can never be right (empty, zero, negative, non-numeric, future dates). For values that are possible but unusual, each type has a per-entry limit (car/bus 2,000 km, flight 20,000 km, electricity 1,000 kWh, meals 10); above it, the user must confirm with "Yes, save anyway" or go back with "No, let me edit".

**Why:** A 500,000 km car trip is almost certainly a typo, and silently saving it would wreck the dashboard, the weekly target and the nudge in one go. But a flat reject would also block real entries, like a 12,000 km flight to the US or a month's electricity bill logged at once. Asking for confirmation catches mistakes while still trusting the user with genuine data.

## DP3 · The week
**Choice:** A week runs Monday to Sunday in Indian Standard Time. The weekly target always tracks the current real week; mid-week it shows "X of Y kg", the day number (e.g. day 4 of 7), kg remaining, and a projected total by Sunday at the current pace. The date field lets users backfill past activities: those count in the total and history, but not in this week's progress.

**Why:** Monday is when the working and college week starts for most of our users in India, and using IST stops late-night entries from jumping into the wrong week because of server time zones. A raw "10 kg" on a Tuesday looks fine even if the user is heading far over target, so the Sunday projection makes mid-week progress honest. Keeping the target tied to the current week means logging an old activity never suddenly changes what "this week" means.
