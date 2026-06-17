import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const { login, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (isAdmin) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    setError("");
    const result = await login(password);
    setIsLoading(false);
    if (result.success) {
      navigate("/admin");
    } else {
      setError(result.error ?? "登入失敗");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at 60% 0%, rgba(112,136,163,0.13) 0%, transparent 70%), radial-gradient(ellipse at 10% 80%, rgba(142,163,185,0.10) 0%, transparent 60%), #f5f7fa",
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border/60 shadow-xl p-8 flex flex-col gap-6"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(112,136,163,0.15)" }}
          >
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">管理後台</h1>
            <p className="text-sm text-muted-foreground mt-0.5">聆櫻聖境的點歌旋律</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-[#4B5563]">管理員密碼</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="請輸入密碼"
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" disabled={!password || isLoading} className="w-full">
            {isLoading ? "驗證中..." : "登入"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          僅限聆櫻本人使用
        </p>
      </div>
    </div>
  );
}
