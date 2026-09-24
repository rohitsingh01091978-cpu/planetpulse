// Tiny fetch wrapper for the browser. Always resolves to { ok, status, data }.
export async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(path, {
      cache: 'no-store',
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON response
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error. Please check your connection.' } };
  }
}

export const sendJson = (path, method, body) =>
  apiFetch(path, { method, body: JSON.stringify(body) });
