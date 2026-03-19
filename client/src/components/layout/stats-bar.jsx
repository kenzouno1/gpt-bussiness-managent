import { Card, CardContent } from '@/components/ui/card';

// Reusable stats bar for dashboard-style headers
export function StatsBar({ stats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border-l-4" style={{ borderLeftColor: color || 'var(--primary)' }}>
          <CardContent className="flex items-center gap-3 p-3">
            {Icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
