import { Link, useLocation } from "wouter";
import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useGetSettings();
  const { isAdmin, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(112,136,163,0.10) 0%, transparent 70%), radial-gradient(ellipse at 10% 80%, rgba(142,163,185,0.08) 0%, transparent 60%)" }}
      />

      <header className="relative z-10 w-full backdrop-blur-md border-b border-border/60 py-3.5 px-6 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.80)" }}>
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-lg font-semibold tracking-wide text-foreground">
              {settings?.siteName || "LY.city"}
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-5">
          <Link href="/">
            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">首頁</span>
          </Link>
          <Link href="/history">
            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">演唱紀錄</span>
          </Link>

          {!isLoading && isAdmin && (
            <>
              <Link href="/admin">
                <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">管理後台</span>
              </Link>
              <div className="flex items-center gap-2 pl-1 border-l border-border/60">
                <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md"
                  style={{ background: "rgba(112,136,163,0.12)", color: "#4B5563" }}>
                  <Shield className="w-3 h-3 text-primary" />
                  已登入管理員
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  登出
                </Button>
              </div>
            </>
          )}

          {!isLoading && !isAdmin && (
            <Link href="/login">
              <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">登入</span>
            </Link>
          )}
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
