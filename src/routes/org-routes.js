const { Router } = require('express');
const db = require('../db/database');
const { inviteToOrg } = require('../services/chatgpt-api-client');

const router = Router();

// List all organizations with member count
router.get('/', (req, res) => {
  const orgs = db.prepare(`
    SELECT o.*, COUNT(om.id) as member_count
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
    SELECT om.*, a.email, a.status, a.chatgpt_plan_type
    FROM org_members om
    JOIN accounts a ON a.id = om.account_id
    WHERE om.org_id = ?
  `).all(req.params.id);

  res.json({ ...org, members });
});

// Auto-invite: invite all accounts that have session tokens to this org
router.post('/:id/invite', async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Org not found' });

  // Get an admin token for this org (first account linked to it)
  const adminAccount = db.prepare(`
    SELECT a.session_token FROM org_members om
    JOIN accounts a ON a.id = om.account_id
    WHERE om.org_id = ? AND a.session_token IS NOT NULL
    LIMIT 1
  `).get(req.params.id);

  if (!adminAccount) {
    return res.status(400).json({ error: 'No account with session token found for this org' });
  }

  // Get accounts to invite (from request body or all accounts not yet in this org)
  const { account_ids } = req.body;
  let accountsToInvite;

  if (account_ids && account_ids.length > 0) {
    const placeholders = account_ids.map(() => '?').join(',');
    accountsToInvite = db.prepare(`
      SELECT id, email FROM accounts WHERE id IN (${placeholders})
      AND id NOT IN (SELECT account_id FROM org_members WHERE org_id = ?)
    `).all(...account_ids, req.params.id);
  } else {
    accountsToInvite = db.prepare(`
      SELECT id, email FROM accounts
      WHERE id NOT IN (SELECT account_id FROM org_members WHERE org_id = ?)
    `).all(req.params.id);
  }

  const results = { invited: 0, failed: 0, errors: [] };
  const updateMember = db.prepare(`
    INSERT OR REPLACE INTO org_members (org_id, account_id, role, invited_at, invite_status)
    VALUES (?, ?, 'member', CURRENT_TIMESTAMP, ?)
  `);

  for (const account of accountsToInvite) {
    const result = await inviteToOrg(adminAccount.session_token, account.email);
    if (result.success) {
      updateMember.run(req.params.id, account.id, 'sent');
      results.invited++;
    } else {
      updateMember.run(req.params.id, account.id, 'failed');
      results.failed++;
      results.errors.push({ email: account.email, error: result.error });
    }
  }

  res.json(results);
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
