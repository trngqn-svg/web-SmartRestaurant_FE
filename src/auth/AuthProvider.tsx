import React, { createContext, useContext, useEffect, useState } from "react";
import { meApi, logoutApi } from "../api/auth";
import { clearAccessToken, initAuthProactiveRefresh } from "../api/axios";

type Role = "USER" | "WAITER" | "KDS";

type AuthUser = {
  role: Role;
  subjectId: string;
  subjectType: "USER" | "ACCOUNT";
};

type AuthCtx = {
  loading: boolean;
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        initAuthProactiveRefresh();

        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const r = await meApi();
        setUser(r.user);
      } catch {
        // token hỏng / hết hạn / wrong secret => clear
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logout() {
    try {
      await logoutApi();
    } finally {
      clearAccessToken();
      setUser(null);
      window.location.href = "/login";
    }
  }

  return (
    <Ctx.Provider value={{ loading, user, setUser, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
