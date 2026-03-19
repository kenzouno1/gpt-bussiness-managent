---
title: "ChatGPT Team Manager Web App"
description: "Admin tool to manage GPT accounts, organizations, 2FA codes, and bulk org invites"
status: pending
priority: P1
effort: 12h
branch: main
tags: [node, express, sqlite, bootstrap, admin-tool]
created: 2026-03-19
---

# ChatGPT Team Manager

Admin web app to import/manage 25+ ChatGPT accounts from CSV, auto-create orgs from JWT tokens, display real-time TOTP codes, and bulk-invite accounts to organizations.

## Tech Stack
- **Backend:** Node.js + Express + better-sqlite3
- **Frontend:** Vanilla HTML/JS + Bootstrap 5
- **Libs:** papaparse (CSV), otpauth (TOTP), jsonwebtoken (JWT decode)

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Project Setup](phase-01-project-setup.md) | pending | 1h |
| 2 | [Database Schema](phase-02-database-schema.md) | pending | 1h |
| 3 | [Backend API](phase-03-backend-api.md) | pending | 3h |
| 4 | [Frontend UI](phase-04-frontend-ui.md) | pending | 3h |
| 5 | [CSV Import](phase-05-csv-import.md) | pending | 1.5h |
| 6 | [TOTP Real-time](phase-06-totp-realtime.md) | pending | 1h |
| 7 | [Org Invite](phase-07-org-invite.md) | pending | 1.5h |

## Dependencies
- Phase 2 depends on Phase 1
- Phases 3-7 depend on Phase 2
- Phase 4 depends on Phase 3
- Phases 5, 6, 7 can be built incrementally on top of Phase 3+4

## Key Decisions
- SQLite file-based DB (no server setup, portable)
- JWT decoded client-side at import time only (no verification needed)
- TOTP generated server-side to keep secrets off the frontend
- Org invite uses pluggable API client (ChatGPT internal API TBD)
- No auth on admin UI (local tool, not public-facing)

## Project Structure
```
src/
  server.js              # Express entry point
  db/
    schema.sql           # DDL
    database.js          # DB init + helpers
  routes/
    account-routes.js    # /api/accounts/*
    org-routes.js        # /api/orgs/*
    import-routes.js     # /api/accounts/import
  services/
    csv-import-service.js
    totp-service.js
    chatgpt-api-client.js
  public/
    index.html           # Accounts list
    orgs.html            # Orgs list
    js/app.js            # Shared fetch helpers
    js/accounts.js       # Account page logic
    js/orgs.js           # Org page logic
    css/styles.css       # Custom overrides
```
