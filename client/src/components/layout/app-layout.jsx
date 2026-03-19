import { Outlet, NavLink } from 'react-router';
import { Users, Building2, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/hooks/use-theme';

const navItems = [
  { to: '/', label: 'Accounts', icon: Users },
  { to: '/orgs', label: 'Organizations', icon: Building2 },
];

export function AppLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">GPT Team Manager</h1>
            <nav className="flex gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === '/'}>
                  {({ isActive }) => (
                    <Button variant={isActive ? 'default' : 'ghost'} size="sm" className="gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </Button>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
