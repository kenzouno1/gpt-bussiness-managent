import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TotpDisplay } from './totp-display';

export function AccountCard({ account, onSelect, onDelete }) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(account.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{account.email}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">{account.status || 'unknown'}</Badge>
              <Badge variant="outline" className="text-xs">{account.chatgpt_plan_type || 'free'}</Badge>
            </div>
          </div>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* TOTP code */}
        <div className="mt-3 rounded-md border bg-muted/50 px-3 py-2">
          <TotpDisplay accountId={account.id} />
        </div>

        {/* Org ID */}
        {account.chatgpt_account_id && (
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
            Org: {account.chatgpt_account_id.substring(0, 8)}...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
