import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2 } from 'lucide-react';
import { AccountsTab } from '@/components/teams/accounts-tab';
import { OrgsTab } from '@/components/teams/orgs-tab';

export function TeamsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Đội nhóm</h1>
        <p className="text-sm text-muted-foreground">Quản lý ChatGPT teams</p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Tài khoản
          </TabsTrigger>
          <TabsTrigger value="orgs" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Tổ chức
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <AccountsTab />
        </TabsContent>

        <TabsContent value="orgs">
          <OrgsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
