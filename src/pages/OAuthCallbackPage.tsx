import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken } from "../api/axios";
import { useAuth } from "../auth/useAuth";

export default function OAuthCallbackPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const accessToken = sp.get("accessToken");
    const homePath = sp.get("homePath") || "/user";

    if (!accessToken) {
      nav("/login", { replace: true });
      return;
    }

    setAccessToken(accessToken);
    nav(homePath, { replace: true });
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
