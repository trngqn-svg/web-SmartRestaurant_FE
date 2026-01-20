import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UtensilsCrossed, Loader2, Mail } from "lucide-react";
import { message } from "antd";
import { forgotPasswordApi } from "../api/auth.password";
import { PasswordResetStore } from "../auth/passwordReset.store";

function isEmailLike(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const [email, setEmail] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const cooldownLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  }, [cooldownUntil]);

  async function onSubmit() {
    const e = email.trim().toLowerCase();

    if (!isEmailLike(e)) {
      message.error("Email invalid");
      return;
    }
    if (cooldownLeft > 0) return;

    try {
      setLoading(true);
      const r = await forgotPasswordApi(e);

      message.success(r.message ?? "If email exist, we will send OTP to your email.");

      if (r.cooldownSeconds) {
        setCooldownUntil(Date.now() + r.cooldownSeconds * 1000);
      }

      if (r.resetId) {
        console.log("test");
        PasswordResetStore.setEmail(e);
        PasswordResetStore.setResetId(r.resetId);
        PasswordResetStore.clearResetToken();

        const returnTo = sp.get("returnTo");
        nav(
          returnTo
            ? `/forgot-password/otp?returnTo=${encodeURIComponent(returnTo)}`
            : "/forgot-password/otp",
          { replace: true }
        );
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? "Cannot send OTP");
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
          <p className="mt-2 text-[#E2B13C] text-sm font-medium tracking-wide max-w-[260px]">
            Reset your password with OTP via email.
          </p>
        </div>

        {/* RIGHT */}
        <div className="-mt-10 md:mt-0 bg-white rounded-t-[28px] md:rounded-none px-8 pt-10 pb-12 md:p-12 md:w-1/2 flex-1 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] md:shadow-none flex flex-col justify-center">
          <div className="max-w-[340px] mx-auto w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              Forgot password
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Enter your email to receive an OTP code.
            </p>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 pl-11 pr-5 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C] border-slate-100"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || cooldownLeft > 0}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-slate-900 py-4 text-[16px] font-bold text-[#E2B13C] shadow-lg shadow-[#E2B13C]/20 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Sending...
                </>
              ) : cooldownLeft > 0 ? (
                `Resend in ${cooldownLeft}s`
              ) : (
                "Send OTP"
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
