const { Router } = require('express');
const db = require('../db/database');
const { inviteToOrg, listOrgMembers, listInvites, revokeInvite } = require('../services/chatgpt-api-client');

const router = Router();

// Helper: get admin session token for an org
function getAdminToken(orgId) {
  const row = db.prepare(`
    SELECT a.session_token FROM org_members om
    JOIN accounts a ON a.id = om.account_id
    WHERE om.org_id = ? AND a.session_token IS NOT NULL LIMIT 1
  `).get(orgId);
  return row?.session_token || null;
}

// List all organizations with member/invite counts
router.get('/', (req, res) => {
  const orgs = db.prepare(`
    SELECT o.*,
      COUNT(CASE WHEN om.invite_status = 'joined' THEN 1 END) as member_count,
      COUNT(CASE WHEN om.invite_status IN ('sent', 'pending') THEN 1 END) as invite_count,
      COUNT(om.id) as total_count
    FROM organizations o
    LEFT JOIN org_members om ON om.org_id = o.id
    GROUP BY o.id ORDER BY o.id DESC
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

// Sync org members from ChatGPT API
router.post('/:id/sync', async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  const token = getAdminToken(req.params.id);
  if (!token) return res.status(400).json({ error: 'No session token' });

  // Fetch actual members from ChatGPT API
  const membersResult = await listOrgMembers(token);
  const invitesResult = await listInvites(token);

  const synced = { members: 0, invites: 0, errors: [] };

  if (membersResult.success) {
    const apiMembers = membersResult.data?.members || membersResult.data || [];
    // Update existing org_members to 'joined' if they appear in API members list
    for (const m of apiMembers) {
      const email = m.email || m.user?.email;
      if (!email) continue;
      const account = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
      if (account) {
        db.prepare(`
          INSERT OR REPLACE INTO org_members (org_id, account_id, role, invite_status)
          VALUES (?, ?, ?, 'joined')
        `).run(req.params.id, account.id, m.role || 'member');
        synced.members++;
      }
    }
  } else {
    synced.errors.push(`Members: ${membersResult.error}`);
  }

  if (invitesResult.success) {
    const apiInvites = invitesResult.data?.invites || invitesResult.data || [];
    for (const inv of apiInvites) {
      const email = inv.email;
      if (!email) continue;
      const account = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
      if (account) {
        // Mark as invited (not yet joined)
        const existing = db.prepare(
          'SELECT invite_status FROM org_members WHERE org_id = ? AND account_id = ?'
        ).get(req.params.id, account.id);
        if (!existing || existing.invite_status !== 'joined') {
          db.prepare(`
            INSERT OR REPLACE INTO org_members (org_id, account_id, role, invited_at, invite_status)
            VALUES (?, ?, 'member', CURRENT_TIMESTAMP, 'sent')
          `).run(req.params.id, account.id);
          synced.invites++;
        }
      }
    }
  } else {
    synced.errors.push(`Invites: ${invitesResult.error}`);
  }

  res.json(synced);
});

// Auto-invite orphan accounts, max 4 per org
router.post('/:id/invite', async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  const token = getAdminToken(req.params.id);
  if (!token) return res.status(400).json({ error: 'No session token' });

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

  const token = getAdminToken(req.params.id);
  if (!token) return res.status(400).json({ error: 'No session token' });

  const invitesResult = await listInvites(token);
  if (!invitesResult.success) return res.json(invitesResult);

  const invites = invitesResult.data?.invites || invitesResult.data || [];
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

// Update org name
router.put('/:id', (req, res) => {
  const { name } = req.body;
  const result = db.prepare('UPDATE organizations SET name = ? WHERE id = ?').run(name, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Org not found' });
  res.json({ success: true });
});

// Delete org
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM organizations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Org not found' });
  res.json({ success: true });
});

module.exports = router;
