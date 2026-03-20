---
phase: 4
title: "Frontend — Protected Routes + User Menu"
effort: 1h
status: pending
---

# Phase 4 — Frontend: Protected Routes + User Menu

## Context Links
- Phase 3 must be complete (AuthProvider + LoginPage exist)
- Router: `client/src/App.jsx`
- Layout: `client/src/components/layout/app-layout.jsx`
- Auth context: `client/src/context/auth-context.jsx`

## Overview
Wire everything together:
1. Wrap app in `AuthProvider`
2. Add `ProtectedRoute` component — redirects to `/login` if no user
3. Add `/login` route outside the protected layout
4. Add user menu to the top bar (shows username + logout button)
5. Conditionally hide admin-only UI elements using `isAdmin` from `useAuth()`

## Files to Modify
- `client/src/App.jsx` — AuthProvider wrap, ProtectedRoute, login route
- `client/src/components/layout/app-layout.jsx` — user menu in top bar

## Files to Create
- `client/src/components/layout/user-menu.jsx`

---

## Implementation Steps

### Step 1 — Update App.jsx

Replace `client/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { TeamsPage } from '@/pages/teams-page';
import { AccountsPage } from '@/pages/accounts-page';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

Key points:
- `AuthProvider` wraps everything so `useAuth()` works everywhere including `ProtectedRoute`
- `ProtectedRoute` shows a brief loading state while token is being validated on mount
- `/login` is outside `ProtectedRoute` — accessible without a token

### Step 2 — Create user-menu.jsx

Create `client/src/components/layout/user-menu.jsx`:

```jsx
import { useAuth } from '@/context/auth-context';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full p-0 text-sm font-bold">
          {initials}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="flex items-center gap-2">
          <span className="truncate">{user.username}</span>
          {user.role === 'admin' && <Shield className="h-3 w-3 text-primary shrink-0" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Requires shadcn `DropdownMenu` — check if installed; if not: `npx shadcn@latest add dropdown-menu`

### Step 3 — Update app-layout.jsx top bar

In `client/src/components/layout/app-layout.jsx`:

1. Import `UserMenu`:
```jsx
import { UserMenu } from '@/components/layout/user-menu';
```

2. Replace the hardcoded avatar `<div>` at the end of the top bar actions with `<UserMenu />`:

Find this block (lines 114–119):
```jsx
<div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
  B
</div>
```

Replace with:
```jsx
<UserMenu />
```

### Step 4 — Admin-only UI gating (optional polish)

In pages/components that have destructive buttons (delete account, bulk import, etc.), use `isAdmin` to conditionally render:

```jsx
import { useAuth } from '@/context/auth-context';

const { isAdmin } = useAuth();

// Wrap delete buttons / import dialogs:
{isAdmin && <Button variant="destructive" onClick={handleDelete}>Delete</Button>}
```

This is a UI convenience only — the real protection is on the backend (Phase 2). Apply wherever delete/import actions appear.

---

## Todo

- [ ] Update `client/src/App.jsx` — wrap with AuthProvider, add ProtectedRoute, add /login route
- [ ] Create `client/src/components/layout/user-menu.jsx`
- [ ] Update `client/src/components/layout/app-layout.jsx` — import + use UserMenu
- [ ] Verify `DropdownMenu` shadcn component is available; install if missing
- [ ] Optionally gate admin-only buttons in `accounts-page.jsx` and `orgs-page.jsx` with `isAdmin`

## Success Criteria
- Opening app without token → redirected to `/login`
- After login → redirected to `/` dashboard
- Top bar shows user initials with a dropdown containing logout
- Clicking logout → clears token, redirects to `/login`
- Admin badge (shield icon) visible in dropdown for admin users
- Page refresh while logged in → stays on current page (loading flicker < 500ms)

## Notes
- The `loading` state prevents a flash-redirect to `/login` on refresh before token validation completes
- `DropdownMenu` is a common shadcn component — likely already present given the app uses shadcn heavily; verify before installing
