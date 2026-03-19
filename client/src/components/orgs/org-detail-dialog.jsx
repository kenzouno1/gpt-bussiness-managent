import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';

const statusVariant = {
  pending: 'outline',
  sent: 'default',
  joined: 'secondary',
  failed: 'destructive',
};

export function OrgDetailDialog({ orgId, open, onOpenChange, onInvite }) {
  const [org, setOrg] = useState(null);

  useEffect(() => {
    if (!orgId || !open) return;
    api.get(`/api/orgs/${orgId}`).then(setOrg).catch(() => {});
  }, [orgId, open]);

  if (!org) return null;

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

        <div>
          <h4 className="mb-2 text-sm font-medium">Members ({org.members?.length || 0})</h4>
          {org.members?.length > 0 ? (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {org.members.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="truncate text-sm">{m.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{m.role}</span>
                    <Badge variant={statusVariant[m.invite_status] || 'outline'} className="text-xs">
                      {m.invite_status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No members yet</p>
          )}
        </div>

        <DialogFooter>
          <Button className="gap-2" onClick={() => onInvite(org.id)}>
            <Send className="h-4 w-4" /> Auto Invite All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
