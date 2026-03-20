import { useState, useEffect } from 'react';
import { Send, Undo2, RefreshCw, Users, UserPlus, KeyRound, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const statusConfig = {
  joined: { label: 'Member', variant: 'default', color: 'bg-green-500/15 text-green-600' },
  sent: { label: 'Invited', variant: 'outline', color: 'bg-amber-500/15 text-amber-600' },
  pending: { label: 'Pending', variant: 'outline', color: 'bg-amber-500/15 text-amber-600' },
  failed: { label: 'Failed', variant: 'destructive', color: 'bg-red-500/15 text-red-500' },
  owner: { label: 'Owner', variant: 'default', color: 'bg-primary/15 text-primary' },
};

export function OrgDetailDialog({ orgId, open, onOpenChange, onInvite }) {
  const [org, setOrg] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  const loadOrg = () => {
    if (!orgId || !open) return;
    api.get(`/api/orgs/${orgId}`).then(setOrg).catch(() => {});
  };

  useEffect(() => { loadOrg(); }, [orgId, open]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post(`/api/orgs/${orgId}/sync`, {});
      if (result.error) {
        toast.error(`Đồng bộ thất bại: ${result.error}`);
      } else {
        toast.success(result.message || 'Đã gửi yêu cầu đồng bộ');
      }
      // Reload org after short delay to reflect sync results
      setTimeout(loadOrg, 3000);
    } catch (err) { toast.error(err.message); }
    finally { setSyncing(false); }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) { toast.warning('Nhập token'); return; }
    setSavingToken(true);
    try {
      await api.put(`/api/orgs/${orgId}`, { session_token: tokenInput.trim() });
      toast.success('Đã cập nhật token');
      setTokenInput('');
      loadOrg();
    } catch (err) { toast.error(err.message); }
    finally { setSavingToken(false); }
  };

  const handleRemoveMember = async (memberId, email) => {
    if (!confirm(`Xoá ${email} khỏi nhóm?`)) return;
    try {
      await api.del(`/api/orgs/${orgId}/members/${memberId}`);
      toast.success(`Đã xoá ${email}`);
      loadOrg();
    } catch (err) { toast.error(err.message); }
  };

  const handleRevoke = async () => {
    if (!confirm('Thu hồi tất cả lời mời đang chờ?')) return;
    setRevoking(true);
    try {
      const result = await api.post(`/api/orgs/${orgId}/revoke`, {});
      toast.success(`Thu hồi: ${result.revoked} lời mời`);
      loadOrg();
    } catch (err) { toast.error(err.message); }
    finally { setRevoking(false); }
  };

  if (!org) return null;

  const joinedMembers = org.members?.filter(m => m.invite_status === 'joined') || [];
  const invitedMembers = org.members?.filter(m => m.invite_status !== 'joined') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{org.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3">
            <span><strong>Org ID:</strong> <code className="text-xs">{org.chatgpt_account_id}</code></span>
            <Badge variant="outline">{org.plan_type || 'free'}</Badge>
          </div>
          <p className="text-muted-foreground text-xs">Created: {org.created_at}</p>
        </div>

        <Separator />

        {/* Token edit */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium">Session Token (Owner)</h4>
          </div>
          <div className="flex gap-2">
            <Input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste new session token (JWT)..."
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={handleSaveToken} disabled={savingToken} className="shrink-0 gap-1">
              <Save className="h-3.5 w-3.5" />
              {savingToken ? '...' : 'Lưu'}
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Cập nhật token sẽ reset trạng thái đồng bộ</p>
        </div>

        <Separator />

        {/* Joined Members */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-medium">Thành viên ({joinedMembers.length})</h4>
          </div>
          {joinedMembers.length > 0 ? (
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {joinedMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="truncate text-sm">{m.email}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.role === 'owner' ? statusConfig.owner.color : statusConfig.joined.color
                    }`}>
                      {m.role === 'owner' ? 'Owner' : 'Member'}
                    </span>
                    {m.role !== 'owner' && (
                      <button onClick={() => handleRemoveMember(m.id, m.email)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Xoá khỏi nhóm">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Chưa có thành viên</p>
          )}
        </div>

        {/* Invited (pending) */}
        {invitedMembers.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-medium">Đã mời ({invitedMembers.length})</h4>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {invitedMembers.map(m => {
                  const cfg = statusConfig[m.invite_status] || statusConfig.pending;
                  return (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
                      <span className="truncate text-sm">{m.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Đồng bộ...' : 'Đồng bộ'}
          </Button>
          {invitedMembers.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleRevoke} disabled={revoking}>
              <Undo2 className="h-3.5 w-3.5" />
              {revoking ? 'Đang thu hồi...' : 'Thu hồi lời mời'}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => onInvite(org.id)}>
            <Send className="h-3.5 w-3.5" /> Auto Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
