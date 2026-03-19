import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Plus, Users, ShieldCheck, UserX, KeyRound, Eye, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AccountDetailSheet } from '@/components/accounts/account-detail-sheet';
import { AccountFormDialog } from '@/components/accounts/account-form-dialog';
import { BulkImportDialog } from '@/components/accounts/bulk-import-dialog';
import { TotpDisplay } from '@/components/accounts/totp-display';
import { CopyField } from '@/components/ui/copy-field';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const FILTERS = [
  { key: 'all', label: 'Tất cả', icon: Users, color: '#3b82f6' },
  { key: 'has_2fa', label: 'Có 2FA', icon: ShieldCheck, color: '#22c55e' },
  { key: 'has_token', label: 'Có Token', icon: KeyRound, color: '#a855f7' },
  { key: 'orphan', label: 'Chưa có nhóm', icon: UserX, color: '#f59e0b' },
  { key: 'no_2fa', label: 'Thiếu 2FA', icon: ShieldCheck, color: '#ef4444' },
];

export function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [orphanIds, setOrphanIds] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [accs, orphans] = await Promise.all([
        api.get('/api/accounts'),
        api.get('/api/accounts/stats/orphans'),
      ]);
      setAccounts(accs);
      // Get orphan IDs for filtering
      if (orphans.ids) {
        setOrphanIds(new Set(orphans.ids));
      } else {
        // Fallback: accounts not in any org
        const memberAccs = new Set(accs.filter(a => a.chatgpt_account_id).map(a => a.id));
        setOrphanIds(new Set(accs.filter(a => !memberAccs.has(a.id)).map(a => a.id)));
      }
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: accounts.length,
    has_2fa: accounts.filter(a => a.totp_secret).length,
    has_token: accounts.filter(a => a.session_token).length,
    orphan: orphanIds.size,
    no_2fa: accounts.filter(a => !a.totp_secret).length,
  }), [accounts, orphanIds]);

  // Filtered list
  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const matchSearch = !search || a.email.toLowerCase().includes(search.toLowerCase());
      let matchFilter = true;
      if (filter === 'has_2fa') matchFilter = !!a.totp_secret;
      else if (filter === 'has_token') matchFilter = !!a.session_token;
      else if (filter === 'orphan') matchFilter = orphanIds.has(a.id);
      else if (filter === 'no_2fa') matchFilter = !a.totp_secret;
      return matchSearch && matchFilter;
    });
  }, [accounts, search, filter, orphanIds]);

  const handleDelete = async (id) => {
    if (!confirm('Xóa tài khoản này?')) return;
    try { await api.del(`/api/accounts/${id}`); toast.success('Đã xóa'); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài khoản GPT</h1>
          <p className="text-sm text-muted-foreground">Quản lý email, password, 2FA</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkImportDialog onImported={load} />
          <Button size="sm" className="gap-1.5" onClick={() => { setEditId(null); setFormOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Thêm
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Clickable stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FILTERS.map(({ key, label, icon: Icon, color }) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              filter === key ? 'ring-2 ring-primary border-primary' : ''
            }`}
            onClick={() => setFilter(filter === key ? 'all' : key)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{filterCounts[key]}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} / {accounts.length}</Badge>
        {filter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setFilter('all')} className="text-xs">
            Xoá filter
          </Button>
        )}
      </div>

      {/* Account List */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Không tìm thấy tài khoản.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(acc => (
            <AccountRow key={acc.id} account={acc} isOrphan={orphanIds.has(acc.id)}
              onView={() => { setSelectedId(acc.id); setSheetOpen(true); }}
              onEdit={() => { setEditId(acc.id); setFormOpen(true); }}
              onDelete={() => handleDelete(acc.id)} />
          ))}
        </div>
      )}

      <AccountDetailSheet accountId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
      <AccountFormDialog accountId={editId} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </div>
  );
}

function AccountRow({ account, isOrphan, onView, onEdit, onDelete }) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardContent className="flex items-center gap-4 p-3">
        <div className="min-w-0 flex-1">
          <CopyField value={account.email} label="email" className="text-sm font-medium" />
          <div className="mt-0.5 flex gap-1">
            {account.totp_secret && <Badge variant="secondary" className="h-4 text-[9px]">2FA</Badge>}
            {account.session_token && <Badge variant="outline" className="h-4 text-[9px]">Token</Badge>}
            {isOrphan && <Badge variant="destructive" className="h-4 text-[9px]">Chưa có nhóm</Badge>}
          </div>
        </div>

        <div className="hidden w-32 sm:block">
          <CopyField value={account.password} label="password" className="text-xs font-mono text-muted-foreground" />
        </div>

        <div className="hidden w-36 lg:block">
          <TotpDisplay secret={account.totp_secret} />
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView} title="Chi tiết">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Sửa">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Xóa">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
