import { Trash2, Send, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function OrgCard({ org, onSelect, onInvite, onDelete }) {
  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
      onClick={() => onSelect(org.id)}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{org.name}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {org.chatgpt_account_id}
            </p>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700"
              onClick={(e) => { e.stopPropagation(); onInvite(org.id); }} title="Auto Invite">
              <Send className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(org.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5">{org.plan_type || 'free'}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-sm font-semibold">{org.member_count}</span>
            <span className="text-[10px]">members</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
          Created: {org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}
        </div>
      </CardContent>
    </Card>
  );
}
