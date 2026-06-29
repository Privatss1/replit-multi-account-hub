import { useListApiKeys } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, KeyRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function ApiKeys() {
  const { data: keys, isLoading } = useListApiKeys();

  if (isLoading) return <div className="p-8">Loading API vault...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Vault</h1>
          <p className="text-muted-foreground mt-1">Manage external service credentials.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Key
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keys?.map((key) => (
          <Card key={key.id} className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center">
                  <KeyRound className="w-4 h-4 mr-2 text-primary" />
                  {key.label}
                </CardTitle>
                <Switch checked={key.isActive} />
              </div>
              <CardDescription>{key.service}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-2 bg-muted/50 rounded font-mono text-sm text-muted-foreground break-all">
                {key.keyMasked}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!keys || keys.length === 0) && (
          <div className="col-span-full text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
            No API keys stored.
          </div>
        )}
      </div>
    </div>
  );
}
