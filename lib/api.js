const TIMEOUT_MS = 15000;

// Tiny fetch wrapper for the browser. Always resolves to { ok, status, data } and never
// hangs: a request that takes longer than TIMEOUT_MS resolves with a clear error.
export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      cache: 'no-store',
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON response
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const text =
      err?.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : 'Network error. Please check your connection.';
    return { ok: false, status: 0, data: { error: text } };
  } finally {
    clearTimeout(timer);
  }
}

export const sendJson = (path, method, body) =>
  apiFetch(path, { method, body: JSON.stringify(body) });
