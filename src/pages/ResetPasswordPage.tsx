import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UtensilsCrossed, Loader2, Lock } from "lucide-react";
import { message } from "antd";
import { resetPasswordApi } from "../api/auth.password";
import { PasswordResetStore } from "../auth/passwordReset.store";
import {
  calcPasswordStrength,
  validateStrongPassword,
  type PasswordStrength,
} from "../utils/password";

function StrengthBar({ s }: { s: PasswordStrength }) {
  const pct = ((s.score + 1) / 5) * 100;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">
          Strength: <span className="font-extrabold text-slate-800">{s.label}</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-400">{s.score}/4</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "inline-flex h-4 w-4 items-center justify-center rounded-full border",
          ok ? "bg-green-50 border-green-200 text-green-600" : "bg-white border-slate-200 text-slate-300",
        ].join(" ")}
      >
        <span className={ok ? "font-bold" : "opacity-60"}>✓</span>
      </span>
      <span className={["text-[12px] font-semibold", ok ? "text-slate-700" : "text-slate-400"].join(" ")}>
        {label}
      </span>
    </div>
  );
}

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetToken = PasswordResetStore.getResetToken();
  const strength = useMemo(() => calcPasswordStrength(newPassword || ""), [newPassword]);

  useEffect(() => {
    if (!resetToken) {
      const returnTo = sp.get("returnTo");
      nav(returnTo ? `/forgot-password?returnTo=${encodeURIComponent(returnTo)}` : "/forgot-password", {
        replace: true,
      });
    }
  }, [resetToken, nav, sp]);

  async function onSubmit() {
    const pwCheck = validateStrongPassword(newPassword);
    if (pwCheck !== true) {
      message.error(pwCheck);
      return;
    }

    if (newPassword !== confirmPassword) {
      message.error("Password confirmation does not match.");
      return;
    }

    if (!resetToken) return;

    try {
      setLoading(true);
      await resetPasswordApi({ resetToken, newPassword, confirmPassword });

      PasswordResetStore.clearAll();
      message.success("Password changed successfully!");

      const returnTo = sp.get("returnTo");
      nav(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login", { replace: true });
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Unable to change password");
    } finally {
      setLoading(false);
    }
  }

  const returnTo = sp.get("returnTo");
  const backLoginPath = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  return (
    <div className="min-h-[100svh] bg-[#EEF1F5] flex items-center justify-center font-sans px-4">
      <div className="w-full max-w-[900px] md:flex md:rounded-[32px] md:shadow-2xl overflow-hidden bg-white">
        {/* LEFT */}
        <div className="bg-slate-900 px-6 pt-16 pb-20 md:pb-16 md:w-1/2 flex flex-col items-center justify-center text-center shrink-0">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] bg-white/10 backdrop-blur-md text-[#E2B13C] mb-4 border border-white/20 shadow-xl">
            <UtensilsCrossed size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-[#E2B13C] text-3xl md:text-4xl font-extrabold tracking-tight">
            Smart Restaurant
          </h1>
          <p className="mt-2 text-[#E2B13C] text-sm font-medium tracking-wide max-w-[280px]">
            Set your new password securely.
          </p>
        </div>

        {/* RIGHT */}
        <div className="-mt-10 md:mt-0 bg-white rounded-t-[28px] md:rounded-none px-8 pt-10 pb-12 md:p-12 md:w-1/2 flex-1 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] md:shadow-none flex flex-col justify-center">
          <div className="max-w-[340px] mx-auto w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              New password
            </h2>

            <div className="space-y-2 mt-6">
              <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 pl-11 pr-5 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C] border-slate-100"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>

              {newPassword ? (
                <>
                  <StrengthBar s={strength} />
                  <div className="mt-3 grid grid-cols-1 gap-1.5">
                    <CheckItem ok={strength.checks.length8} label="At least 8 characters" />
                    <CheckItem ok={strength.checks.lower} label="Lowercase letter (a-z)" />
                    <CheckItem ok={strength.checks.upper} label="Uppercase letter (A-Z)" />
                    <CheckItem ok={strength.checks.number} label="Number (0-9)" />
                    <CheckItem ok={strength.checks.special} label="Special character (!@#...)" />
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Confirm password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 pl-11 pr-5 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C] border-slate-100"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-slate-900 py-4 text-[16px] font-bold text-[#E2B13C] shadow-lg shadow-[#E2B13C]/20 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Saving...
                </>
              ) : (
                "Update password"
              )}
            </button>

            <div className="mt-8 text-center text-[14px] text-slate-500 font-medium">
              <Link to={backLoginPath} className="font-bold text-[#E2B13C] hover:underline">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
