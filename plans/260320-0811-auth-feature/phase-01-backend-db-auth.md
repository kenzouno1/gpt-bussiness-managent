---
phase: 1
title: "Backend — DB Schema + Auth Middleware"
effort: 1.5h
status: pending
---

# Phase 1 — Backend: DB Schema + Auth Middleware

## Context Links
- Schema: `src/db/schema.sql`
- DB module: `src/db/database.js`
- Server entry: `src/server.js`

## Overview
Add `users` table to SQLite schema and create JWT auth middleware that protects all `/api/*` routes. Also create admin-only middleware for destructive operations.

## Requirements
- `users` table: id, username, email, password_hash, role (admin|member), created_at
- JWT verified on every `/api/*` request (except `/api/auth/*`)
- `req.user` populated with `{ id, username, role }` after successful verify
- Admin middleware: returns 403 if role != 'admin'
- 401 on missing/invalid token, clear error message

## Install Step
```bash
npm install bcryptjs
```

## Files to Modify
- `src/db/schema.sql` — append users table + index

## Files to Create
- `src/middleware/auth-middleware.js`

---

## Implementation Steps

### Step 1 — Add users table to schema.sql

Append to end of `src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

> `database.js` runs `db.exec(schema)` on startup — `CREATE TABLE IF NOT EXISTS` means it is safe to append; existing DBs won't be broken.

### Step 2 — Create auth-middleware.js

Create `src/middleware/auth-middleware.js`:

```js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
```

### Step 3 — Apply middleware in server.js

In `src/server.js`, mount auth middleware **before** existing API routes:

```js
const { requireAuth } = require('./middleware/auth-middleware');
const authRoutes = require('./routes/auth-routes');
const userRoutes = require('./routes/user-routes');

// Public auth routes (no JWT needed)
app.use('/api/auth', authRoutes);

// Protect all other API routes
app.use('/api', requireAuth);

// Existing routes stay as-is
app.use('/api/accounts', accountRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/import', importRoutes);

// Admin-only user management
app.use('/api/users', userRoutes);
```

> Order matters in Express: `/api/auth` must be registered before `app.use('/api', requireAuth)`.

---

## Todo

- [ ] Run `npm install bcryptjs`
- [ ] Append users table to `src/db/schema.sql`
- [ ] Create `src/middleware/auth-middleware.js`
- [ ] Update `src/server.js` to mount middleware + new routes

## Success Criteria
- Server starts without errors
- `GET /api/accounts` returns 401 when called without token
- `GET /api/auth/...` is reachable without token (tested in Phase 2)
- `users` table exists in `data/gpt-team.db` after server start

## Risk
- Forgetting to register `/api/auth` before `requireAuth` → login route becomes 401 locked (easy to catch in testing)
- `JWT_SECRET` default value is for dev only — production must set env var
