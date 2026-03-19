import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Plus, Users, ShieldCheck, UserX, Eye, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatsBar } from '@/components/layout/stats-bar';
import { AccountDetailSheet } from '@/components/accounts/account-detail-sheet';
import { AccountFormDialog } from '@/components/accounts/account-form-dialog';
import { BulkImportDialog } from '@/components/accounts/bulk-import-dialog';
import { TotpDisplay } from '@/components/accounts/totp-display';
import { CopyField } from '@/components/ui/copy-field';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [orphanCount, setOrphanCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [accs, orphans] = await Promise.all([
        api.get('/api/accounts'),
        api.get('/api/accounts/stats/orphans'),
      ]);
      setAccounts(accs);
      setOrphanCount(orphans.orphan_count);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => [
    { label: 'Tổng tài khoản', value: accounts.length, icon: Users, color: '#3b82f6' },
    { label: 'Có 2FA', value: accounts.filter(a => a.totp_secret).length, icon: ShieldCheck, color: '#22c55e' },
    { label: 'Chưa có nhóm', value: orphanCount, icon: UserX, color: '#f59e0b' },
  ], [accounts, orphanCount]);

  const filtered = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(a => a.email.toLowerCase().includes(q));
  }, [accounts, search]);

  const handleDelete = async (id) => {
    if (!confirm('Xóa tài khoản này?')) return;
    try { await api.del(`/api/accounts/${id}`); toast.success('Đã xóa'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleEdit = (id) => { setEditId(id); setFormOpen(true); };
  const handleAdd = () => { setEditId(null); setFormOpen(true); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài khoản GPT</h1>
          <p className="text-sm text-muted-foreground">Quản lý email, password, 2FA của các tài khoản ChatGPT</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkImportDialog onImported={load} />
          <Button size="sm" className="gap-1.5" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> Thêm tài khoản
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <StatsBar stats={stats} />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm kiếm email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} / {accounts.length}</Badge>
      </div>

      {/* Account List - Table-like cards */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Chưa có tài khoản. Thêm hoặc bulk import.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(acc => (
            <AccountRow key={acc.id} account={acc}
              onView={() => { setSelectedId(acc.id); setSheetOpen(true); }}
              onEdit={() => handleEdit(acc.id)}
              onDelete={() => handleDelete(acc.id)} />
          ))}
        </div>
      )}

      <AccountDetailSheet accountId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
      <AccountFormDialog accountId={editId} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </div>
  );
}

// Inline row component for account list
function AccountRow({ account, onView, onEdit, onDelete }) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardContent className="flex items-center gap-4 p-3">
        {/* Email — click to copy */}
        <div className="min-w-0 flex-1">
          <CopyField value={account.email} label="email" className="text-sm font-medium" />
          <div className="mt-0.5 flex gap-1">
            {account.totp_secret && <Badge variant="secondary" className="h-4 text-[9px]">2FA</Badge>}
            {account.session_token && <Badge variant="outline" className="h-4 text-[9px]">Token</Badge>}
          </div>
        </div>

        {/* Password — click to copy */}
        <div className="hidden w-32 sm:block">
          <CopyField value={account.password} label="password" className="text-xs font-mono text-muted-foreground" />
        </div>

        {/* TOTP — already click to copy */}
        <div className="hidden w-36 lg:block">
          <TotpDisplay secret={account.totp_secret} />
        </div>

        {/* Actions */}
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
