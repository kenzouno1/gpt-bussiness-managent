// Shared API helpers
const API = {
  async get(url) {
    const res = await fetch(url);
    return res.json();
  },
  async post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async put(url, body) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    return res.json();
  },
  async upload(url, file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(url, { method: 'POST', body: fd });
    return res.json();
  },
};

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} alert-dismissible fade show position-relative`;
  toast.style.cssText = 'min-width:300px;margin-bottom:0.5rem;';
  toast.innerHTML = `${message}<button type="button" class="btn-close btn-close-sm" onclick="this.parentElement.remove()"></button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toastContainer';
  c.style.cssText = 'position:fixed;top:60px;right:16px;z-index:9999;';
  document.body.appendChild(c);
  return c;
}

// Short string helper
function short(str, len = 20) {
  if (!str) return '-';
  return str.length > len ? str.substring(0, len) + '...' : str;
}
