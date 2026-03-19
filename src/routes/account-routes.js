const { Router } = require('express');
const db = require('../db/database');
const { generateTOTP } = require('../services/totp-service');

const router = Router();

// List all accounts
router.get('/', (req, res) => {
  const accounts = db.prepare(`
    SELECT id, email, password, status, chatgpt_plan_type, chatgpt_account_id,
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

// Create account manually
router.post('/', (req, res) => {
  const { email, password, totp_secret, status } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = db.prepare(`
      INSERT INTO accounts (email, password, totp_secret, status)
      VALUES (?, ?, ?, ?)
    `).run(email, password || null, totp_secret || null, status || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Bulk import from text (email|password|2fa per line)
router.post('/bulk', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text content required' });

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO accounts (email, password, totp_secret)
    VALUES (?, ?, ?)
  `);

  let imported = 0, skipped = 0, errors = [];
  const importAll = db.transaction(() => {
    for (const line of lines) {
      try {
        const parts = line.split('|').map(p => p.trim());
        const email = parts[0];
        if (!email || !email.includes('@')) { skipped++; continue; }
        const result = insert.run(email, parts[1] || null, parts[2] || null);
        result.changes > 0 ? imported++ : skipped++;
      } catch (err) {
        errors.push(`${line}: ${err.message}`);
      }
    }
  });

  importAll();
  res.json({ imported, skipped, errors, total: lines.length });
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
