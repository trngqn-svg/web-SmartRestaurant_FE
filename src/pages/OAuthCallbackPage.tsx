import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { meApi } from "../api/auth";
import { setAccessToken, clearAccessToken } from "../api/axios";
import { useAuth } from "../auth/useAuth";

type Role = "USER" | "WAITER" | "KDS";

function roleHome(role: Role) {
  if (role === "WAITER") return "/waiter";
  if (role === "KDS") return "/kds";
  return "/profile";
}

export default function OAuthCallbackPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    let alive = true;

    (async () => {
      const accessToken = sp.get("accessToken");
      const returnTo = sp.get("returnTo");
      const homePath = sp.get("homePath");

      if (!accessToken) {
        nav("/login", { replace: true });
        return;
      }

      try {
        setAccessToken(accessToken);
        const r = await meApi();
        if (!alive) return;

        setUser(r.user);

        if (returnTo) {
          nav(returnTo, { replace: true });
          return;
        }

        const role = r.user.role as Role;

        if (homePath && role !== "USER") {
          nav(homePath, { replace: true });
        } else {
          nav(roleHome(role), { replace: true });
        }
      } catch (e) {
        clearAccessToken();
        if (!alive) return;
        setUser(null);
        nav("/login", { replace: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [sp, nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-2xl border border-slate-200 p-5">
        <div className="text-base font-semibold">Signing you in...</div>
        <div className="mt-1 text-sm text-slate-600">Please wait</div>
      </div>
    </div>
  );
}
