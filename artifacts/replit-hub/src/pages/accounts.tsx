import { useListAccounts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Accounts() {
  const { data: accounts, isLoading } = useListAccounts();

  if (isLoading) return <div className="p-8">Loading accounts...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground mt-1">Manage your distributed Replit accounts.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts?.map((acc) => (
          <Card key={acc.id} className="bg-card">
            <CardHeader className="pb-2 flex flex-row justify-between items-start">
              <CardTitle className="text-lg">{acc.name}</CardTitle>
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${acc.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {acc.status}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono">@{acc.username}</p>
              <div className="mt-4 pt-4 border-t border-border flex justify-end">
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!accounts || accounts.length === 0) && (
          <div className="col-span-full text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
            No accounts deployed. Add an account to begin.
          </div>
        )}
      </div>
    </div>
  );
}
