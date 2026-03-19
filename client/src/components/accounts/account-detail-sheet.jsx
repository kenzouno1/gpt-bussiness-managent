import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TotpDisplay } from './totp-display';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function Field({ label, value, mono, secret }) {
  const [visible, setVisible] = useState(false);
  const display = !value ? '-' : secret && !visible ? '••••••••' : value;

  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-xs font-medium uppercase">{label}</label>
      <div className="flex items-center gap-1">
        <span className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>{display}</span>
        {secret && value && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        {value && (
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied!'); }}>
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function AccountDetailSheet({ accountId, open, onOpenChange }) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!accountId || !open) return;
    api.get(`/api/accounts/${accountId}`).then(setAccount).catch(() => {});
  }, [accountId, open]);

  if (!account) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{account.email}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {/* Real-time 2FA */}
          <div className="rounded-lg border bg-card p-4">
            <label className="text-muted-foreground mb-2 block text-xs font-medium uppercase">2FA Code (Live)</label>
            <TotpDisplay accountId={accountId} enabled={open} large />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" value={account.email} />
            <Field label="Password" value={account.password} secret />
            <Field label="Status" value={account.status} />
            <Field label="Plan" value={account.chatgpt_plan_type} />
            <Field label="2FA Secret" value={account.totp_secret} mono secret />
            <Field label="Hotmail" value={account.hotmail_email} />
          </div>

          <Separator />

          <div className="space-y-3">
            <Field label="ChatGPT Account ID" value={account.chatgpt_account_id} mono />
            <Field label="ChatGPT User ID" value={account.chatgpt_user_id} mono />
            <Field label="Session Token" value={account.session_token} mono secret />
          </div>

          <Separator />

          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Created: {account.created_at || '-'}</span>
            <span>Imported: {account.imported_at || '-'}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
