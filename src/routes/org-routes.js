const { Router } = require('express');
const db = require('../db/database');
const { inviteToOrg, listInvites, revokeInvite } = require('../services/chatgpt-api-client');
const { requireAdmin } = require('../middleware/auth-middleware');
const { enqueueOrgSync, enqueueAllOrgSync, getOrgSyncStatus } = require('../services/org-sync-worker');

const router = Router();

// Helper: get admin session token for an org (returns token + account_id)
function getAdminToken(orgId) {
  const row = db.prepare(`
    SELECT a.session_token, a.id as account_id FROM org_members om
    JOIN accounts a ON a.id = om.account_id
    WHERE om.org_id = ? AND a.session_token IS NOT NULL LIMIT 1
  `).get(orgId);
  return row || null;
}

// Auto-expire invites older than 1 day — remove from DB so accounts become available again
function cleanExpiredInvites() {
  const expired = db.prepare(`
    DELETE FROM org_members
    WHERE invite_status IN ('sent', 'pending')
    AND invited_at IS NOT NULL
    AND datetime(invited_at) < datetime('now', '-1 day')
  `).run();
  return expired.changes;
}

// Get sync queue status (must be before /:id to avoid param capture)
router.get('/sync-status', (req, res) => {
  res.json(getOrgSyncStatus());
});

// Enqueue all orgs for validation + sync
router.post('/validate-all', (req, res) => {
  const result = enqueueAllOrgSync();
  res.json({ queued: true, ...result });
});

