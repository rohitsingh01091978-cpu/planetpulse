import { createClient } from '@supabase/supabase-js';

const DB_TIMEOUT_MS = 8000;
let client;

// Fail fast with a clear error instead of hanging until the platform kills the request.
function fetchWithTimeout(input, init = {}) {
  const timeout = AbortSignal.timeout(DB_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

// Created lazily (so the build works without env vars) and reused across requests on a
// warm instance. Only used from API routes, i.e. server-side.
export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project-ref')) {
    const err = new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
    err.status = 500;
    throw err;
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
  return client;
}
