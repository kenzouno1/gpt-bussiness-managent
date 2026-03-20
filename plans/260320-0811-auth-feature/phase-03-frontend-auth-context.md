---
phase: 3
title: "Frontend — Login Page + Auth Context"
effort: 1.5h
status: pending
---

# Phase 3 — Frontend: Login Page + Auth Context

## Context Links
- Phase 1 & 2 must be complete (backend auth API live)
- API client: `client/src/lib/api.js`
- App entry: `client/src/App.jsx`
- Vite config (proxy): `client/vite.config.js`

## Overview
Three pieces:
1. `AuthContext` — holds user state, token, login/logout helpers; persists token to localStorage
2. `api.js` update — attach `Authorization: Bearer <token>` header on every request
3. `LoginPage` — simple username + password form using existing shadcn/ui components

## Requirements
- Token stored in `localStorage` key `gpt_token`
- On app load, read token from localStorage and validate via `GET /api/auth/me`
- If token invalid/expired, clear it and redirect to `/login`
- Login page: username field, password field, submit button, error message
- After login, redirect to `/` (dashboard)
- Logout clears token + redirects to `/login`
- `useAuth()` hook exported from context for easy consumption

## Files to Create
- `client/src/context/auth-context.jsx`
- `client/src/pages/login-page.jsx`

## Files to Modify
- `client/src/lib/api.js` — inject auth header
- `client/src/App.jsx` — wrap with AuthProvider, add `/login` route

---

## Implementation Steps

### Step 1 — Update api.js to inject Bearer token

Replace the `request` function in `client/src/lib/api.js`:

```js
// Shared API fetch helpers - all URLs are relative (Vite proxy handles /api)
function getToken() {
  return localStorage.getItem('gpt_token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Only set Content-Type for JSON bodies (not FormData)
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('gpt_token');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: (url) => request(url, { method: 'DELETE' }),
  upload: (url, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(url, { method: 'POST', body: fd });
  },
};
```

Key changes:
- `getToken()` reads from localStorage
- Injects `Authorization` header when token exists
- 401 response → auto-clear token + redirect to `/login`
- Removed hardcoded `Content-Type` from helpers (set conditionally in `request`)

### Step 2 — Create auth-context.jsx

Create `client/src/context/auth-context.jsx`:

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: validate stored token
  useEffect(() => {
    const token = localStorage.getItem('gpt_token');
    if (!token) { setLoading(false); return; }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('gpt_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem('gpt_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('gpt_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

### Step 3 — Create login-page.jsx

Create `client/src/pages/login-page.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      login(data.token, data.user);
      navigate('/');
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">GPT Team Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username or email"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

Note: Login uses raw `fetch` (not `api.js`) to avoid the auto-redirect loop on 401.

---

## Todo

- [ ] Update `client/src/lib/api.js` — inject Bearer token + 401 auto-redirect
- [ ] Create `client/src/context/auth-context.jsx`
- [ ] Create `client/src/pages/login-page.jsx`
- [ ] Verify shadcn `Card`, `Input`, `Label` components exist in `client/src/components/ui/`; install any missing via `npx shadcn@latest add <component>`

## Success Criteria
- Visiting any page without a token redirects to `/login`
- Login form submits and on success stores token in localStorage and navigates to `/`
- Page refresh keeps the user logged in (token re-validated via `/api/auth/me`)
- Invalid credentials show error message in the form
- 401 from any API call (expired token) auto-redirects to `/login`

## Security Notes
- `localStorage` is acceptable for this internal tool; for public apps prefer `httpOnly` cookies
- Login page uses raw fetch to avoid circular redirect when token is absent
