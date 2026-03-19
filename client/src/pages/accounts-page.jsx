import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Users, ShieldCheck, Building2, Clock, Plus, CheckSquare, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

// Classify account health
function classifyAccount(acc) {
  if (!acc.session_token && !acc.totp_secret) return 'no_cred';
  if (!acc.session_token) return 'error';
  // Check if token might be old (created > 7 days ago)
  if (acc.created_at) {
    const created = new Date(acc.created_at);
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) return 'old';
  }
  return 'healthy';
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/accounts');
      setAccounts(data);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  // Count per filter
  const filterCounts = useMemo(() => {
    const counts = { all: accounts.length, healthy: 0, old: 0, error: 0, no_cred: 0 };
    accounts.forEach(acc => { counts[classifyAccount(acc)]++; });
    return counts;
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
    return accounts.filter(acc => {
      const matchSearch = !search || acc.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || classifyAccount(acc) === filter;
      return matchSearch && matchFilter;
    });
  }, [accounts, search, filter]);

  const handleSelect = (id) => { setSelectedId(id); setSheetOpen(true); };

  const handleDelete = async (id) => {
    if (!confirm('Xóa tài khoản này?')) return;
    try {
      await api.del(`/api/accounts/${id}`);
      toast.success('Đã xóa tài khoản');
      loadAccounts();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Đội nhóm</h1>
          <p className="text-sm text-muted-foreground">Quản lý ChatGPT teams</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Đồng bộ tất cả
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Chọn
          </Button>
          <CsvImportDialog onImported={loadAccounts} />
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Search + Filter chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm teams..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9" />
        </div>
      </div>

      {/* Filter pills - matching reference */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button key={key}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
              filter === key
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
            onClick={() => setFilter(key)}
          >
            {label} <span className="ml-1 opacity-70">{filterCounts[key]}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">
            {accounts.length === 0 ? 'Chưa có tài khoản nào. Import CSV để bắt đầu.' : 'Không tìm thấy kết quả.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(acc => (
            <AccountCard key={acc.id} account={acc} health={classifyAccount(acc)}
              onSelect={handleSelect} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AccountDetailSheet accountId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
