// Shared API fetch helpers - all URLs are relative (Vite proxy handles /api)
function getToken() {
  return localStorage.getItem('gpt_token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Only set Content-Type for JSON string bodies (not FormData)
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  // Auto-redirect to login on 401
  if (res.status === 401) {
    localStorage.removeItem('gpt_token');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: (url) => request(url, { method: 'DELETE' }),
  upload: (url, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(url, { method: 'POST', body: fd });
  },
};
