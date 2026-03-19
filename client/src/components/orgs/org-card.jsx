import { Trash2, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function OrgCard({ org, onSelect, onInvite, onDelete }) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(org.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{org.name}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {org.chatgpt_account_id?.substring(0, 12)}...
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-green-600"
              onClick={(e) => { e.stopPropagation(); onInvite(org.id); }}
              title="Auto Invite"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(org.id); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{org.plan_type || 'free'}</Badge>
          <Badge variant="secondary" className="text-xs">{org.member_count} members</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
