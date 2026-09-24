# Decisions

## DP1: Nudge when the target is exceeded

When this week's total goes above the target, the app shows a red "Target exceeded" warning and a tip based on the biggest source of CO2 this week. The tip names a concrete swap and the kg it would have saved, for example "taking the bus for those 120 km would have saved 14.40 kg". The savings use the same emission factors as the calculation, so the numbers are consistent. The warning never blocks anything: the log form stays fully usable, and going over the target only changes what is displayed.

## DP2: Absurd input

Zero, negative, non-numeric and missing quantities are rejected, as are missing, malformed and future dates (future is judged against today in IST). If a quantity is above a realistic limit (car/bus 2000 km, flight 20000 km, electricity 1000 kWh, meals 10), the server answers with a confirmation request instead of saving, and the user can choose "Yes, save anyway" or edit the value. The limit is a warning, not a ban, because a long road trip or a big event is possible; a wrong value is caught by asking, not by refusing. I also added a hard ceiling of 1,000,000 per entry so nonsense values can never break the database. All checks run on the backend, so they cannot be bypassed from the UI.

## DP3: Week definition and projection

The week runs Monday to Sunday in IST (UTC+05:30), calculated explicitly rather than with the server's or browser's timezone, so a Vercel server running in UTC gives the same answer as a user in India. The UI shows "X of Y kg", the current day of the week (with "day N of 7") and the date range of the week. The projected total by Sunday is the total so far divided by the days elapsed (today counts as a full day) times 7. This is a simple linear pace, and it is flagged when the projection is above the target even if the target has not been exceeded yet.

## Other choices

- **No authentication:** as required, all data lives in shared tables with RLS disabled, and there is a single global weekly target (one row in `settings`).
- **Backend calculation:** the CO2 value is computed in the API route and stored with each activity, so history stays correct even if factors change later.
- **Quantities are rounded to 2 decimals** before calculating, so the stored quantity and the stored CO2 always agree.

## History and filters

- **Filters apply as you change them, and can be removed one by one.** Each active filter shows as a chip ("Type: Flight", "From: 24 Sept 2026") with its own remove button, next to the existing "Apply filters" and "Clear filters" buttons. Filtering only ever reads data; it never changes what is stored.
- **A backwards date range shows a message, not results.** If "From" is after "To", nothing can match, so the page explains that and does not ask the server at all. Same-day ranges and both boundaries are inclusive.
- **The summary line always matches the rows on screen.** It shows how many activities are listed and their total CO2, summed in whole cents so it is exact. Empty states are different for "nothing logged yet" and "nothing matches these filters" (which offers a Clear filters action).
- **One week function.** The week is computed only by `getWeekInfo` on the server. The dashboard, the weekly target and the nudge all use the week the server returns, so last week's and future-dated activities can never leak into this week's progress.

## Dashboard groups and weekly target states

- **Three groups on top of the table.** Transport (car, bus, flight), Energy (electricity) and Food (veg, non-veg) are rolled up from the same per-type data. The sums are done in whole cents and the shares with the largest-remainder method, so the groups add up exactly to the total kg and to exactly 100.0%.
- **Three calm states for the weekly target.** Below 80% is "on track" (green), 80% up to and including 100% is "getting close" (soft amber), and only above 100% is "exceeded". Exceeded uses a warm orange warning, not alarm red, because going over a target is feedback, not an error.
- **The nudge stays specific and encouraging.** It still names this week's biggest source and exactly how many kg a swap would have saved, and is now framed as "it happens to everyone, and small swaps add up". It appears only while the week is over target and never blocks logging.
- **The nudge updates instantly.** The browser loads this week's activities through the existing history endpoint and builds the same tip the server does (tests check they are identical), so the tip appears, changes and disappears in the same render as the progress bar.

## Log an activity flow

- **Activity cards are real radio inputs** inside a fieldset with the legend "Activity type". Each has an explicit accessible name such as "Car (km)", works with the keyboard (arrow keys move the selection) and stays visible to browser automation, so the cards are for people and agents alike.
- **Two layers of validation.** The form pre-checks quantity and date and shows friendly, specific messages without calling the server. The API validates the same rules again and stays the source of truth, including the "unusually high, are you sure?" confirm step, which only the server decides.
- **One request per action.** A lock stops double clicks or a double Enter from sending two saves, and a failed save keeps the entry in the form with a message saying what went wrong.
- **The screen updates instantly, then reconciles.** After a save the dashboard, weekly progress and history are updated in the same render using the same maths as the server (`summarize` in `lib/summary.js`), and a background refetch replaces them with server data. Unit tests check both give identical results.
- **Dates are plain calendar dates.** They are never converted through a time zone, "today" is computed in IST, and tests run the date code under five different system time zones.
