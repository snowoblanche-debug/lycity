import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { useGetActiveSession } from "@workspace/api-client-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAdminAuth();
  const { data: activeSessionData } = useGetActiveSession();

  const navItems = [
    { href: "/admin", label: "點歌隊列" },
    { href: "/admin/songs", label: "歌曲管理" },
    { href: "/admin/sessions", label: "歌回管理" },
    { href: "/admin/categories", label: "分類管理" },
    { href: "/admin/settings", label: "系統設定" },
    { href: "/admin/requesters", label: "聽眾排行" },
    { href: "/admin/stats", label: "統計概覽" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-card border-r md:min-h-screen flex flex-col z-10 relative">
        <div className="p-6 border-b border-border/50">
          <h1 className="text-xl font-bold tracking-wider text-primary-foreground">LY.city V3</h1>
          <p className="text-xs text-muted-foreground mt-1">管理後台</p>
        </div>
        
        {activeSessionData?.session && (
          <div className="px-4 py-3 bg-primary/10 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-medium text-primary-foreground">進行中: {activeSessionData.session.title}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`px-4 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                  location === item.href
                    ? "bg-primary/20 text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`nav-${item.label}`}
              >
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground hover:text-foreground border-border/50 bg-transparent hover:bg-muted"
            onClick={logout}
            data-testid="btn-logout"
          >
            登出
          </Button>
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <Link href="/">
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                返回歌庫首頁 →
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 max-h-screen overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px]" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
