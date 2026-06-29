import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  MessageSquare, 
  Wand2, 
  BookOpen, 
  KeyRound,
  Settings,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthCheck } from "@workspace/api-client-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Accounts", href: "/accounts", icon: Users },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Skills", href: "/skills", icon: Wand2 },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "API Keys", href: "/apikeys", icon: KeyRound },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center mr-3">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight">Replit Hub</span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-2 px-2">
            <div className={cn("w-2 h-2 rounded-full", health?.status === "ok" ? "bg-green-500" : "bg-red-500")} />
            <span className="text-xs text-muted-foreground">API: {health?.status === "ok" ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
