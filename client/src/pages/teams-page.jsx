import { OrgsTab } from '@/components/teams/orgs-tab';

export function TeamsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Đội nhóm</h1>
        <p className="text-sm text-muted-foreground">Quản lý ChatGPT teams</p>
      </div>
      <OrgsTab />
    </div>
  );
}
