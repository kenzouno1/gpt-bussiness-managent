import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Plus, Users, ShieldCheck, UserX, UserCheck, Send, ChevronLeft, ChevronRight, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AccountDetailSheet } from '@/components/accounts/account-detail-sheet';
import { AccountFormDialog } from '@/components/accounts/account-form-dialog';
import { BulkImportDialog } from '@/components/accounts/bulk-import-dialog';
import { AccountCard } from '@/components/accounts/account-card';
import { api } from '@/lib/api';
import { pageRange } from '@/lib/pagination';
import { toast } from 'sonner';

const FILTERS = [
  { key: 'all', label: 'Tất cả', icon: Users, color: '#3b82f6' },
  { key: 'orphan', label: 'Chưa có nhóm', icon: UserX, color: '#f59e0b' },
  { key: 'invited', label: 'Đang mời', icon: Send, color: '#a855f7' },
  { key: 'joined', label: 'Đã tham gia', icon: UserCheck, color: '#22c55e' },
  { key: 'has_2fa', label: 'Có 2FA', icon: ShieldCheck, color: '#10b981' },
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
  const [groups, setGroups] = useState({ orphan: new Set(), invited: new Set(), joined: new Set() });
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [accs, grps] = await Promise.all([
        api.get('/api/accounts'),
        api.get('/api/accounts/stats/groups'),
      ]);
      setAccounts(accs);
      setGroups({
        orphan: new Set(grps.orphan?.ids || []),
        invited: new Set(grps.invited?.ids || []),
        joined: new Set(grps.joined?.ids || []),
      });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filterCounts = useMemo(() => ({
    all: accounts.length,
    orphan: groups.orphan.size,
    invited: groups.invited.size,
    joined: groups.joined.size,
    has_2fa: accounts.filter(a => a.totp_secret).length,
    no_2fa: accounts.filter(a => !a.totp_secret).length,
  }), [accounts, groups]);

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const matchSearch = !search || a.email.toLowerCase().includes(search.toLowerCase());
      let matchFilter = true;
      if (filter === 'orphan') matchFilter = groups.orphan.has(a.id);
      else if (filter === 'invited') matchFilter = groups.invited.has(a.id);
      else if (filter === 'joined') matchFilter = groups.joined.has(a.id);
      else if (filter === 'has_2fa') matchFilter = !!a.totp_secret;
      else if (filter === 'no_2fa') matchFilter = !a.totp_secret;
      return matchSearch && matchFilter;
    });
  }, [accounts, search, filter, groups]);

  // Reset page and selection when filter/search changes
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, filter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async (id) => {
    if (!confirm('Xóa tài khoản này?')) return;
    try { await api.del(`/api/accounts/${id}`); toast.success('Đã xóa'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(a => a.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) { toast.warning('Chưa chọn tài khoản nào'); return; }
    if (!confirm(`Xóa ${selected.size} tài khoản đã chọn?`)) return;
    try {
      const r = await api.post('/api/accounts/bulk-delete', { ids: [...selected] });
      toast.success(`Đã xóa ${r.deleted} tài khoản`);
      setSelected(new Set()); setSelectMode(false); load();
    } catch (err) { toast.error(err.message); }
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
          {selectMode && selected.size > 0 && (
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Xóa {selected.size}
            </Button>
          )}
          <Button variant="outline" size="sm" className={`gap-1.5 ${selectMode ? 'border-primary text-primary' : ''}`}
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}>
            <CheckSquare className="h-3.5 w-3.5" /> {selectMode ? 'Hủy chọn' : 'Chọn'}
          </Button>
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

      {/* Select all */}
      {selectMode && (
        <Button variant="ghost" size="sm" onClick={selectAll} className="gap-1.5 text-xs">
          {selected.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </Button>
      )}

      {/* Account List */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Không tìm thấy tài khoản.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map(acc => (
            <AccountCard key={acc.id} account={acc}
              status={groups.joined.has(acc.id) ? 'joined' : groups.invited.has(acc.id) ? 'invited' : 'orphan'}
              selectable={selectMode} isSelected={selected.has(acc.id)}
              onToggleSelect={() => toggleSelect(acc.id)}
              onSelect={() => { setSelectedId(acc.id); setSheetOpen(true); }}
              onEdit={() => { setEditId(acc.id); setFormOpen(true); }}
              onDelete={() => handleDelete(acc.id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageRange(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
            ) : (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>
                {p}
              </Button>
            )
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AccountDetailSheet accountId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
      <AccountFormDialog accountId={editId} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </div>
  );
}
