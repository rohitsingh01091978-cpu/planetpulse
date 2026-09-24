import { NextResponse } from 'next/server';

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function badRequest(message, extra = {}) {
  return json({ error: message, ...extra }, 400);
}

// Wraps a route handler so thrown errors come back as JSON instead of an HTML 500.
export function handle(fn) {
  return async (request) => {
    try {
      return await fn(request);
    } catch (err) {
      let message = err?.message || 'Unexpected server error.';
      if (/fetch failed/i.test(message)) {
        message = 'Could not reach Supabase. Check the URL and key in .env.local.';
      }
      return json({ error: message }, err?.status || 500);
    }
  };
}
