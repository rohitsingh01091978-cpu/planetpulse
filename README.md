Hackathon ID: AZIS-E4F4ZN

# PlanetPulse

A simple carbon footprint tracker. Log everyday activities, see your CO2 footprint, and stay under a weekly target.

**Track:** Sustainability / Climate Tech

**Tech:** Next.js (App Router, JavaScript), Supabase (Postgres), deployable on Vercel

**No test credentials needed.** There is no login or sign-up; every feature is open to anyone.

## Features

1. **Log an activity**: type, quantity and date. Types: car, bus, flight (km), electricity (kWh), veg meal, non-veg meal (meals).
2. **CO2 calculation** on the backend, rounded to 2 decimals:

   | Type | Factor |
   | --- | --- |
   | Car | 0.20 kg/km |
   | Bus | 0.08 kg/km |
   | Flight | 0.25 kg/km |
   | Electricity | 0.80 kg/kWh |
   | Veg meal | 0.5 kg/meal |
   | Non-veg meal | 2.0 kg/meal |

3. **Dashboard**: total footprint and a per-category breakdown table.
4. **Weekly target**: set a target, see a progress bar, and get a clear warning when it is exceeded.
5. **History and filter**: list of logged activities, filterable by type and date range.

Decision points (nudge, absurd input, IST week) are explained in [DECISIONS.md](./DECISIONS.md).

## Run steps

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. **Create the tables:** open the Supabase SQL editor, paste the contents of `supabase/schema.sql` and run it. (It disables RLS, since there is no auth.)
3. **Add your keys:** copy `.env.example` to `.env.local` and fill in your project URL and anon key
   (Supabase dashboard, Project Settings, API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

5. **Production build check:** `npm run build` then `npm start`.

## Deploy on Vercel

Import the repo in Vercel, add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Project Settings, and deploy. No other configuration is needed.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/activities` | Log an activity `{ type, quantity, date, confirm? }`. CO2 is calculated here. |
| `GET` | `/api/activities?type=&from=&to=` | History, newest first, with optional filters. |
| `GET` | `/api/summary` | Totals, per-category breakdown, weekly progress, projection and nudge. |
| `GET` / `PUT` | `/api/target` | Read or set the weekly CO2 target `{ weekly_target_kg }`. |

## Project layout

```
app/            pages, layout, styles and API routes (app/api/*)
components/     ActivityForm, Dashboard, WeeklyTarget, History
lib/            emission factors, CO2 math, IST week logic, nudge, Supabase client
supabase/       schema.sql (RLS disabled)
```

## Note

Because there is no authentication, the data (activities and the weekly target) is shared by everyone who opens the app.
