const { Router } = require('express');
const db = require('../db/database');
const { generateTOTP } = require('../services/totp-service');
const { requireAdmin } = require('../middleware/auth-middleware');

const router = Router();

// List all accounts
router.get('/', (req, res) => {
  const accounts = db.prepare(`
    SELECT id, email, password, chatgpt_plan_type, chatgpt_account_id,
    totp_secret, session_token, created_at, imported_at
    FROM accounts ORDER BY id DESC
  `).all();
  res.json(accounts);
});

// Get single account
router.get('/:id', (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
});

// Get TOTP code for account
router.get('/:id/totp', (req, res) => {
  const account = db.prepare('SELECT totp_secret FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (!account.totp_secret) return res.json({ code: null, error: 'No 2FA secret' });

  try {
    const totp = generateTOTP(account.totp_secret);
    res.json(totp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get account status groups (orphan, invited, joined)
router.get('/stats/groups', (req, res) => {
  const orphans = db.prepare('SELECT id FROM accounts WHERE id NOT IN (SELECT account_id FROM org_members)').all();
  const invited = db.prepare(`SELECT DISTINCT account_id as id FROM org_members WHERE invite_status IN ('sent', 'pending')`).all();
  const joined = db.prepare(`SELECT DISTINCT account_id as id FROM org_members WHERE invite_status = 'joined'`).all();
  res.json({
    orphan: { count: orphans.length, ids: orphans.map(r => r.id) },
    invited: { count: invited.length, ids: invited.map(r => r.id) },
    joined: { count: joined.length, ids: joined.map(r => r.id) },
  });
});

// Create account manually
router.post('/', (req, res) => {
  const { email, password, totp_secret } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = db.prepare(`
      INSERT INTO accounts (email, password, totp_secret)
      VALUES (?, ?, ?)
    `).run(email, password || null, totp_secret || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Bulk import from text — auto-detect fields via regex (admin only)
// Supports any order: email, password, 2FA (TOTP base32), JWT token
router.post('/bulk', requireAdmin, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text content required' });

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const insert = db.prepare(`
    INSERT INTO accounts (email, password, totp_secret, session_token)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password = COALESCE(excluded.password, password),
      totp_secret = COALESCE(excluded.totp_secret, totp_secret),
      session_token = COALESCE(excluded.session_token, session_token)
  `);

  // Regex patterns for smart field detection
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isTotp = (s) => /^[A-Z2-7]{16,64}$/i.test(s);
  const isJwt = (s) => /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);

  let imported = 0, skipped = 0, errors = [];
  const importAll = db.transaction(() => {
    for (const line of lines) {
      try {
        // Split by common delimiters: | , ; tab space
        const parts = line.split(/[|,;\t]+/).map(p => p.trim()).filter(Boolean);
        let email = null, password = null, totp = null, token = null;

        for (const part of parts) {
          if (!email && isEmail(part)) { email = part; }
          else if (!token && isJwt(part)) { token = part; }
          else if (!totp && isTotp(part)) { totp = part; }
          else if (!password) { password = part; }
        }

        if (!email) { skipped++; continue; }
        const exists = db.prepare('SELECT 1 FROM accounts WHERE email = ?').get(email);
        insert.run(email, password, totp, token);
        exists ? skipped++ : imported++;
      } catch (err) {
        errors.push(`${line.substring(0, 50)}: ${err.message}`);
      }
    }
  });

  importAll();
  res.json({ imported, skipped, errors, total: lines.length });
});

// Update account
router.put('/:id', (req, res) => {
  const { email, password, totp_secret } = req.body;
  const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Account not found' });

  db.prepare(`
    UPDATE accounts SET email = COALESCE(?, email), password = COALESCE(?, password),
    totp_secret = COALESCE(?, totp_secret) WHERE id = ?
  `).run(email, password, totp_secret, req.params.id);

  res.json({ success: true });
});

// Bulk delete accounts (admin only) — unlinks org memberships first
router.post('/bulk-delete', requireAdmin, (req, res) => {
  const rawIds = req.body.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) return res.status(400).json({ error: 'No IDs provided' });
  const ids = rawIds.filter(id => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return res.status(400).json({ error: 'No valid IDs provided' });

  const delMembers = db.prepare('DELETE FROM org_members WHERE account_id = ?');
  const delAccount = db.prepare('DELETE FROM accounts WHERE id = ?');
  const deleteAll = db.transaction((accountIds) => {
    let deleted = 0;
    for (const id of accountIds) {
      delMembers.run(id);
      deleted += delAccount.run(id).changes;
    }
    return deleted;
  });

  const deleted = deleteAll(ids);
  res.json({ success: true, deleted });
});

// Delete account (admin only) — unlinks org memberships first
router.delete('/:id', requireAdmin, (req, res) => {
  const exists = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Account not found' });

  db.prepare('DELETE FROM org_members WHERE account_id = ?').run(req.params.id);
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
