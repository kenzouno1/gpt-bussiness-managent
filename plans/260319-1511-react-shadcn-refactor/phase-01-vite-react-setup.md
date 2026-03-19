# Phase 1: Vite + React + Tailwind + shadcn Init

## Overview
- **Priority:** P1 (blocking all other phases)
- **Status:** pending
- **Effort:** 1h

Scaffold a React 19 app in `client/` with Vite, Tailwind CSS 4, and shadcn/ui initialized.

## Key Insights
- Project uses CommonJS (`"type": "commonjs"`) -- `client/` will be ESM (Vite default)
- shadcn/ui v2+ uses Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Vite proxy config handles `/api` forwarding to Express :3000

## Requirements

### Functional
- `npm run dev` in `client/` starts Vite on :5173
- API calls to `/api/*` proxy to `localhost:3000`
- shadcn CLI initialized, able to add components

### Non-Functional
- Separate `package.json` in `client/` (decoupled from backend)
- TypeScript not required (keep JS/JSX for parity with existing codebase)

## Architecture

```
client/
  src/
    main.jsx          # React entry
    App.jsx           # Root component
    lib/
      utils.js        # shadcn cn() helper
    components/
      ui/             # shadcn components land here
  index.html          # Vite entry HTML
  vite.config.js      # Proxy config
  package.json
  components.json     # shadcn config
  tailwind.config.js  # (if needed by shadcn)
  postcss.config.js
```

## Related Code Files
- **Create:** all files in `client/` above
- **Modify:** none
- **Delete:** none (old files removed in Phase 5)

## Implementation Steps

1. `cd` to project root, `npm create vite@latest client -- --template react`
2. `cd client && npm install`
3. Install Tailwind CSS 4: `npm install -D tailwindcss @tailwindcss/vite`
4. Update `vite.config.js`:
   - Add `@tailwindcss/vite` plugin
   - Add proxy: `server.proxy['/api'] = 'http://localhost:3000'`
5. Replace `src/index.css` with `@import "tailwindcss";`
6. Run `npx shadcn@latest init` -- select defaults (New York style, Zinc color)
7. Verify: `npm run dev` serves blank React page, Tailwind classes work
8. Install first shadcn component to verify: `npx shadcn@latest add button`
9. Render `<Button>` in `App.jsx` to confirm shadcn works

## Todo
- [ ] Scaffold Vite React app
- [ ] Install & configure Tailwind CSS 4
- [ ] Configure Vite proxy for `/api`
- [ ] Init shadcn/ui
- [ ] Verify full pipeline (React + Tailwind + shadcn)

## Success Criteria
- `npm run dev` in `client/` renders a page with a styled shadcn Button
- `/api/accounts` proxied from :5173 returns JSON from Express
- No errors in console

## Risk Assessment
- **shadcn init may prompt interactively** -- use `--defaults` flag or answer prompts
- **Tailwind v4 breaking changes** -- shadcn v2 docs cover this; follow their install guide
