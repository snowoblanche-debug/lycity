import { Link } from "wouter";
import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useGetSettings();
  const { isAdmin } = useAuth();

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
        <nav className="flex items-center gap-6">
          <Link href="/">
            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">首頁</span>
          </Link>
          <Link href="/history">
            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">演唱紀錄</span>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">管理後台</span>
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
