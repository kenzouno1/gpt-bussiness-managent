const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth-middleware');

const router = Router();
const JWT_EXPIRES = '7d';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? OR email = ?'
  ).get(username, username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/register
// First user auto-becomes admin; subsequent blocked unless ALLOW_REGISTER=true
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password required' });
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const isFirstUser = userCount === 0;

  if (!isFirstUser && process.env.ALLOW_REGISTER !== 'true') {
    return res.status(403).json({ error: 'Registration is closed. Ask an admin to create your account.' });
  }

  const role = isFirstUser ? 'admin' : 'member';
  const password_hash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, password_hash, role);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, user: { id: result.lastInsertRowid, username, role } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — requires auth
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
