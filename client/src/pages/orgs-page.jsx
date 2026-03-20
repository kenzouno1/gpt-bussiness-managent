import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Building2, Users, Send, CheckCircle, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsBar } from '@/components/layout/stats-bar';
import { OrgCard } from '@/components/orgs/org-card';
import { OrgDetailDialog } from '@/components/orgs/org-detail-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Generate page numbers: [1, 2, '...', 8, 9, 10] style
function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

export function OrgsPage() {
  const [orgs, setOrgs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkInviting, setBulkInviting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const loadOrgs = async () => {
    setLoading(true);
    try { setOrgs(await api.get('/api/orgs')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrgs(); }, []);

  const stats = useMemo(() => {
    const totalMembers = orgs.reduce((s, o) => s + (o.member_count || 0), 0);
    return [
      { label: 'Tổng Tổ chức', value: orgs.length, icon: Building2, color: '#a855f7' },
      { label: 'Tổng thành viên', value: totalMembers, icon: Users, color: '#3b82f6' },
      { label: 'Đã chọn', value: selected.size, icon: CheckCircle, color: '#22c55e' },
      { label: 'Trung bình', value: orgs.length ? Math.round(totalMembers / orgs.length) : 0, icon: Send, color: '#f59e0b' },
    ];
  }, [orgs, selected]);

  const filtered = useMemo(() => {
    if (!search) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(o => o.name.toLowerCase().includes(q) || o.chatgpt_account_id?.toLowerCase().includes(q));
  }, [orgs, search]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSelect = (id) => { setSelectedId(id); setDialogOpen(true); };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(o => o.id)));
    }
  };

  const handleInvite = async (id) => {
    if (!confirm('Auto-invite tất cả accounts vào org này?')) return;
    toast.info('Đang gửi invites...');
    try {
      const result = await api.post(`/api/orgs/${id}/invite`, {});
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Invited: ${result.invited}, Failed: ${result.failed}`);
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  const handleBulkInvite = async () => {
    if (selected.size === 0) { toast.warning('Chưa chọn org nào'); return; }
    if (!confirm(`Auto-invite tất cả accounts vào ${selected.size} org đã chọn?`)) return;

    setBulkInviting(true);
    let totalInvited = 0, totalFailed = 0, errors = [];

    for (const orgId of selected) {
      try {
        const result = await api.post(`/api/orgs/${orgId}/invite`, {});
        if (result.error) {
          errors.push(`Org ${orgId}: ${result.error}`);
          totalFailed++;
        } else {
          totalInvited += result.invited;
          totalFailed += result.failed;
          if (result.errors?.length) errors.push(...result.errors.map(e => `${e.email}: ${e.error}`));
        }
      } catch (err) {
        errors.push(`Org ${orgId}: ${err.message}`);
        totalFailed++;
      }
    }

    setBulkInviting(false);

    if (errors.length > 0) {
      toast.warning(`Hoàn tất: ${totalInvited} invited, ${totalFailed} failed`);
      console.warn('Bulk invite errors:', errors);
    } else {
      toast.success(`Hoàn tất: ${totalInvited} invited thành công`);
    }

    setSelected(new Set());
    setSelectMode(false);
    loadOrgs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa tổ chức này?')) return;
    try {
      await api.del(`/api/orgs/${id}`);
      toast.success('Đã xóa tổ chức');
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tổ chức</h1>
          <p className="text-sm text-muted-foreground">Quản lý ChatGPT workspaces và invitations</p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode && selected.size > 0 && (
            <Button size="sm" className="gap-1.5" onClick={handleBulkInvite} disabled={bulkInviting}>
              <Send className={`h-3.5 w-3.5 ${bulkInviting ? 'animate-pulse' : ''}`} />
              {bulkInviting ? 'Đang invite...' : `Invite ${selected.size} org`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
            className={`gap-1.5 ${selectMode ? 'border-primary text-primary' : ''}`}>
            <CheckSquare className="h-3.5 w-3.5" /> {selectMode ? 'Hủy chọn' : 'Chọn'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadOrgs} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Đồng bộ tất cả
          </Button>
        </div>
      </div>

      <StatsBar stats={stats} />

      {/* Search + select all */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tổ chức..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} of {orgs.length}</Badge>
        {selectMode && (
          <Button variant="ghost" size="sm" onClick={selectAll} className="gap-1.5 text-xs">
            {selected.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">
            {orgs.length === 0 ? 'Chưa có tổ chức nào. Import accounts để tự động tạo.' : 'Không tìm thấy kết quả.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map(org => (
            <OrgCard key={org.id} org={org}
              selectable={selectMode} isSelected={selected.has(org.id)}
              onToggleSelect={() => toggleSelect(org.id)}
              onSelect={handleSelect} onInvite={handleInvite} onDelete={handleDelete} />
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
