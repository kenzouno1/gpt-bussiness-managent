import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Building2, Users, Send, CheckCircle, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsBar } from '@/components/layout/stats-bar';
import { OrgCard } from '@/components/orgs/org-card';
import { OrgDetailDialog } from '@/components/orgs/org-detail-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function OrgsTab() {
  const [orgs, setOrgs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkInviting, setBulkInviting] = useState(false);

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
      { label: 'Tổng tổ chức', value: orgs.length, icon: Building2, color: '#a855f7' },
      { label: 'Tổng thành viên', value: totalMembers, icon: Users, color: '#3b82f6' },
      { label: 'Đã chọn', value: selected.size, icon: CheckCircle, color: '#22c55e' },
      { label: 'TB thành viên', value: orgs.length ? Math.round(totalMembers / orgs.length) : 0, icon: Send, color: '#f59e0b' },
    ];
  }, [orgs, selected]);

  const filtered = useMemo(() => {
    if (!search) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(o => o.name.toLowerCase().includes(q) || o.chatgpt_account_id?.toLowerCase().includes(q));
  }, [orgs, search]);

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
        if (r.error) { totalFailed++; } else { totalInvited += r.invited; totalFailed += r.failed; }
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

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {selectMode && selected.size > 0 && (
          <Button size="sm" className="gap-1.5" onClick={handleBulkInvite} disabled={bulkInviting}>
            <Send className={`h-3.5 w-3.5 ${bulkInviting ? 'animate-pulse' : ''}`} />
            {bulkInviting ? 'Đang invite...' : `Invite ${selected.size} org`}
          </Button>
        )}
        <Button variant="outline" size="sm" className={`gap-1.5 ${selectMode ? 'border-primary text-primary' : ''}`}
          onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}>
          <CheckSquare className="h-3.5 w-3.5" /> {selectMode ? 'Hủy chọn' : 'Chọn'}
        </Button>
        <Button variant="outline" size="sm" onClick={loadOrgs} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Đồng bộ
        </Button>
      </div>

      <StatsBar stats={stats} />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tổ chức..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} / {orgs.length}</Badge>
        {selectMode && (
          <Button variant="ghost" size="sm" onClick={selectAll} className="gap-1.5 text-xs">
            {selected.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Chưa có tổ chức nào.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(org => (
            <OrgCard key={org.id} org={org} selectable={selectMode} isSelected={selected.has(org.id)}
              onToggleSelect={() => toggleSelect(org.id)} onSelect={(id) => { setSelectedId(id); setDialogOpen(true); }}
              onInvite={handleInvite} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <OrgDetailDialog orgId={selectedId} open={dialogOpen} onOpenChange={setDialogOpen} onInvite={handleInvite} />
    </div>
  );
}
