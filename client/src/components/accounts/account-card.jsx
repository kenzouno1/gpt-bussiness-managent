import { Trash2, RefreshCw, Eye, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CopyField } from '@/components/ui/copy-field';
import { TotpDisplay } from './totp-display';

const healthConfig = {
  healthy: { label: 'Healthy', class: 'bg-green-500/15 text-green-500 border-green-500/30' },
  old: { label: 'Old', class: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  error: { label: 'Invalid', class: 'bg-red-500/15 text-red-500 border-red-500/30' },
  no_cred: { label: 'Failed', class: 'bg-red-500/15 text-red-400 border-red-400/30' },
};

export function AccountCard({ account, health = 'healthy', onSelect, onDelete }) {
  const { label: healthLabel, class: healthClass } = healthConfig[health] || healthConfig.healthy;
  const shortName = account.email.split('@')[0].substring(0, 6);

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
            {account.id}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{shortName}</p>
            <CopyField value={account.email} label="email" className="text-[11px] text-muted-foreground max-w-full" />
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${healthClass}`}>
                {healthLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Copyable fields */}
        <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px]">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="font-medium">Pass:</span>
            <CopyField value={account.password} label="password" className="text-[11px]" />
          </div>
        </div>

        {/* TOTP — already click-to-copy */}
        <div className="border-t bg-muted/20 px-4 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">2FA Code</p>
          <TotpDisplay secret={account.totp_secret} />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 1 thành viên</span>
          <span>{account.created_at ? new Date(account.created_at).toLocaleDateString('vi-VN') : '-'}</span>
        </div>

        {/* Error */}
        {(health === 'error' || health === 'no_cred') && (
          <div className="mx-4 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Token hết hạn hoặc bị từ chối.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center border-t">
          <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); }}>
            <RefreshCw className="h-3 w-3" /> Đồng bộ
          </button>
          <div className="h-5 w-px bg-border" />
          <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}>
            <Trash2 className="h-3 w-3" /> Delete
          </button>
          <div className="h-5 w-px bg-border" />
          <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onSelect(account.id); }}>
            <Eye className="h-3 w-3" /> Chi tiết
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
