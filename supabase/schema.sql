-- PlanetPulse schema. Run this in the Supabase SQL editor.
-- No authentication in this app, so Row Level Security is DISABLED on every table.

create extension if not exists pgcrypto;

-- One row per logged activity. co2_kg is computed by the backend (API route).
create table if not exists public.activities (
  id            uuid primary key default gen_random_uuid(),
  type          text not null
                check (type in ('car', 'bus', 'flight', 'electricity', 'veg_meal', 'nonveg_meal')),
  quantity      numeric(12, 2) not null check (quantity > 0),
  co2_kg        numeric(12, 2) not null check (co2_kg >= 0),
  activity_date date not null,
  created_at    timestamptz not null default now()
);

create index if not exists activities_date_idx on public.activities (activity_date desc);
create index if not exists activities_type_idx on public.activities (type);

-- Single-row table holding the (global) weekly CO2 target. id is pinned to 1.
create table if not exists public.settings (
  id               int primary key default 1 check (id = 1),
  weekly_target_kg numeric(12, 2) check (weekly_target_kg > 0),
  updated_at       timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- RLS disabled: anyone can read and write.
alter table public.activities disable row level security;
alter table public.settings   disable row level security;

grant all on public.activities to anon, authenticated;
grant all on public.settings   to anon, authenticated;
