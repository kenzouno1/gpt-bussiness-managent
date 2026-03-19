# Phase 2: Layout Shell + React Router

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h
- **Depends on:** Phase 1

Build the app shell (sidebar nav), React Router with 2 routes, shared API utility, and toast provider.

## Key Insights
- Current app: 2 pages, simple top navbar with links
- shadcn has a Sidebar component but it's heavy; a simple responsive sidebar or top nav suffices
- Sonner (shadcn toast) replaces the custom `showToast()` function

## Requirements

### Functional
- Sidebar or top nav with "Accounts" and "Organizations" links
- Active link highlighting
- React Router: `/` = Accounts, `/orgs` = Organizations
- Toast notifications available globally
- Shared API helper module (`api.js`)

### Non-Functional
- Layout responsive (collapses on mobile)
- Components under 200 lines each

## Architecture

```
client/src/
  App.jsx                    # Router + Layout wrapper
  lib/
    utils.js                 # cn() helper (from shadcn init)
    api.js                   # fetch wrappers (get/post/put/del/upload)
  components/
    layout/
      app-layout.jsx         # Sidebar + main content area
      nav-link.jsx           # Active-aware nav link
    ui/                      # shadcn components
  pages/
    accounts-page.jsx        # Placeholder
    orgs-page.jsx            # Placeholder
```

## Related Code Files
- **Create:** `api.js`, `app-layout.jsx`, `nav-link.jsx`, `accounts-page.jsx`, `orgs-page.jsx`
- **Modify:** `App.jsx`
- **Reference:** `src/public/js/app.js` (port API helpers)

## Implementation Steps

1. Install React Router: `npm install react-router`
2. Install shadcn components: `npx shadcn@latest add button sonner`
3. Create `lib/api.js` -- port `API` object from `app.js`:
   - `get(url)`, `post(url, body)`, `put(url, body)`, `del(url)`, `upload(url, file)`
   - All use relative URLs (proxy handles routing)
   - Add error handling: throw on non-OK responses
4. Create `components/layout/app-layout.jsx`:
   - Sidebar with app title, nav links (Accounts, Organizations)
   - Main content area renders `<Outlet />`
   - Use shadcn Button for nav links or simple `<NavLink>` with Tailwind
5. Create `components/layout/nav-link.jsx`: thin wrapper around React Router `NavLink` with active styles
6. Create placeholder pages: `accounts-page.jsx`, `orgs-page.jsx` (just headings)
7. Wire up `App.jsx`:
   ```jsx
   <BrowserRouter>
     <Routes>
       <Route element={<AppLayout />}>
         <Route path="/" element={<AccountsPage />} />
         <Route path="/orgs" element={<OrgsPage />} />
       </Route>
     </Routes>
   </BrowserRouter>
   ```
8. Add `<Toaster />` from Sonner at app root
9. Verify navigation between routes, toast works via `toast("message")`

## Todo
- [ ] Install react-router, sonner
- [ ] Create API helper module
- [ ] Build app layout with sidebar/nav
- [ ] Set up routes (/ and /orgs)
- [ ] Add Sonner toast provider
- [ ] Verify navigation and toasts

## Success Criteria
- Clicking nav links switches between Accounts and Orgs placeholder pages
- URL updates correctly, back/forward works
- `toast()` shows notification
- No full page reloads

## Risk Assessment
- **React Router v7 API** -- uses `<Routes>` / `<Route>` (not data routers needed here)
- **Sidebar on mobile** -- keep simple; collapsible hamburger or just top nav on small screens
