import { getSupabase } from '@/lib/supabase';
import { round2 } from '@/lib/co2';
import { badRequest, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

const MAX_TARGET_KG = 100000;

export const GET = handle(async () => {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('weekly_target_kg')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  const t = data?.weekly_target_kg;
  return json({ weekly_target_kg: t == null ? null : Number(t) });
});

export const PUT = handle(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }

  const raw = body?.weekly_target_kg;
  if (raw === '' || raw == null) return badRequest('Weekly target is required.');
  const value = Number(raw);
  if (!Number.isFinite(value)) return badRequest('Weekly target must be a number.');
  if (value <= 0) return badRequest('Weekly target must be greater than zero.');
  if (value > MAX_TARGET_KG) return badRequest(`Weekly target cannot exceed ${MAX_TARGET_KG} kg.`);

  const target = round2(value);
  const { error } = await getSupabase()
    .from('settings')
    .upsert({ id: 1, weekly_target_kg: target, updated_at: new Date().toISOString() });
  if (error) throw error;
  return json({ weekly_target_kg: target });
});
