const db = require('../db/database');
const { checkToken, listOrgMembers, listInvites } = require('./chatgpt-api-client');
const JobQueue = require('./job-queue');

// Dedicated queue for org sync — 3s delay between orgs
const syncQueue = new JobQueue('org-sync', { delayMs: 3000 });

/** Get admin session token for an org */
function getAdminToken(orgId) {
  return db.prepare(`
    SELECT a.session_token, a.id as account_id FROM org_members om
    JOIN accounts a ON a.id = om.account_id
    WHERE om.org_id = ? AND a.session_token IS NOT NULL LIMIT 1
  `).get(orgId) || null;
}

/**
 * Sync org members/invites from ChatGPT API.
 * Extracted from org-routes POST /:id/sync
 */
async function syncOrg(orgId) {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
  if (!org) return { success: false, error: 'Org not found' };

  const admin = getAdminToken(orgId);
  if (!admin) {
    db.prepare(`UPDATE organizations SET sync_status = 'no_credential', sync_error = 'No session token', last_synced = CURRENT_TIMESTAMP WHERE id = ?`).run(orgId);
    return { success: false, sync_status: 'no_credential', error: 'No session token' };
  }

  const token = admin.session_token;
  const wsId = org.chatgpt_account_id;
  const membersResult = await listOrgMembers(token, wsId);
  const invitesResult = await listInvites(token, wsId);
  const synced = { members: 0, invites: 0, errors: [] };

  // Both fail → token invalid
  if (!membersResult.success && !invitesResult.success) {
    const errMsg = membersResult.error || invitesResult.error || 'Unknown error';
    const status = errMsg.includes('403') || errMsg.includes('401') ? 'invalid' : 'failed';
    db.prepare(`UPDATE organizations SET sync_status = ?, sync_error = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status, errMsg, orgId);
    return { success: false, sync_status: status, error: errMsg };
  }

  // Collect account IDs confirmed by API (members + invites) to prune stale entries
  const apiAccountIds = new Set();

  // Pre-fetch owner account_id to protect from role downgrade during sync
  const ownerAccountId = db.prepare(
    'SELECT account_id FROM org_members WHERE org_id = ? AND role = ?'
  ).get(orgId, 'owner')?.account_id;

  // Process invites FIRST so pending accounts are marked 'sent',
  // then members overwrite to 'joined' for those who actually accepted.
  if (invitesResult.success) {
    const apiInvites = invitesResult.data?.items || invitesResult.data?.invites || invitesResult.data || [];
    for (const inv of apiInvites) {
      const email = inv.email;
      if (!email) continue;
      const account = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
      if (account) {
        apiAccountIds.add(account.id);
        // Skip owner — don't downgrade role via invite processing
        if (account.id === ownerAccountId) continue;
        db.prepare(`INSERT OR REPLACE INTO org_members (org_id, account_id, role, invited_at, invite_status) VALUES (?, ?, 'member', CURRENT_TIMESTAMP, 'sent')`)
          .run(orgId, account.id);
        synced.invites++;
      }
    }
  } else {
    synced.errors.push(`Invites: ${invitesResult.error}`);
  }

  if (membersResult.success) {
    const apiMembers = membersResult.data?.items || membersResult.data?.members || membersResult.data || [];
    for (const m of apiMembers) {
      const email = m.email || m.user?.email;
      if (!email) continue;
      const account = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
      if (account) {
        apiAccountIds.add(account.id);
        // Skip owner — never overwrite owner role from API
        if (account.id === ownerAccountId) continue;
        const role = m.role || 'member';
        db.prepare(`INSERT OR REPLACE INTO org_members (org_id, account_id, role, invite_status) VALUES (?, ?, ?, 'joined')`)
          .run(orgId, account.id, role);
        synced.members++;
      }
    }
  } else {
    synced.errors.push(`Members: ${membersResult.error}`);
  }

  // Remove stale members not present in API response, but NEVER remove the owner
  if (membersResult.success && apiAccountIds.size > 0) {
    const stale = db.prepare(
      `SELECT id, account_id FROM org_members WHERE org_id = ?`
    ).all(orgId);
    let removed = 0;
    for (const row of stale) {
      if (!apiAccountIds.has(row.account_id) && row.account_id !== ownerAccountId) {
        db.prepare('DELETE FROM org_members WHERE id = ?').run(row.id);
        removed++;
      }
    }
    synced.removed = removed;
  }

  db.prepare(`UPDATE organizations SET sync_status = 'healthy', sync_error = NULL, last_synced = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(orgId);

  return { success: true, sync_status: 'healthy', ...synced };
}

/**
 * Validate single org token — check plan, subscription status.
 * Extracted from org-routes POST /validate-all loop body.
 */
async function validateOrg(orgId) {
  const org = db.prepare('SELECT id, chatgpt_account_id FROM organizations WHERE id = ?').get(orgId);
  if (!org) return { success: false, error: 'Org not found' };

  const admin = getAdminToken(orgId);
  if (!admin) {
    db.prepare(`UPDATE organizations SET sync_status = 'no_credential', sync_error = 'No session token', last_synced = CURRENT_TIMESTAMP WHERE id = ?`).run(orgId);
    return { success: false, status: 'no_credential' };
  }

  const result = await checkToken(admin.session_token);
  if (!result.success) {
    const status = result.error?.includes('403') || result.error?.includes('401') ? 'invalid' : 'failed';
    db.prepare(`UPDATE organizations SET sync_status = ?, sync_error = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status, result.error, orgId);
    return { success: false, status };
  }

  const allAccounts = result.data?.accounts || {};
  const accountIds = Object.keys(allAccounts).filter(k => k !== 'default');

  // Find team/workspace account
  let accData = null, entitlement = null, matchedId = null;
  for (const [accId, accInfo] of Object.entries(allAccounts)) {
    if (accId === 'default') continue;
    const a = accInfo?.account;
    if (a?.structure === 'workspace' || a?.plan_type === 'team') {
      accData = a;
      entitlement = accInfo?.entitlement;
      matchedId = accId;
      break;
    }
  }

  // Fix chatgpt_account_id if needed
  if (matchedId && matchedId !== org.chatgpt_account_id) {
    const existing = db.prepare('SELECT id FROM organizations WHERE chatgpt_account_id = ? AND id != ?').get(matchedId, orgId);
    if (!existing) {
      db.prepare('UPDATE organizations SET chatgpt_account_id = ? WHERE id = ?').run(matchedId, orgId);
    }
  }

  if (!accData) {
    db.prepare(`UPDATE organizations SET sync_status = 'invalid', sync_error = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(`No team account. Found: ${accountIds.join(', ')}`, orgId);
    return { success: false, status: 'invalid' };
  }

  const hasActiveSub = entitlement?.has_active_subscription === true;
  if (!hasActiveSub) {
    db.prepare(`UPDATE organizations SET sync_status = 'invalid', sync_error = ?, plan_type = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(`Plan: ${accData.plan_type}, Active: false`, accData.plan_type, orgId);
    return { success: false, status: 'invalid' };
  }

  db.prepare(`
    UPDATE organizations SET
      sync_status = 'healthy', sync_error = NULL, last_synced = CURRENT_TIMESTAMP,
      plan_type = ?, name = COALESCE(?, name)
    WHERE id = ?
  `).run(accData.plan_type, accData.name, orgId);

  return { success: true, status: 'healthy' };
}

// Register queue handler — each job runs validateOrg then syncOrg
syncQueue.process(async (job) => {
  const orgId = job.data.orgId;
  const validateResult = await validateOrg(orgId);
  // Only sync members if validation passed
  if (validateResult.success) {
    return await syncOrg(orgId);
  }
  return validateResult;
});

/** Enqueue single org for sync */
function enqueueOrgSync(orgId) {
  return syncQueue.add(`org-${orgId}`, { orgId });
}

/** Enqueue all orgs for sync */
function enqueueAllOrgSync() {
  const orgs = db.prepare('SELECT id FROM organizations').all();
  let queued = 0;
  for (const org of orgs) {
    if (syncQueue.add(`org-${org.id}`, { orgId: org.id })) queued++;
  }
  return { queued, total: orgs.length };
}

/** Get sync queue status */
function getOrgSyncStatus() {
  return syncQueue.getStatus();
}

module.exports = { syncOrg, validateOrg, enqueueOrgSync, enqueueAllOrgSync, getOrgSyncStatus };
