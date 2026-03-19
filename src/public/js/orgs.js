// Organizations page logic
let currentOrgId = null;

async function loadOrgs() {
  const orgs = await API.get('/api/orgs');
  document.getElementById('orgCount').textContent = orgs.length;
  const tbody = document.getElementById('orgsBody');
  tbody.innerHTML = '';

  for (const org of orgs) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${org.id}</td>
      <td><a href="#" onclick="showOrg(${org.id})" class="text-decoration-none">${org.name}</a></td>
      <td><code>${short(org.chatgpt_account_id, 12)}</code></td>
      <td><span class="badge bg-info">${org.plan_type || '-'}</span></td>
      <td><span class="badge bg-secondary">${org.member_count}</span></td>
      <td>${org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}</td>
      <td>
        <button class="btn btn-outline-success btn-sm" onclick="autoInvite(${org.id})" title="Auto Invite">
          <i class="bi bi-send"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteOrg(${org.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function showOrg(id) {
  currentOrgId = id;
  const org = await API.get(`/api/orgs/${id}`);
  document.getElementById('orgModalTitle').textContent = org.name;

  let membersHtml = '<h6>Members</h6>';
  if (org.members && org.members.length > 0) {
    membersHtml += '<table class="table table-sm"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Invited</th></tr></thead><tbody>';
    for (const m of org.members) {
      membersHtml += `<tr>
        <td>${m.email}</td>
        <td>${m.role || 'member'}</td>
        <td><span class="badge bg-${statusColor(m.invite_status)}">${m.invite_status || 'pending'}</span></td>
        <td>${m.invited_at || '-'}</td>
      </tr>`;
    }
    membersHtml += '</tbody></table>';
  } else {
    membersHtml += '<p class="text-muted">No members yet</p>';
  }

  document.getElementById('orgDetail').innerHTML = `
    <div class="mb-3">
      <strong>Org Account ID:</strong> <code>${org.chatgpt_account_id}</code><br>
      <strong>Plan:</strong> ${org.plan_type || '-'}<br>
      <strong>Created:</strong> ${org.created_at}
    </div>
    ${membersHtml}
  `;

  document.getElementById('btnAutoInvite').onclick = () => autoInvite(id);
  new bootstrap.Modal(document.getElementById('orgModal')).show();
}

async function autoInvite(orgId) {
  if (!confirm('Auto-invite all accounts to this organization?')) return;
  showToast('Sending invites...', 'info');

  const result = await API.post(`/api/orgs/${orgId}/invite`, {});
  if (result.error) {
    showToast(result.error, 'danger');
    return;
  }

  showToast(`Invited: ${result.invited}, Failed: ${result.failed}`, result.failed > 0 ? 'warning' : 'success');
  if (result.errors?.length) {
    console.warn('Invite errors:', result.errors);
  }
  loadOrgs();
}

async function deleteOrg(id) {
  if (!confirm('Delete this organization?')) return;
  await API.del(`/api/orgs/${id}`);
  showToast('Organization deleted');
  loadOrgs();
}

function statusColor(status) {
  const colors = { pending: 'warning', sent: 'primary', joined: 'success', failed: 'danger' };
  return colors[status] || 'secondary';
}

// Load on page ready
loadOrgs();
