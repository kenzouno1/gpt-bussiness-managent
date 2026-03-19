import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrgCard } from '@/components/orgs/org-card';
import { OrgDetailDialog } from '@/components/orgs/org-detail-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function OrgsPage() {
  const [orgs, setOrgs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadOrgs = async () => {
    try {
      const data = await api.get('/api/orgs');
      setOrgs(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => { loadOrgs(); }, []);

  const filtered = useMemo(() => {
    if (!search) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.chatgpt_account_id?.toLowerCase().includes(q)
    );
  }, [orgs, search]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setDialogOpen(true);
  };

  const handleInvite = async (id) => {
    if (!confirm('Auto-invite all accounts to this org?')) return;
    toast.info('Sending invites...');
    try {
      const result = await api.post(`/api/orgs/${id}/invite`, {});
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invited: ${result.invited}, Failed: ${result.failed}`);
      loadOrgs();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this organization?')) return;
    try {
      await api.del(`/api/orgs/${id}`);
      toast.success('Organization deleted');
      loadOrgs();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Organizations</h2>
          <Badge variant="secondary">{filtered.length}/{orgs.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrgs}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or org ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {orgs.length === 0 ? 'No organizations yet. Import accounts to auto-create orgs.' : 'No matching organizations.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(org => (
            <OrgCard key={org.id} org={org} onSelect={handleSelect} onInvite={handleInvite} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <OrgDetailDialog orgId={selectedId} open={dialogOpen} onOpenChange={setDialogOpen} onInvite={handleInvite} />
    </div>
  );
}
