import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

export function withAdminGuard<P extends object>(Component: React.ComponentType<P>) {
  return function GuardedComponent(props: P) {
    const { isAdmin, isLoading } = useAuth();
    const [, navigate] = useLocation();

    useEffect(() => {
      if (!isLoading && !isAdmin) {
        navigate("/login");
      }
    }, [isAdmin, isLoading, navigate]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-muted-foreground text-sm">載入中...</span>
        </div>
      );
    }

    if (!isAdmin) return null;

    return <Component {...props} />;
  };
}
