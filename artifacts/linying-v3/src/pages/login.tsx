import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAdminAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      const data = await res.json();
      login(data.token);
      toast({ title: "登入成功", description: "歡迎回來" });
      setLocation("/admin");
    } catch (err) {
      toast({ 
        title: "登入失敗", 
        description: "密碼錯誤或系統發生異常", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-sm z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-wider text-primary-foreground mb-2">LY.city</h1>
          <p className="text-muted-foreground text-sm tracking-widest">管理員登入</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 rounded-xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              PASSWORD
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="輸入管理員密碼"
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors h-11"
              data-testid="input-password"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-primary/20 hover:bg-primary/30 text-primary-foreground border border-primary/20 hover:border-primary/40 transition-all"
            disabled={!password || isSubmitting}
            data-testid="button-login"
          >
            {isSubmitting ? "驗證中..." : "進入後台"}
          </Button>
        </form>
      </div>
    </div>
  );
}
