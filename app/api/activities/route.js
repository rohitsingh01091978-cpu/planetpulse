import { getSupabase } from '@/lib/supabase';
import { ACTIVITY_TYPES, MAX_QUANTITY, TYPE_KEYS } from '@/lib/constants';
import { calculateCo2, round2 } from '@/lib/co2';
import { isValidDateString, todayIST } from '@/lib/week';
import { badRequest, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

const LIST_LIMIT = 200;

// GET /api/activities?type=car&from=2026-01-01&to=2026-01-31
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const type = params.get('type');
  const from = params.get('from');
  const to = params.get('to');

  if (type && type !== 'all' && !TYPE_KEYS.includes(type)) return badRequest('Unknown activity type.');
  if (from && !isValidDateString(from)) return badRequest('"From" date is not a valid date.');
  if (to && !isValidDateString(to)) return badRequest('"To" date is not a valid date.');
  if (from && to && from > to) return badRequest('"From" date must be on or before the "To" date.');

  let query = getSupabase()
    .from('activities')
    .select('id, type, quantity, co2_kg, activity_date, created_at', { count: 'exact' })
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (type && type !== 'all') query = query.eq('type', type);
  if (from) query = query.gte('activity_date', from);
  if (to) query = query.lte('activity_date', to);

  const { data, error, count } = await query;
  if (error) throw error;

  const activities = data.map((a) => ({
    ...a,
    quantity: Number(a.quantity),
    co2_kg: Number(a.co2_kg),
    label: ACTIVITY_TYPES[a.type]?.label ?? a.type,
    unit: ACTIVITY_TYPES[a.type]?.unit ?? '',
  }));
  return json({ activities, count: count ?? activities.length, limit: LIST_LIMIT });
});

// POST /api/activities  { type, quantity, date, confirm? }
export const POST = handle(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }
  const { type, quantity: rawQty, date, confirm } = body ?? {};

  if (!TYPE_KEYS.includes(type)) return badRequest('Please choose a valid activity type.');
  const info = ACTIVITY_TYPES[type];

  // DP2: reject zero / negative / non-numeric quantities.
  if (rawQty === '' || rawQty == null) return badRequest('Quantity is required.');
  const parsed = Number(rawQty);
  if (!Number.isFinite(parsed)) return badRequest('Quantity must be a number.');
  if (parsed < 0) return badRequest('Quantity cannot be negative.');
  const quantity = round2(parsed);
  if (quantity <= 0) return badRequest('Quantity must be greater than zero.');
  if (quantity > MAX_QUANTITY) {
    return badRequest(`Quantity is too large to be realistic (maximum ${MAX_QUANTITY} ${info.unit}).`);
  }

  // DP2: reject missing, malformed and future dates (today = today in IST).
  if (!date) return badRequest('Date is required.');
  if (!isValidDateString(date)) return badRequest('Date is not valid. Use the format YYYY-MM-DD.');
  const today = todayIST();
  if (date > today) return badRequest(`Date cannot be in the future (today in IST is ${today}).`);

  // DP2: realistic-limit check. Unusually large values need explicit confirmation.
  if (quantity > info.limit && confirm !== true) {
    return json(
      {
        needs_confirmation: true,
        limit: info.limit,
        message: `${quantity} ${info.unit} for "${info.label}" is unusually high (the usual maximum is ${info.limit} ${info.unit}). Are you sure this is correct?`,
      },
      409
    );
  }

  const co2_kg = calculateCo2(type, quantity);
  const { data, error } = await getSupabase()
    .from('activities')
    .insert({ type, quantity, co2_kg, activity_date: date })
    .select('id, type, quantity, co2_kg, activity_date, created_at')
    .single();
  if (error) throw error;

  return json(
    {
      activity: {
        ...data,
        quantity: Number(data.quantity),
        co2_kg: Number(data.co2_kg),
        label: info.label,
        unit: info.unit,
      },
    },
    201
  );
});
