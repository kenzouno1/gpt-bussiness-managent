const { Router } = require('express');
const db = require('../db/database');
const { generateTOTP } = require('../services/totp-service');

const router = Router();

// List all accounts
router.get('/', (req, res) => {
  const accounts = db.prepare(`
    SELECT id, email, status, chatgpt_plan_type, chatgpt_account_id, created_at, imported_at
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

// Update account
router.put('/:id', (req, res) => {
  const { email, password, status, totp_secret } = req.body;
  const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Account not found' });

  db.prepare(`
    UPDATE accounts SET email = COALESCE(?, email), password = COALESCE(?, password),
    status = COALESCE(?, status), totp_secret = COALESCE(?, totp_secret) WHERE id = ?
  `).run(email, password, status, totp_secret, req.params.id);

  res.json({ success: true });
});

// Delete account
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Account not found' });
  res.json({ success: true });
});

module.exports = router;
