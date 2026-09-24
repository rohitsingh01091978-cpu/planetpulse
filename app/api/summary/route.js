import { getSupabase } from '@/lib/supabase';
import { buildSummary } from '@/lib/summary';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const summary = await buildSummary(getSupabase());
  return json(summary);
});
