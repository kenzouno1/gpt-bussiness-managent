import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccountCard } from '@/components/accounts/account-card';
import { AccountDetailSheet } from '@/components/accounts/account-detail-sheet';
import { CsvImportDialog } from '@/components/accounts/csv-import-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await api.get('/api/accounts');
      setAccounts(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  // Unique statuses for filter chips
  const statuses = useMemo(() => {
    const set = new Set(accounts.map(a => a.status || 'unknown'));
    return ['all', ...set];
  }, [accounts]);

  // Filtered accounts
  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const matchSearch = !search || a.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || (a.status || 'unknown') === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [accounts, search, statusFilter]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try {
      await api.del(`/api/accounts/${id}`);
      toast.success('Account deleted');
      loadAccounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Accounts</h2>
          <Badge variant="secondary">{filtered.length}/{accounts.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog onImported={loadAccounts} />
          <Button variant="outline" size="sm" onClick={loadAccounts}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {statuses.map(s => (
            <Badge
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {accounts.length === 0 ? 'No accounts yet. Import a CSV to get started.' : 'No matching accounts.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(acc => (
            <AccountCard key={acc.id} account={acc} onSelect={handleSelect} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <AccountDetailSheet accountId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
