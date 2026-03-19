import { Trash2, Send, Users, Eye, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const syncBadge = {
  healthy: { label: 'Healthy', class: 'bg-green-500/15 text-green-500 border-green-500/30' },
  invalid: { label: 'Invalid', class: 'bg-red-500/15 text-red-500 border-red-500/30' },
  failed: { label: 'Failed', class: 'bg-red-500/15 text-red-400 border-red-400/30' },
  no_credential: { label: 'No credential', class: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  pending: { label: 'Chưa đồng bộ', class: 'bg-muted text-muted-foreground border-border' },
};

export function OrgCard({ org, selectable, isSelected, onToggleSelect, onSelect, onInvite, onDelete }) {
  const handleClick = () => {
    if (selectable) { onToggleSelect(); }
    else { onSelect(org.id); }
  };

  return (
    <Card
      className={`group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer ${
        isSelected ? 'border-primary ring-1 ring-primary/30' : ''
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          {/* Checkbox or number avatar */}
          {selectable ? (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
              isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
            }`}>
              {isSelected && <Check className="h-5 w-5" />}
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
              {org.member_count}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{org.name}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {org.chatgpt_account_id}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {org.sync_status && syncBadge[org.sync_status] && (
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${syncBadge[org.sync_status].class}`}>
                  {syncBadge[org.sync_status].label}
                </span>
              )}
              <Badge variant="outline" className="text-[10px] h-5">{org.plan_type || 'free'}</Badge>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {org.member_count || 0} member
          </span>
          {(org.invite_count > 0) && (
            <span className="text-amber-500">{org.invite_count} invited</span>
          )}
          <span>{org.created_at ? new Date(org.created_at).toLocaleDateString('vi-VN') : '-'}</span>
        </div>

        {/* Error message */}
        {org.sync_error && (
          <div className="mx-3 mb-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
            {org.sync_error.substring(0, 80)}
          </div>
        )}

        {/* Actions */}
        {!selectable && (
          <div className="flex items-center border-t">
            <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onInvite(org.id); }}>
              <Send className="h-3 w-3" /> Invite
            </button>
            <div className="h-5 w-px bg-border" />
            <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onDelete(org.id); }}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
            <div className="h-5 w-px bg-border" />
            <button className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onSelect(org.id); }}>
              <Eye className="h-3 w-3" /> Chi tiết
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
