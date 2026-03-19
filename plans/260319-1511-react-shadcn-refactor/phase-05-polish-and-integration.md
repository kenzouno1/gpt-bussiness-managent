# Phase 5: Dark Mode, Responsive, Cleanup

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 1h
- **Depends on:** Phases 3 & 4

Add dark mode toggle, responsive polish, production build config, and remove old vanilla files.

## Key Insights
- shadcn dark mode: add `dark` class to `<html>`, Tailwind handles rest
- Current CSS is 28 lines; all styling moves to Tailwind classes
- Production: Vite `build` can output to `src/public/` to serve from Express

## Requirements

### Functional
- Dark/light mode toggle in nav (persisted in localStorage)
- Responsive: sidebar collapses to hamburger on mobile, tables scroll horizontally
- Production build served by Express

### Non-Functional
- No FOUC (flash of unstyled content) on dark mode load
- Build output clean (no source maps in prod unless needed)

## Architecture

```
client/src/
  components/
    layout/
      theme-toggle.jsx     # Dark mode toggle button
  hooks/
    use-theme.js            # localStorage-backed theme state

  # vite.config.js update:
  build.outDir = '../src/public'  # Output to Express static dir
```

## Related Code Files
- **Create:** `theme-toggle.jsx`, `use-theme.js`
- **Modify:** `app-layout.jsx` (add theme toggle), `vite.config.js` (build output), `client/index.html` (dark class init script)
- **Delete:** old `src/public/index.html`, `src/public/orgs.html`, `src/public/js/`, `src/public/css/`
- **Modify:** `src/server.js` -- update static path if build output dir changes

## Implementation Steps

1. Create `hooks/use-theme.js`:
   - Read from `localStorage.getItem('theme')` or detect `prefers-color-scheme`
   - Toggle adds/removes `dark` class on `document.documentElement`
2. Create `components/layout/theme-toggle.jsx`:
   - Sun/Moon icon button using Lucide icons (bundled with shadcn)
   - Calls `useTheme().toggle()`
3. Add theme toggle to `app-layout.jsx` nav header
4. Add inline script to `client/index.html` `<head>` to set `dark` class before render (prevents FOUC):
   ```html
   <script>
     if(localStorage.theme==='dark'||(!'theme' in localStorage && matchMedia('(prefers-color-scheme:dark)').matches))
       document.documentElement.classList.add('dark')
   </script>
   ```
5. Responsive polish:
   - Tables: wrap in `overflow-x-auto` div (shadcn Table already handles this)
   - Sidebar: on `md:` breakpoint, show full sidebar; below, show top bar with hamburger
   - Test on 375px, 768px, 1024px viewports
6. Update `vite.config.js` build config:
   ```js
   build: {
     outDir: '../src/public',
     emptyOutDir: true
   }
   ```
7. Update root `package.json` scripts:
   ```json
   "build:client": "cd client && npm run build",
   "dev:client": "cd client && npm run dev"
   ```
8. Run `npm run build` in `client/`, verify `src/public/` has built React app
9. Start Express server, verify app loads from `localhost:3000`
10. Remove old vanilla files (they're replaced by build output):
    - Confirm build output includes `index.html` at `src/public/`
    - Old `orgs.html`, `js/`, `css/` dirs are replaced
11. Add SPA fallback in `server.js` (serve `index.html` for all non-API routes):
    ```js
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    ```

## Todo
- [ ] Create theme hook + toggle component
- [ ] Add FOUC prevention script
- [ ] Responsive layout polish
- [ ] Configure Vite build output to `src/public/`
- [ ] Add SPA fallback route in server.js
- [ ] Update root package.json scripts
- [ ] Build and verify production serving
- [ ] Remove/replace old vanilla files

## Success Criteria
- Dark mode toggles instantly, persists across refreshes
- Layout works on mobile (375px) through desktop
- `npm run build:client` produces working build in `src/public/`
- Express serves the React SPA at `localhost:3000`
- All routes work after refresh (SPA fallback)
- No old Bootstrap/vanilla code remains

## Risk Assessment
- **Build overwrites src/public/** -- `emptyOutDir: true` clears it; old files gone. Ensure git tracks the old files first (they're already committed)
- **SPA fallback vs API routes** -- fallback must come AFTER API route mounting in server.js
- **Vite base path** -- default `/` works since app is served from root
