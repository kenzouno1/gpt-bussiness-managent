// Accounts page logic
let totpIntervals = {};

async function loadAccounts() {
  const accounts = await API.get('/api/accounts');
  document.getElementById('accountCount').textContent = accounts.length;
  const tbody = document.getElementById('accountsBody');
  tbody.innerHTML = '';

  // Clear old TOTP intervals
  Object.values(totpIntervals).forEach(clearInterval);
  totpIntervals = {};

  for (const acc of accounts) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${acc.id}</td>
      <td><a href="#" onclick="showAccount(${acc.id})" class="text-decoration-none">${acc.email}</a></td>
      <td><span class="badge bg-info">${acc.status || '-'}</span></td>
      <td>${acc.chatgpt_plan_type || '-'}</td>
      <td><span id="totp-${acc.id}" class="totp-code">Loading...</span>
          <small id="totp-timer-${acc.id}" class="text-muted ms-1"></small></td>
      <td>${short(acc.chatgpt_account_id, 8)}</td>
      <td>${acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '-'}</td>
      <td>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteAccount(${acc.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
    startTOTP(acc.id);
  }
}

async function startTOTP(accountId) {
  const update = async () => {
    try {
      const data = await API.get(`/api/accounts/${accountId}/totp`);
      const el = document.getElementById(`totp-${accountId}`);
      const timer = document.getElementById(`totp-timer-${accountId}`);
      if (!el) return;
      if (data.code) {
        el.textContent = data.code;
        el.className = 'totp-code badge bg-dark font-monospace';
        timer.textContent = `${data.secondsRemaining}s`;
      } else {
        el.textContent = 'N/A';
        el.className = 'totp-code text-muted';
        timer.textContent = '';
      }
    } catch { /* ignore */ }
  };

  await update();
  totpIntervals[accountId] = setInterval(update, 1000);
}

async function showAccount(id) {
  const acc = await API.get(`/api/accounts/${id}`);
  const detail = document.getElementById('accountDetail');
  detail.innerHTML = `
    <div class="row g-2">
      <div class="col-md-6">
        <label class="form-label small fw-bold">Email</label>
        <input class="form-control form-control-sm" value="${acc.email}" readonly>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-bold">Password</label>
        <div class="input-group input-group-sm">
          <input class="form-control" type="password" value="${acc.password || ''}" id="accPwd">
          <button class="btn btn-outline-secondary" onclick="togglePwd('accPwd')">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label small fw-bold">Status</label>
        <input class="form-control form-control-sm" value="${acc.status || ''}" readonly>
      </div>
      <div class="col-md-4">
        <label class="form-label small fw-bold">Plan Type</label>
        <input class="form-control form-control-sm" value="${acc.chatgpt_plan_type || ''}" readonly>
      </div>
      <div class="col-md-4">
        <label class="form-label small fw-bold">2FA Secret</label>
        <div class="input-group input-group-sm">
          <input class="form-control font-monospace" value="${acc.totp_secret || ''}" id="acc2fa" readonly>
          <button class="btn btn-outline-secondary" onclick="copyText('${acc.totp_secret || ''}')">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
      <div class="col-12">
        <label class="form-label small fw-bold">2FA Code (Real-time)</label>
        <div class="d-flex align-items-center gap-2">
          <span id="modal-totp" class="badge bg-dark font-monospace fs-5 p-2">...</span>
          <span id="modal-totp-timer" class="text-muted small"></span>
        </div>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-bold">ChatGPT Account ID</label>
        <input class="form-control form-control-sm font-monospace" value="${acc.chatgpt_account_id || ''}" readonly>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-bold">ChatGPT User ID</label>
        <input class="form-control form-control-sm font-monospace" value="${acc.chatgpt_user_id || ''}" readonly>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-bold">Hotmail Email</label>
        <input class="form-control form-control-sm" value="${acc.hotmail_email || ''}" readonly>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-bold">Session Token</label>
        <div class="input-group input-group-sm">
          <input class="form-control font-monospace" id="sessionTokenInput" value="${short(acc.session_token, 40)}" readonly>
          <input type="hidden" id="sessionTokenFull" value="${acc.session_token || ''}">
          <button class="btn btn-outline-secondary" onclick="copyText(document.getElementById('sessionTokenFull').value)">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  // Start modal TOTP refresh
  const modalTotpInterval = setInterval(async () => {
    try {
      const data = await API.get(`/api/accounts/${id}/totp`);
      const el = document.getElementById('modal-totp');
      const timer = document.getElementById('modal-totp-timer');
      if (el && data.code) {
        el.textContent = data.code;
        timer.textContent = `${data.secondsRemaining}s remaining`;
      }
    } catch { /* ignore */ }
  }, 1000);

  const modal = new bootstrap.Modal(document.getElementById('accountModal'));
  document.getElementById('accountModal').addEventListener('hidden.bs.modal', () => {
    clearInterval(modalTotpInterval);
  }, { once: true });
  modal.show();
}

async function deleteAccount(id) {
  if (!confirm('Delete this account?')) return;
  await API.del(`/api/accounts/${id}`);
  showToast('Account deleted');
  loadAccounts();
}

function togglePwd(inputId) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

// CSV Import handler
document.getElementById('importForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('csvFile').files[0];
  if (!file) return showToast('Select a CSV file', 'warning');

  const resultDiv = document.getElementById('importResult');
  resultDiv.innerHTML = '<span class="text-muted">Importing...</span>';

  const result = await API.upload('/api/import', file);
  resultDiv.innerHTML = `
    <span class="text-success">Imported: ${result.imported}</span> |
    <span class="text-warning">Skipped: ${result.skipped}</span> |
    <span class="text-info">Orgs created: ${result.orgsCreated}</span>
    ${result.errors?.length ? `<br><span class="text-danger">Errors: ${result.errors.join(', ')}</span>` : ''}
  `;
  loadAccounts();
});

// Load on page ready
loadAccounts();
