import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Building2, Users, Send, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsBar } from '@/components/layout/stats-bar';
import { OrgCard } from '@/components/orgs/org-card';
import { OrgDetailDialog } from '@/components/orgs/org-detail-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function OrgsPage() {
  const [orgs, setOrgs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/orgs');
      setOrgs(data);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrgs(); }, []);

  const stats = useMemo(() => {
    const totalMembers = orgs.reduce((s, o) => s + (o.member_count || 0), 0);
    const planTypes = new Set(orgs.map(o => o.plan_type).filter(Boolean));
    return [
      { label: 'Total Orgs', value: orgs.length, icon: Building2, color: '#a855f7' },
      { label: 'Total Members', value: totalMembers, icon: Users, color: '#3b82f6' },
      { label: 'Plan Types', value: planTypes.size, icon: CheckCircle, color: '#22c55e' },
      { label: 'Avg Members', value: orgs.length ? Math.round(totalMembers / orgs.length) : 0, icon: Send, color: '#f59e0b' },
    ];
  }, [orgs]);

  const filtered = useMemo(() => {
    if (!search) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(o => o.name.toLowerCase().includes(q) || o.chatgpt_account_id?.toLowerCase().includes(q));
  }, [orgs, search]);

  const handleSelect = (id) => { setSelectedId(id); setDialogOpen(true); };

  const handleInvite = async (id) => {
    if (!confirm('Auto-invite all accounts to this org?')) return;
    toast.info('Sending invites...');
    try {
      const result = await api.post(`/api/orgs/${id}/invite`, {});
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Invited: ${result.invited}, Failed: ${result.failed}`);
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this organization?')) return;
    try {
      await api.del(`/api/orgs/${id}`);
      toast.success('Organization deleted');
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">Manage ChatGPT workspaces and invitations</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrgs} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <StatsBar stats={stats} />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or org ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} of {orgs.length}</Badge>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {orgs.length === 0 ? 'No organizations yet. Import accounts to auto-create orgs.' : 'No matching organizations.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(org => (
            <OrgCard key={org.id} org={org} onSelect={handleSelect} onInvite={handleInvite} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <OrgDetailDialog orgId={selectedId} open={dialogOpen} onOpenChange={setDialogOpen} onInvite={handleInvite} />
    </div>
  );
}
