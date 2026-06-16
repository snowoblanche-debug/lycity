import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetSettings } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useGetSettings();
  
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-background via-[#1a2235] to-background opacity-80 pointer-events-none" />
      
      {/* Header/Nav */}
      <header className="relative z-10 w-full backdrop-blur-md bg-card/60 border-b border-white/5 py-4 px-6 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <h1 className="text-xl font-bold tracking-wider text-primary-foreground drop-shadow-md">
              {settings?.siteName || "聆櫻聖境"}
            </h1>
          </div>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/">
            <span className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">首頁</span>
          </Link>
          <Link href="/admin">
            <span className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">管理後台</span>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
