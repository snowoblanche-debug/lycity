import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type AuthContextType = {
  isAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wire up the customFetch token getter so ALL generated hooks include auth automatically
    setAuthTokenGetter(() => localStorage.getItem("admin_token"));

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { isAdmin?: boolean }) => {
        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          localStorage.removeItem("admin_token");
        }
      })
      .catch(() => localStorage.removeItem("admin_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json() as { token?: string; error?: string };
      if (r.ok && data.token) {
        localStorage.setItem("admin_token", data.token);
        setIsAdmin(true);
        return { success: true };
      }
      return { success: false, error: data.error ?? "登入失敗" };
    } catch {
      return { success: false, error: "網路連線錯誤" };
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
