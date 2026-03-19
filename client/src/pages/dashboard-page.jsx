import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Building2, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function DashboardPage() {
  const [accounts, setAccounts] = useState([]);
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    api.get('/api/accounts').then(setAccounts).catch(() => {});
    api.get('/api/orgs').then(setOrgs).catch(() => {});
  }, []);

  const totalMembers = orgs.reduce((s, o) => s + (o.member_count || 0), 0);

  const cards = [
    { label: 'Tổng tài khoản', value: accounts.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/accounts' },
    { label: 'Tổ chức', value: orgs.length, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/orgs' },
    { label: 'Có 2FA', value: accounts.filter(a => a.chatgpt_plan_type).length, icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Tổng thành viên', value: totalMembers, icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bảng điều khiển</h1>
        <p className="text-sm text-muted-foreground">Tổng quan quản lý ChatGPT teams</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Card key={label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-3xl font-bold">{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
              </div>
              {link && (
                <Link to={link} className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
                  Xem chi tiết <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Thao tác nhanh</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/accounts">
              <Button size="sm" className="gap-2">
                <Users className="h-3.5 w-3.5" /> Quản lý Đội nhóm
              </Button>
            </Link>
            <Link to="/orgs">
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="h-3.5 w-3.5" /> Quản lý Tổ chức
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tài khoản gần đây</h3>
              <Link to="/accounts" className="text-xs text-primary hover:underline">Xem tất cả</Link>
            </div>
            <div className="space-y-2">
              {accounts.slice(0, 5).map(acc => (
                <div key={acc.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{acc.email}</p>
                    <p className="text-[10px] text-muted-foreground">{acc.created_at}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    acc.status === 'stripe_link' ? 'bg-amber-500/15 text-amber-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {acc.status || 'unknown'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
