// Shared API fetch helpers - all URLs are relative (Vite proxy handles /api)
async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  put: (url, body) => request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  del: (url) => request(url, { method: 'DELETE' }),
  upload: (url, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(url, { method: 'POST', body: fd });
  },
};
