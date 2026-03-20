import { Trash2, Pencil, Eye, Users, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyField } from '@/components/ui/copy-field';
import { TotpDisplay } from './totp-display';

const statusBadge = {
  orphan: { label: 'Chưa có nhóm', class: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  invited: { label: 'Đang mời', class: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  joined: { label: 'Đã tham gia', class: 'bg-green-500/15 text-green-600 border-green-500/30' },
};

export function AccountCard({ account, status = 'orphan', onSelect, onEdit, onDelete, selectable = false, isSelected = false, onToggleSelect }) {
  const badge = statusBadge[status] || statusBadge.orphan;
  const shortName = account.email.split('@')[0];

  return (
    <Card className={`group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={selectable ? onToggleSelect : onSelect}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          {selectable ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
              {account.id}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{shortName}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.class}`}>
                {badge.label}
              </span>
              {account.totp_secret && <Badge variant="secondary" className="text-[10px] h-5">2FA</Badge>}
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-1.5 border-t px-4 py-2.5 text-[11px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 font-medium text-muted-foreground">Email</span>
            <CopyField value={account.email} label="email" className="text-[11px]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 font-medium text-muted-foreground">Pass</span>
            <CopyField value={account.password} label="password" secret className="text-[11px] font-mono" />
          </div>
          {account.totp_secret && (
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-medium text-muted-foreground">OTP</span>
              <TotpDisplay secret={account.totp_secret} />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {account.org_count || 0} org
          </span>
          <span>{account.created_at ? new Date(account.created_at).toLocaleDateString('vi-VN') : '-'}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center border-t">
          <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-3 w-3" /> Sửa
          </button>
          <div className="h-5 w-px bg-border" />
          <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3 w-3" /> Delete
          </button>
          <div className="h-5 w-px bg-border" />
          <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            <Eye className="h-3 w-3" /> Chi tiết
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
