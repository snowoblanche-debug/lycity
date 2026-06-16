import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, Music, ListMusic, ListOrdered, Settings, ChevronLeft } from "lucide-react";

const sidebarNavItems = [
  { title: "概覽", href: "/admin", icon: LayoutDashboard },
  { title: "歌曲管理", href: "/admin/songs", icon: Music },
  { title: "分類管理", href: "/admin/categories", icon: ListMusic },
  { title: "點歌管理", href: "/admin/queue", icon: ListOrdered },
  { title: "系統設定", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="flex flex-col h-full border-r border-border/60 w-60 p-4 gap-1 flex-shrink-0"
      style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(12px)" }}>
      <div className="mb-5 px-2 pt-1">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          返回首頁
        </button>
        <h2 className="text-base font-semibold tracking-wide text-foreground">
          管理後台
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5">
          {sidebarNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Button
                key={item.href}
                variant="ghost"
                className={`justify-start h-9 text-sm ${
                  isActive
                    ? 'bg-primary/12 text-primary font-medium hover:bg-primary/16'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
                }`}
                onClick={() => setLocation(item.href)}
                data-testid={`admin-nav-${item.href.split('/').pop() || 'overview'}`}
              >
                <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                {item.title}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </nav>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(112,136,163,0.10) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 flex w-full h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-8 bg-transparent">
          <div className="max-w-6xl mx-auto rounded-2xl shadow-lg min-h-[calc(100vh-4rem)] p-7"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)", border: "1px solid rgba(112,136,163,0.18)" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
