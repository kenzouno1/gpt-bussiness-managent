---
phase: 5
title: "Seed Admin + Env Docs"
effort: 0.5h
status: pending
---

# Phase 5 — Seed Admin User + Environment Docs

## Context Links
- Phase 1–4 must be complete
- Server entry: `src/server.js`
- Schema: `src/db/schema.sql`

## Overview
Two small tasks:
1. Create a CLI seed script so the first admin can be bootstrapped without hitting the API manually
2. Document the required environment variables

## Files to Create
- `src/scripts/seed-admin.js`
- `.env.example`

---

## Implementation Steps

### Step 1 — Create seed-admin.js

Create `src/scripts/seed-admin.js`:

```js
#!/usr/bin/env node
/**
 * Seed the first admin user.
 * Usage: node src/scripts/seed-admin.js
 * Env vars: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 */
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const username = process.env.ADMIN_USERNAME || 'admin';
const email = process.env.ADMIN_EMAIL || 'admin@local.dev';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Error: ADMIN_PASSWORD env var is required');
  console.error('Usage: ADMIN_PASSWORD=secret node src/scripts/seed-admin.js');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log(`User "${username}" already exists (id=${existing.id}). Nothing to do.`);
  process.exit(0);
}

const password_hash = bcrypt.hashSync(password, 10);
const result = db.prepare(
  'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
).run(username, email, password_hash, 'admin');

console.log(`Admin user created: username="${username}", id=${result.lastInsertRowid}`);
```

Usage:
```bash
ADMIN_PASSWORD=mysecret node src/scripts/seed-admin.js
# or with custom username/email:
ADMIN_USERNAME=boss ADMIN_EMAIL=boss@company.com ADMIN_PASSWORD=mysecret node src/scripts/seed-admin.js
```

Add to `package.json` scripts for convenience:
```json
"seed:admin": "node src/scripts/seed-admin.js"
```

Then run: `ADMIN_PASSWORD=mysecret npm run seed:admin`

### Step 2 — Create .env.example

Create `.env.example` at project root:

```env
# JWT signing secret — CHANGE THIS in production (min 32 chars recommended)
JWT_SECRET=dev-secret-change-in-prod

# Set to 'true' to allow anyone to self-register (default: false, first user only)
ALLOW_REGISTER=false

# Admin seed vars (only used by seed:admin script)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@local.dev
ADMIN_PASSWORD=changeme
```

### Step 3 — Verify .gitignore covers .env

Check that `.env` (not `.env.example`) is listed in `.gitignore`. If not, add it:

```
.env
```

### Step 4 — Add startup note to README (optional)

If a `README.md` exists, add a "First Run" section:

```markdown
## First Run

1. Install dependencies: `npm install && cd client && npm install`
2. Copy env file: `cp .env.example .env` and set `JWT_SECRET`
3. Seed admin: `ADMIN_PASSWORD=yourpassword npm run seed:admin`
4. Start server: `npm run dev`
5. Open http://localhost:3000 and log in
```

---

## Todo

- [ ] Create `src/scripts/seed-admin.js`
- [ ] Create `.env.example` at project root
- [ ] Add `"seed:admin"` to `package.json` scripts
- [ ] Verify `.env` is in `.gitignore`
- [ ] Run seed script to create the first admin and test login end-to-end

## Success Criteria
- `ADMIN_PASSWORD=test123 npm run seed:admin` creates an admin user without errors
- Running seed script a second time prints "already exists" and exits cleanly
- Login with seeded credentials returns a valid JWT
- `.env` is not committed to git; `.env.example` is

## Notes
- The `/api/auth/register` endpoint already handles first-user-becomes-admin automatically, so the seed script is just an alternative for environments where you want to avoid opening the register endpoint at all (`ALLOW_REGISTER=false` is the default)
- `JWT_SECRET` should be a long random string in production: `openssl rand -base64 32`
