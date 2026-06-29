import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, FolderKanban, MessageSquare, Database } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-1">System overview and resource limits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Accounts</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activeAccounts || 0} <span className="text-sm text-muted-foreground font-normal">/ {summary?.totalAccounts || 0}</span></div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            <FolderKanban className="w-4 h-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activeProjects || 0} <span className="text-sm text-muted-foreground font-normal">/ {summary?.totalProjects || 0}</span></div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalMessages || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Knowledge Base</CardTitle>
            <Database className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalMemories || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Fleet Limits Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span>agent-alpha</span>
                 <span className="text-yellow-500">82% used</span>
               </div>
               <Progress value={82} className="h-2" indicatorClassName="bg-yellow-500" />
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span>agent-beta</span>
                 <span className="text-muted-foreground">15% used</span>
               </div>
               <Progress value={15} className="h-2" />
             </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4 text-sm">
               <div className="flex justify-between border-b border-border pb-2">
                 <span className="text-muted-foreground">agent-alpha created memory in Replit Core</span>
                 <span>10m ago</span>
               </div>
               <div className="flex justify-between border-b border-border pb-2">
                 <span className="text-muted-foreground">agent-beta started conversation</span>
                 <span>1h ago</span>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
