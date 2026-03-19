---
title: "React + shadcn/ui Frontend Refactor"
description: "Migrate GPT Team Manager from vanilla HTML/JS to React 19 + Vite + shadcn/ui"
status: pending
priority: P1
effort: 8h
branch: feat/react-shadcn-refactor
tags: [frontend, react, shadcn, refactor]
created: 2026-03-19
---

# React + shadcn/ui Frontend Refactor

## Goal
Replace 6 vanilla HTML/JS/CSS files in `src/public/` with a React 19 SPA in `client/`.
Backend (Express 5 on :3000) stays untouched.

## Current State
- Bootstrap 5 + vanilla JS, 2 HTML pages, 3 JS files, 1 CSS file
- ~450 lines total frontend code
- Key features: account CRUD, TOTP polling (1s), CSV import, org CRUD, auto-invite

## Target Stack
- React 19 + Vite (dev :5173, proxy to :3000)
- shadcn/ui (Radix + Tailwind CSS 4)
- React Router v7 (2 routes)
- TanStack Table (DataTable pattern)
- Custom `useTotp` hook for real-time 2FA

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Vite + React + Tailwind + shadcn init](phase-01-vite-react-setup.md) | pending | 1h |
| 2 | [Layout shell + React Router](phase-02-layout-and-routing.md) | pending | 1.5h |
| 3 | [Accounts page (DataTable, CSV, TOTP)](phase-03-accounts-page.md) | pending | 2.5h |
| 4 | [Orgs page (DataTable, detail, invite)](phase-04-orgs-page.md) | pending | 2h |
| 5 | [Dark mode, responsive, cleanup](phase-05-polish-and-integration.md) | pending | 1h |

## Key Decisions
- `client/` dir separate from `src/` backend; Vite proxies `/api` to Express
- No state management lib (React state + fetch sufficient for this scale)
- shadcn components: Button, Input, Badge, Card, Table, Dialog, Sheet, Tabs, Toast (Sonner)
- TOTP polling via `useEffect` + `setInterval` in custom hook
- Production build output to `src/public/` (replaces old files) or served separately

## Dependencies
- Phase 2 depends on Phase 1
- Phases 3 & 4 can run in parallel after Phase 2
- Phase 5 runs after 3 & 4
