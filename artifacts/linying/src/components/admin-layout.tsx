import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, Music, ListMusic, ListOrdered, Settings } from "lucide-react";

const sidebarNavItems = [
  {
    title: "概覽",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "歌曲管理",
    href: "/admin/songs",
    icon: Music,
  },
  {
    title: "分類管理",
    href: "/admin/categories",
    icon: ListMusic,
  },
  {
    title: "點歌管理",
    href: "/admin/queue",
    icon: ListOrdered,
  },
  {
    title: "系統設定",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="flex flex-col h-full border-r border-white/5 bg-card/40 backdrop-blur-md w-64 p-4 gap-2">
      <div className="mb-6 px-2">
        <h2 className="text-lg font-bold tracking-wider text-primary-foreground drop-shadow-md cursor-pointer" onClick={() => setLocation('/')}>
          聆櫻聖境 管理後台
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1">
          {sidebarNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={`justify-start ${isActive ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setLocation(item.href)}
                data-testid={`admin-nav-${item.href.split('/').pop() || 'overview'}`}
              >
                <item.icon className="mr-2 h-4 w-4" />
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
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-background via-[#1a2235] to-background opacity-80 pointer-events-none" />
      <div className="relative z-10 flex w-full h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto backdrop-blur-lg bg-card/60 border border-white/5 rounded-xl shadow-xl p-6 min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
