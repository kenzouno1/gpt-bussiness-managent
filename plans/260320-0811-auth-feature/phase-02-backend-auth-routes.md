---
phase: 2
title: "Backend — Auth Routes + User Management API"
effort: 1.5h
status: pending
---

# Phase 2 — Backend: Auth Routes + User Management API

## Context Links
- Phase 1: `phase-01-backend-db-auth.md`
- DB module: `src/db/database.js`
- Auth middleware: `src/middleware/auth-middleware.js`
- Account routes (pattern reference): `src/routes/account-routes.js`

## Overview
Create two route files:
1. `auth-routes.js` — public endpoints: login, register, me
2. `user-routes.js` — admin-only CRUD for managing users

## Requirements
- `POST /api/auth/login` — username/email + password, returns JWT
- `POST /api/auth/register` — create account (admin-only in prod; first user auto-becomes admin)
- `GET /api/auth/me` — returns current user info (requires auth)
- `GET /api/users` — list all users (admin only)
- `POST /api/users` — create user (admin only)
- `PUT /api/users/:id` — update user role/password (admin only)
- `DELETE /api/users/:id` — delete user (admin only, cannot delete self)
- Passwords hashed with bcryptjs (saltRounds = 10)
- JWT payload: `{ id, username, role }`, expires in `7d`

## Files to Create
- `src/routes/auth-routes.js`
- `src/routes/user-routes.js`

---

## Implementation Steps

### Step 1 — Create auth-routes.js

Create `src/routes/auth-routes.js`:

```js
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth-middleware');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
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
// First user ever → admin; subsequent → member (or blocked if ALLOW_REGISTER=false)
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password required' });
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const isFirstUser = userCount === 0;

  // Block open registration unless it's the first user or env allows it
  if (!isFirstUser && process.env.ALLOW_REGISTER !== 'true') {
    return res.status(403).json({ error: 'Registration is closed. Ask an admin to create your account.' });
  }

  const role = isFirstUser ? 'admin' : 'member';
  const password_hash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, password_hash, role);

    const token = jwt.sign({ id: result.lastInsertRowid, username, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
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
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
```

### Step 2 — Create user-routes.js

Create `src/routes/user-routes.js`:

```js
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth-middleware');

const router = Router();

// All user management routes require admin role
router.use(requireAdmin);

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, role, created_at FROM users ORDER BY id ASC'
  ).all();
  res.json(users);
});

// POST /api/users — admin creates a user
router.post('/', (req, res) => {
  const { username, email, password, role = 'member' } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password required' });
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or member' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, password_hash, role);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — update role or password
router.put('/:id', (req, res) => {
  const { role, password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role) {
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin or member' });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  }

  if (password) {
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.params.id);
  }

  res.json({ success: true });
});

// DELETE /api/users/:id — cannot delete self
router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

module.exports = router;
```

### Step 3 — Apply admin middleware to destructive account/org routes

In `src/server.js`, import `requireAdmin` and add it selectively to routes that should be admin-only. The cleanest approach is to apply `requireAdmin` inline on specific routes **inside** the existing route files using a second argument, OR mount an admin sub-router. The simplest approach: add `requireAdmin` as a second middleware param in `server.js` for the import route only (bulk/destructive):

```js
const { requireAuth, requireAdmin } = require('./middleware/auth-middleware');

// Import route is admin-only
app.use('/api/import', requireAdmin, importRoutes);
```

For `DELETE` and bulk `POST` inside account/org routes, the easiest KISS approach: add `requireAdmin` inside those route handlers directly using `router.delete('/:id', requireAdmin, handler)` in each route file. See Phase 2 notes in each file.

---

## Admin-only Operations (for implementer to apply in route files)

| Route | Method | File |
|-------|--------|------|
| `DELETE /api/accounts/:id` | DELETE | account-routes.js |
| `POST /api/accounts/bulk` | POST | account-routes.js |
| `DELETE /api/orgs/:id` | DELETE | org-routes.js |
| `DELETE /api/orgs/:id/members/:memberId` | DELETE | org-routes.js |
| `POST /api/import` | all | server.js (middleware) |

Apply `requireAdmin` as second arg: `router.delete('/:id', requireAdmin, (req, res) => { ... })`

---

## Todo

- [ ] Create `src/routes/auth-routes.js`
- [ ] Create `src/routes/user-routes.js`
- [ ] Update `src/server.js` to mount auth + user routes (per Phase 1 Step 3)
- [ ] Add `requireAdmin` to destructive routes in `account-routes.js`
- [ ] Add `requireAdmin` to destructive routes in `org-routes.js`
- [ ] Mount `/api/import` with `requireAdmin` in `server.js`

## Success Criteria
- `POST /api/auth/register` (first call) → creates admin user, returns JWT
- `POST /api/auth/login` → returns JWT with correct role
- `GET /api/auth/me` with token → returns user info
- `DELETE /api/accounts/1` without token → 401
- `DELETE /api/accounts/1` with member token → 403
- `DELETE /api/accounts/1` with admin token → 200
- `GET /api/users` with admin token → lists users

## Security Notes
- Never return `password_hash` in any response
- `JWT_SECRET` fallback `'dev-secret-change-in-prod'` must be overridden in production via env var
- bcrypt saltRounds=10 is the standard safe default (~100ms hash time)
