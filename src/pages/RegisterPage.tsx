import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  UtensilsCrossed,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { registerApi } from "../api/auth";
import { message } from "antd";
import {
  calcPasswordStrength,
  validateStrongPassword,
  type PasswordStrength,
} from "../utils/password";

type FormValues = {
  fullName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
};

function getErrorMessage(e: any) {
  const msg = e?.response?.data?.message ?? e?.message ?? "Register failed";
  if (Array.isArray(msg)) return msg.join(", ");
  return String(msg);
}

function SuccessModal({ open, onOk }: { open: boolean; onOk: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl text-center transform transition-all scale-100">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-500">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Awesome!</h2>
        <p className="mt-3 text-slate-500 font-medium leading-relaxed">
          Your account has been created successfully. Let's get started.
        </p>
        <button
          type="button"
          onClick={onOk}
          className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-bold text-[#E2B13C] shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

function StrengthBar({ s }: { s: PasswordStrength }) {
  const pct = ((s.score + 1) / 5) * 100; // 0..4 => 20..100
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">
          Strength:{" "}
          <span className="font-extrabold text-slate-800">{s.label}</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          {s.score}/4
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-2 rounded-full bg-slate-900 transition-all"
          style={{ width: `${pct}%` }}
        />
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
          ok
            ? "bg-green-50 border-green-200 text-green-600"
            : "bg-white border-slate-200 text-slate-300",
        ].join(" ")}
      >
        <CheckCircle2
          size={14}
          strokeWidth={2.5}
          className={ok ? "" : "opacity-60"}
        />
      </span>
      <span
        className={[
          "text-[12px] font-semibold",
          ok ? "text-slate-700" : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const returnTo = sp.get("returnTo");

  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agree: false,
    },
    mode: "onTouched",
  });

  const password = watch("password");
  const strength = useMemo(() => calcPasswordStrength(password || ""), [password]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await registerApi({
        email: values.email,
        password: values.password,
        fullName: values.fullName?.trim() || undefined,
      });
      setSuccessOpen(true);
    } catch (e: any) {
      message.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  function handleOk() {
    setSuccessOpen(false);
    if (returnTo) {
      nav(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    } else {
      nav("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-[100svh] bg-[#EEF1F5] flex items-center justify-center font-sans">
      <SuccessModal open={successOpen} onOk={handleOk} />

      <div className="w-full h-full min-h-[100svh] md:min-h-0 md:h-auto md:max-w-[900px] md:flex md:rounded-[32px] md:shadow-2xl overflow-hidden bg-white">
        {/* LEFT */}
        <div className="bg-slate-900 px-6 pt-12 pb-14 md:p-12 md:w-1/2 flex flex-col items-center justify-center text-center relative shrink-0">
          <div className="mx-auto mb-4 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
            <UtensilsCrossed className="text-[#E2B13C] h-8 w-8 md:h-10 md:w-10" />
          </div>
          <h1 className="text-[#E2B13C] text-3xl md:text-4xl font-extrabold tracking-tight">
            Create Account
          </h1>
          <p className="text-[#E2B13C] text-sm mt-2 font-medium">
            Join the Smart Restaurant community
          </p>

          <div className="hidden md:block mt-10 space-y-4 text-left self-start mx-auto">
            {["Fast & Secured Ordering", "Exclusive Rewards", "Order History"].map(
              (item) => (
                <div key={item} className="flex items-center gap-3 text-white/50 text-sm">
                  <CheckCircle2 size={16} className="text-[#E2B13C]" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="-mt-8 md:mt-0 rounded-t-[32px] md:rounded-none bg-white px-6 pt-10 pb-12 md:p-12 md:w-1/2 flex-1 z-10 relative overflow-y-auto">
          <div className="max-w-[340px] mx-auto w-full">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-slate-500 tracking-wider ml-1">
                  Full Name
                </label>
                <input
                  {...register("fullName", {
                    maxLength: { value: 50, message: "Max 50 chars" },
                  })}
                  className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C]"
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-[11px] text-red-500 ml-1 font-semibold">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-slate-500 tracking-wider ml-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email",
                    },
                  })}
                  className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C]"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 ml-1 font-semibold">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Password
                </label>

                <div>
                  <input
                    type="password"
                    {...register("password", {
                      validate: (v) => validateStrongPassword(v),
                      onChange: () => {
                        trigger("confirmPassword");
                      },
                    })}
                    className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C]"
                    placeholder="Enter your password"
                  />
                </div>

                {password ? (
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

                {errors.password && (
                  <p className="text-xs text-red-500 ml-1 font-semibold">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    type="password"
                    {...register("confirmPassword", {
                      required: "Confirm password is required",
                      validate: (v) => v === password || "Passwords do not match",
                    })}
                    className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C]"
                    placeholder="Confirm your password"
                  />
                </div>

                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1 font-semibold">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      {...register("agree", { required: "You must agree to the terms" })}
                      className="peer h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-[#E2B13C]/20 transition-all cursor-pointer accent-slate-900 mr-2"
                    />
                    <span className="text-xs text-slate-500 leading-snug font-medium select-none">
                      I agree to the{" "}
                      <button type="button" className="text-[#E2B13C] font-bold hover:underline">
                        Terms of Service
                      </button>{" "}
                      and{" "}
                      <button type="button" className="text-[#E2B13C] font-bold hover:underline">
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </div>
                </label>
                {errors.agree && (
                  <p className="text-xs text-red-500 mt-1 font-semibold ml-1">
                    {errors.agree.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={submitting || successOpen}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-[#E2B13C] text-[16px] font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-6"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  or
                </span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const base = import.meta.env.VITE_APP_API_URL;
                  const returnTo = sp.get("returnTo");
                  window.location.href = `${base}/api/auth/google${
                    returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
                  }`;
                }}
                className="w-full rounded-full border border-slate-200 bg-white py-3.5 text-[15px] font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </button>

              {/* Footer */}
              <div className="text-center space-y-4">
                <p className="text-[14px] text-slate-500 font-medium">
                  Already have an account?{" "}
                  <Link
                    to={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
                    className="font-bold text-[#E2B13C] hover:underline transition-all"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
