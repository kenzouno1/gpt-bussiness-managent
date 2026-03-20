---
title: "Multi-user Auth with Roles (JWT + SQLite)"
description: "Add login/register, JWT auth, admin/member roles, and user management to GPT Team Manager"
status: pending
priority: P1
effort: 6h
branch: master
tags: [auth, jwt, sqlite, bcrypt, roles]
created: 2026-03-20
---

# Auth Feature Plan

## Overview
Add multi-user authentication to the currently open GPT Team Manager app. All `/api/*` routes will be protected behind JWT. Admin role gets full access; member role is read-only for destructive operations.

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Backend — DB + Auth Middleware](./phase-01-backend-db-auth.md) | 1.5h | pending |
| 2 | [Backend — Auth Routes + User Management API](./phase-02-backend-auth-routes.md) | 1.5h | pending |
| 3 | [Frontend — Login Page + Auth Context](./phase-03-frontend-auth-context.md) | 1.5h | pending |
| 4 | [Frontend — Protected Routes + User UI](./phase-04-frontend-protected-routes.md) | 1h | pending |
| 5 | [Seed Admin + Docs](./phase-05-seed-and-docs.md) | 0.5h | pending |

## Key Dependencies
- `bcryptjs` must be installed (npm install bcryptjs) — Windows-friendly, no native bindings
- `jsonwebtoken` already installed
- JWT_SECRET env var required at runtime

## Files Overview

### New files
- `src/middleware/auth-middleware.js`
- `src/routes/auth-routes.js`
- `src/routes/user-routes.js`
- `client/src/pages/login-page.jsx`
- `client/src/context/auth-context.jsx`
- `client/src/components/layout/user-menu.jsx`

### Modified files
- `src/db/schema.sql` — add users table
- `src/server.js` — mount auth/user routes, apply auth middleware
- `client/src/App.jsx` — add login route + protected route wrapper
- `client/src/lib/api.js` — attach Bearer token to all requests