// List all organizations with member/invite counts
router.get('/', (req, res) => {
  // Auto-clean expired invites on every list request
  cleanExpiredInvites();
  const orgs = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM org_members WHERE org_id = o.id AND invite_status = 'joined') as member_count,
      (SELECT COUNT(*) FROM org_members WHERE org_id = o.id AND invite_status IN ('sent', 'pending')) as invite_count,
      owner_acc.email as owner_email,
      owner_acc.password as owner_password,
      owner_acc.totp_secret as owner_totp_secret
    FROM organizations o
    LEFT JOIN org_members owner_om ON owner_om.org_id = o.id AND owner_om.role = 'owner'
    LEFT JOIN accounts owner_acc ON owner_acc.id = owner_om.account_id
    ORDER BY o.id DESC
  `).all();
  res.json(orgs);
});

// Get org detail with members
router.get('/:id', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  const members = db.prepare(`
    SELECT om.*, a.email, a.chatgpt_plan_type
    FROM org_members om
    JOIN accounts a ON a.id = om.account_id
    WHERE om.org_id = ?
    ORDER BY om.role = 'owner' DESC, om.invite_status ASC
  `).all(req.params.id);

  res.json({ ...org, members });
});

// Enqueue org sync job
router.post('/:id/sync', (req, res) => {
  const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  const queued = enqueueOrgSync(org.id);
  res.json({ queued, message: queued ? 'Sync job queued' : 'Already in queue' });
});

// Auto-invite orphan accounts, max 4 per org
router.post('/:id/invite', async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  const admin = getAdminToken(req.params.id);
  if (!admin) return res.status(400).json({ error: 'No session token' });
  const token = admin.session_token;

  const MAX_INVITE = 4;
  // Only count joined members (not pending invites) toward limit
  const joinedCount = db.prepare(
    `SELECT COUNT(*) as c FROM org_members WHERE org_id = ? AND invite_status = 'joined' AND role != 'owner'`
  ).get(req.params.id).c;
  const slotsLeft = Math.max(0, MAX_INVITE - joinedCount);

  if (slotsLeft === 0) {
    return res.json({ invited: 0, failed: 0, errors: [], message: 'Đã đạt tối đa 4 thành viên' });
  }

  const { account_ids } = req.body;
  let accountsToInvite;
  if (account_ids?.length > 0) {
    const ph = account_ids.map(() => '?').join(',');
    accountsToInvite = db.prepare(`
      SELECT id, email FROM accounts WHERE id IN (${ph})
      AND id NOT IN (SELECT account_id FROM org_members) LIMIT ?
    `).all(...account_ids, slotsLeft);
  } else {
    accountsToInvite = db.prepare(`
      SELECT id, email FROM accounts
      WHERE id NOT IN (SELECT account_id FROM org_members) LIMIT ?
    `).all(slotsLeft);
  }

  const results = { invited: 0, failed: 0, errors: [] };
  const insertMember = db.prepare(`
    INSERT OR REPLACE INTO org_members (org_id, account_id, role, invited_at, invite_status)
    VALUES (?, ?, 'member', CURRENT_TIMESTAMP, ?)
  `);

  for (const account of accountsToInvite) {
    const result = await inviteToOrg(token, account.email);
    if (result.success) {
      insertMember.run(req.params.id, account.id, 'sent');
      results.invited++;
    } else {
      insertMember.run(req.params.id, account.id, 'failed');
      results.failed++;
      results.errors.push({ email: account.email, error: result.error });
    }
  }

  res.json(results);
});

// Revoke all pending invites for an org
router.post('/:id/revoke', async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  const admin = getAdminToken(req.params.id);
  if (!admin) return res.status(400).json({ error: 'No session token' });
  const token = admin.session_token;

  const invitesResult = await listInvites(token);
  if (!invitesResult.success) return res.json(invitesResult);

  const invites = invitesResult.data?.items || invitesResult.data?.invites || invitesResult.data || [];
  let revoked = 0, failed = 0;

  for (const invite of invites) {
    const id = invite.id || invite.invite_id;
    if (!id) continue;
    const r = await revokeInvite(token, id);
    r.success ? revoked++ : failed++;
  }

  // Remove invited (non-joined) members from DB
  db.prepare(`
    DELETE FROM org_members WHERE org_id = ? AND invite_status IN ('sent', 'pending')
  `).run(req.params.id);

  res.json({ revoked, failed, total: invites.length });
});

// Create org manually from email|password|2fa format
router.post('/', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Input required' });

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let created = 0, skipped = 0, errors = [];

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isTotp = (s) => /^[A-Z2-7]{16,64}$/i.test(s);
  const isJwt = (s) => /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(s);

  const insertAcc = db.prepare('INSERT OR IGNORE INTO accounts (email, password, totp_secret, session_token) VALUES (?, ?, ?, ?)');
  const findAcc = db.prepare('SELECT id FROM accounts WHERE email = ?');
  const insertOrg = db.prepare('INSERT OR IGNORE INTO organizations (chatgpt_account_id, name, plan_type) VALUES (?, ?, ?)');
  const findOrg = db.prepare('SELECT id FROM organizations WHERE chatgpt_account_id = ?');
  const insertMember = db.prepare('INSERT OR IGNORE INTO org_members (org_id, account_id, role, invite_status) VALUES (?, ?, ?, ?)');

  const newOrgIds = [];
  const importAll = db.transaction(() => {
    for (const line of lines) {
      try {
        const parts = line.split(/[|,;\t]+/).map(p => p.trim()).filter(Boolean);
        let email = null, password = null, totp = null, token = null;

        for (const part of parts) {
          if (!email && isEmail(part)) { email = part; }
          else if (!token && isJwt(part)) { token = part; }
          else if (!totp && isTotp(part)) { totp = part; }
          else if (!password) { password = part; }
        }

        if (!email) { skipped++; continue; }

        // Create/find account
        insertAcc.run(email, password, totp, token);
        const account = findAcc.get(email);
        if (!account) { skipped++; continue; }

        // Create org named after email prefix
        const orgId = email.split('@')[0];
        const orgName = `${email.split('@')[0]}`;
        const orgResult = insertOrg.run(orgId, orgName, 'free');
        const org = findOrg.get(orgId);
        if (!org) { skipped++; continue; }

        // Track newly created orgs for sync
        if (orgResult.changes > 0) newOrgIds.push(org.id);

        // Link as owner
        insertMember.run(org.id, account.id, 'owner', 'joined');
        created++;
      } catch (err) {
        errors.push(`${line.substring(0, 40)}: ${err.message}`);
      }
    }
  });

  importAll();

  // Enqueue sync for newly created orgs
  for (const id of newOrgIds) {
    enqueueOrgSync(id);
  }

  res.json({ created, skipped, errors, total: lines.length });
});

// Update org (name, owner token)
router.put('/:id', (req, res) => {
  const { name, session_token } = req.body;
  const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  if (name) {
    db.prepare('UPDATE organizations SET name = ? WHERE id = ?').run(name, req.params.id);
  }

  // Update owner account's session token
  if (session_token !== undefined) {
    const owner = db.prepare(`
      SELECT a.id FROM org_members om
      JOIN accounts a ON a.id = om.account_id
      WHERE om.org_id = ? AND om.role = 'owner' LIMIT 1
    `).get(req.params.id);

    if (owner) {
      db.prepare('UPDATE accounts SET session_token = ? WHERE id = ?').run(session_token, owner.id);
      // Reset sync status to re-validate
      db.prepare(`UPDATE organizations SET sync_status = 'pending', sync_error = NULL WHERE id = ?`).run(req.params.id);
    } else {
      return res.status(400).json({ error: 'No owner account found' });
    }
  }

  res.json({ success: true });
});

// Remove a member from org (admin only, cannot remove owner)
router.delete('/:id/members/:memberId', requireAdmin, (req, res) => {
  const member = db.prepare('SELECT * FROM org_members WHERE id = ? AND org_id = ?').get(req.params.memberId, req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.role === 'owner') return res.status(400).json({ error: 'Cannot remove owner' });

  db.prepare('DELETE FROM org_members WHERE id = ?').run(req.params.memberId);
  res.json({ success: true });
});

// Delete org (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM organizations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Org not found' });
  res.json({ success: true });
});

module.exports = router;
