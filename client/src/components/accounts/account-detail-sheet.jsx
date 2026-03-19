import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TotpDisplay } from './totp-display';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function Field({ label, value, mono, secret }) {
  const [visible, setVisible] = useState(false);
  const display = !value ? '-' : secret && !visible ? '••••••••' : value;

  const copy = () => { navigator.clipboard.writeText(value); toast.success('Đã copy!'); };

  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm break-all ${mono ? 'font-mono text-xs' : ''}`}>{display}</span>
        {secret && value && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        )}
        {value && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function AccountDetailSheet({ accountId, open, onOpenChange }) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!accountId || !open) { setAccount(null); return; }
    api.get(`/api/accounts/${accountId}`).then(setAccount).catch(() => {});
  }, [accountId, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-left">{account?.email || 'Loading...'}</SheetTitle>
        </SheetHeader>

        {account && (
          <div className="space-y-0">
            {/* 2FA Live */}
            <div className="mx-6 rounded-xl border bg-card p-5">
              <label className="text-muted-foreground mb-3 block text-[10px] font-semibold uppercase tracking-wider">
                2FA Code (Live)
              </label>
              <TotpDisplay accountId={accountId} enabled={open} large />
            </div>

            <Separator className="my-5" />

            {/* Account fields */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-6">
              <Field label="Email" value={account.email} />
              <Field label="Password" value={account.password} secret />
              <Field label="Plan" value={account.chatgpt_plan_type} />
              <Field label="Hotmail" value={account.hotmail_email} />
              <Field label="2FA Secret" value={account.totp_secret} mono secret />
            </div>

            <Separator className="my-5" />

            {/* IDs */}
            <div className="space-y-4 px-6">
              <Field label="ChatGPT Account ID" value={account.chatgpt_account_id} mono />
              <Field label="ChatGPT User ID" value={account.chatgpt_user_id} mono />
              <Field label="Session Token" value={account.session_token} mono secret />
            </div>

            <Separator className="my-5" />

            {/* Timestamps */}
            <div className="flex gap-6 px-6 pb-6 text-xs text-muted-foreground">
              <span>Created: {account.created_at || '-'}</span>
              <span>Imported: {account.imported_at || '-'}</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
