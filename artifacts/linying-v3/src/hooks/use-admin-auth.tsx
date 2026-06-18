import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set the global fetcher token getter
setAuthTokenGetter(() => localStorage.getItem("admin_token"));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem("admin_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      const currentToken = localStorage.getItem("admin_token");
      if (!currentToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/me", {
          headers: {
            "Authorization": `Bearer ${currentToken}`
          }
        });
        
        if (!res.ok) {
          throw new Error("Invalid token");
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        localStorage.removeItem("admin_token");
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem("admin_token", newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setTokenState(null);
    setLocation("/admin/login");
    toast({
      title: "已登出",
      description: "您已成功登出管理後台"
    });
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AuthProvider");
  }
  return context;
}
