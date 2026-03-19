import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Users, ShieldCheck, Building2, Clock, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsBar } from '@/components/layout/stats-bar';
import { AccountCard } from '@/components/accounts/account-card';
import { AccountDetailSheet } from '@/components/accounts/account-detail-sheet';
import { CsvImportDialog } from '@/components/accounts/csv-import-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'healthy', label: 'Khỏe mạnh' },
  { key: 'old', label: 'Cũ' },
  { key: 'error', label: 'Lỗi' },
  { key: 'no_cred', label: 'Không có credential' },
];

function classifyAccount(acc) {
  if (!acc.session_token && !acc.totp_secret) return 'no_cred';
  if (!acc.session_token) return 'error';
  if (acc.created_at) {
    const days = (Date.now() - new Date(acc.created_at).getTime()) / 86400000;
    if (days > 7) return 'old';
  }
  return 'healthy';
}

export function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    setLoading(true);
    try { setAccounts(await api.get('/api/accounts')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const filterCounts = useMemo(() => {
    const c = { all: accounts.length, healthy: 0, old: 0, error: 0, no_cred: 0 };
    accounts.forEach(a => { c[classifyAccount(a)]++; });
    return c;
  }, [accounts]);

  const stats = useMemo(() => {
    const uniqueOrgs = new Set(accounts.map(a => a.chatgpt_account_id).filter(Boolean)).size;
    return [
      { label: 'Tổng tài khoản', value: accounts.length, icon: Users, color: '#3b82f6' },
      { label: 'Có 2FA', value: accounts.filter(a => a.totp_secret).length, icon: ShieldCheck, color: '#22c55e' },
      { label: 'Tổ chức', value: uniqueOrgs, icon: Building2, color: '#a855f7' },
      { label: 'Import gần nhất', value: accounts[0]?.created_at ? new Date(accounts[0].created_at).toLocaleDateString('vi-VN') : '-', icon: Clock, color: '#f59e0b' },
    ];
  }, [accounts]);

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const matchSearch = !search || a.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || classifyAccount(a) === filter;
      return matchSearch && matchFilter;
    });
  }, [accounts, search, filter]);

  const handleDelete = async (id) => {
    if (!confirm('Xóa tài khoản này?')) return;
    try { await api.del(`/api/accounts/${id}`); toast.success('Đã xóa'); loadAccounts(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Đồng bộ tất cả
        </Button>
        <CsvImportDialog onImported={loadAccounts} />
      </div>

      <StatsBar stats={stats} />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} / {accounts.length}</Badge>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button key={key}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
              filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
            onClick={() => setFilter(key)}>
            {label} <span className="ml-1 opacity-70">{filterCounts[key]}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">
            {accounts.length === 0 ? 'Chưa có tài khoản. Import CSV để bắt đầu.' : 'Không tìm thấy.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(acc => (
            <AccountCard key={acc.id} account={acc} health={classifyAccount(acc)}
              onSelect={(id) => { setSelectedId(id); setSheetOpen(true); }} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AccountDetailSheet accountId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
