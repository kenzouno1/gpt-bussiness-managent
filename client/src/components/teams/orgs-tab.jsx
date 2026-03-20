import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Building2, Users, Send, CheckCircle, CheckSquare, Square, ShieldCheck, AlertTriangle, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsBar } from '@/components/layout/stats-bar';
import { OrgCard } from '@/components/orgs/org-card';
import { OrgDetailDialog } from '@/components/orgs/org-detail-dialog';
import { AddTeamDialog } from '@/components/orgs/add-team-dialog';
import { api } from '@/lib/api';
import { pageRange } from '@/lib/pagination';
import { toast } from 'sonner';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'healthy', label: 'Khỏe mạnh' },
  { key: 'invalid', label: 'Lỗi' },
  { key: 'no_credential', label: 'Không có credential' },
  { key: 'pending', label: 'Chưa đồng bộ' },
];

export function OrgsTab() {
  const [orgs, setOrgs] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkInviting, setBulkInviting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const lastValidated = useRef(0);

  const loadOrgs = async () => {
    setLoading(true);
    try { setOrgs(await api.get('/api/orgs')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  // Auto-validate tokens on mount and every 5 minutes
  const validateTokens = async () => {
    setValidating(true);
    try {
      const r = await api.post('/api/orgs/validate-all', {});
      toast.info(`Đã gửi kiểm tra ${r.queued || 0}/${r.total || 0} orgs`);
      lastValidated.current = Date.now();
      // Reload after delay to reflect validation results
      setTimeout(loadOrgs, 5000);
    } catch (err) { toast.error(err.message); }
    finally { setValidating(false); }
  };

  useEffect(() => {
    loadOrgs().then(() => {
      // Auto-validate on first load
      validateTokens();
    });
    // Re-validate every 5 minutes
    const interval = setInterval(() => validateTokens(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filterCounts = useMemo(() => {
    const c = { all: orgs.length, healthy: 0, invalid: 0, failed: 0, no_credential: 0, pending: 0 };
    orgs.forEach(o => { const s = o.sync_status || 'pending'; c[s] = (c[s] || 0) + 1; });
    return c;
  }, [orgs]);

  const stats = useMemo(() => {
    const totalMembers = orgs.reduce((s, o) => s + (o.member_count || 0), 0);
    return [
      { label: 'Tổng tổ chức', value: orgs.length, icon: Building2, color: '#a855f7' },
      { label: 'Khỏe mạnh', value: filterCounts.healthy, icon: ShieldCheck, color: '#22c55e' },
      { label: 'Lỗi token', value: (filterCounts.invalid || 0) + (filterCounts.failed || 0), icon: AlertTriangle, color: '#ef4444' },
      { label: 'Tổng members', value: totalMembers, icon: Users, color: '#3b82f6' },
    ];
  }, [orgs, filterCounts]);

  const filtered = useMemo(() => {
    return orgs.filter(o => {
      const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.chatgpt_account_id?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || (o.sync_status || 'pending') === filter;
      return matchSearch && matchFilter;
    });
  }, [orgs, search, filter]);

  // Reset page when filter/search changes
  useEffect(() => { setPage(1); }, [search, filter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(o => o.id)));
  };

  const handleInvite = async (id) => {
    if (!confirm('Auto-invite tất cả accounts vào org này?')) return;
    toast.info('Đang gửi invites...');
    try {
      const r = await api.post(`/api/orgs/${id}/invite`, {});
      if (r.error) { toast.error(r.error); return; }
      toast.success(`Invited: ${r.invited}, Failed: ${r.failed}`);
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  const handleBulkInvite = async () => {
    if (selected.size === 0) { toast.warning('Chưa chọn org nào'); return; }
    if (!confirm(`Auto-invite vào ${selected.size} org đã chọn?`)) return;
    setBulkInviting(true);
    let totalInvited = 0, totalFailed = 0;
    for (const orgId of selected) {
      try {
        const r = await api.post(`/api/orgs/${orgId}/invite`, {});
        if (!r.error) { totalInvited += r.invited; totalFailed += r.failed; } else { totalFailed++; }
      } catch { totalFailed++; }
    }
    setBulkInviting(false);
    toast.success(`Hoàn tất: ${totalInvited} invited, ${totalFailed} failed`);
    setSelected(new Set()); setSelectMode(false); loadOrgs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa tổ chức này?')) return;
    try { await api.del(`/api/orgs/${id}`); toast.success('Đã xóa'); loadOrgs(); }
    catch (err) { toast.error(err.message); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) { toast.warning('Chưa chọn org nào'); return; }
    if (!confirm(`Xóa ${selected.size} tổ chức đã chọn?`)) return;
    try {
      const r = await api.post('/api/orgs/bulk-delete', { ids: [...selected] });
      toast.success(`Đã xóa ${r.deleted} tổ chức`);
      setSelected(new Set()); setSelectMode(false); loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {selectMode && selected.size > 0 && (<>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Xóa {selected.size} org
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleBulkInvite} disabled={bulkInviting}>
            <Send className={`h-3.5 w-3.5 ${bulkInviting ? 'animate-pulse' : ''}`} />
            {bulkInviting ? 'Đang invite...' : `Invite ${selected.size} org`}
          </Button>
        </>)}
        <Button variant="outline" size="sm" className={`gap-1.5 ${selectMode ? 'border-primary text-primary' : ''}`}
          onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}>
          <CheckSquare className="h-3.5 w-3.5" /> {selectMode ? 'Hủy chọn' : 'Chọn'}
        </Button>
        <AddTeamDialog onCreated={() => { loadOrgs(); }} />
        <Button variant="outline" size="sm" onClick={validateTokens} disabled={validating} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${validating ? 'animate-spin' : ''}`} />
          {validating ? 'Đang kiểm tra...' : 'Đồng bộ tất cả'}
        </Button>
      </div>

      <StatsBar stats={stats} />

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tổ chức..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} / {orgs.length}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button key={key}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
              filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
            onClick={() => setFilter(key)}>
            {label} <span className="ml-1 opacity-70">{filterCounts[key] || 0}</span>
          </button>
        ))}
      </div>

      {selectMode && (
        <Button variant="ghost" size="sm" onClick={selectAll} className="gap-1.5 text-xs">
          {selected.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </Button>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Không tìm thấy tổ chức.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map(org => (
            <OrgCard key={org.id} org={org} selectable={selectMode} isSelected={selected.has(org.id)}
              onToggleSelect={() => toggleSelect(org.id)} onSelect={(id) => { setSelectedId(id); setDialogOpen(true); }}
              onInvite={handleInvite} onDelete={handleDelete} />
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

      <OrgDetailDialog orgId={selectedId} open={dialogOpen} onOpenChange={setDialogOpen} onInvite={handleInvite} />
    </div>
  );
}
