import { Trash2, RefreshCw, Eye, Copy, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TotpDisplay } from './totp-display';
import { toast } from 'sonner';

const healthConfig = {
  healthy: { label: 'Healthy', class: 'bg-green-500/15 text-green-500 border-green-500/30' },
  old: { label: 'Old', class: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  error: { label: 'Invalid', class: 'bg-red-500/15 text-red-500 border-red-500/30' },
  no_cred: { label: 'Failed', class: 'bg-red-500/15 text-red-400 border-red-400/30' },
};

export function AccountCard({ account, health = 'healthy', onSelect, onDelete }) {
  const { label: healthLabel, class: healthClass } = healthConfig[health] || healthConfig.healthy;

  const copyEmail = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(account.email);
    toast.success('Email đã copy');
  };

  // Short name from email prefix
  const shortName = account.email.split('@')[0].substring(0, 6);

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
      <CardContent className="p-0">
        {/* Header with avatar + status badges */}
        <div className="flex items-start gap-3 p-4">
          {/* Number avatar like reference */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
            {account.id}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{shortName}</p>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{account.email}</p>
            {/* Status badges */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${healthClass}`}>
                {healthLabel}
              </span>
              {health === 'error' && (
                <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  Failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> 1 thành viên
          </span>
          <span>
            {account.created_at ? new Date(account.created_at).toLocaleDateString('vi-VN') : '-'}
          </span>
          <span>{account.chatgpt_plan_type || 'free'}</span>
        </div>

        {/* Error message (if unhealthy) */}
        {(health === 'error' || health === 'no_cred') && (
          <div className="mx-4 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Token hết hạn hoặc bị từ chối. Xác thực lại để khôi phục đồng bộ.
          </div>
        )}

        {/* TOTP section */}
        <div className="border-t bg-muted/20 px-4 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">2FA Code</p>
          <TotpDisplay accountId={account.id} />
        </div>

        {/* Actions - matching reference */}
        <div className="flex items-center gap-0 border-t">
          <button
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); loadAccounts?.(); }}
          >
            <RefreshCw className="h-3 w-3" /> Đồng bộ ngay
          </button>
          <div className="h-5 w-px bg-border" />
          <button
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
          <div className="h-5 w-px bg-border" />
          <button
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onSelect(account.id); }}
          >
            <Eye className="h-3 w-3" /> Chi tiết
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
