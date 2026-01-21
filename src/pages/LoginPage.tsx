import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { UtensilsCrossed, Loader2, CheckCircle2 } from 'lucide-react';
import { loginApi } from "../api/auth";
import { setAccessToken } from "../api/axios";
import { useAuth } from "../auth/useAuth";
import { message } from "antd";

type FormValues = {
  identifier: string;
  password: string;
};

function getErrorMessage(e: any) {
  return (
    e?.response?.data?.message ||
    e?.message ||
    "Login failed"
  );
}

export default function LoginPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const r = await loginApi(values.identifier, values.password);
      setAccessToken(r.accessToken);
      setUser({
        role: r.user.role,
        subjectType: r.user.subjectType,
        subjectId: r.user.id,
      });
      const returnTo = sp.get("returnTo");
      if (returnTo) {
        nav(returnTo, { replace: true });
      } else {
        const role = r.user.role as "USER" | "WAITER" | "KDS";
        const fallback =
          role === "USER" ? "/profile"
          : role === "WAITER" ? "/waiter"
          : "/kds";

        nav(fallback, { replace: true });
      }

    } catch (e: any) {
      message.error(getErrorMessage(e));
    }
  };

  return (
    <div className="min-h-[100svh] bg-[#EEF1F5] flex items-center justify-center font-sans">
      {/* Main Wrapper */}
      <div className="w-full h-full min-h-[100svh] md:min-h-0 md:h-auto md:max-w-[900px] md:flex md:rounded-[32px] md:shadow-2xl overflow-hidden bg-white">
        
        {/* LEFT SIDE: Hero Section */}
        <div className="bg-slate-900 px-6 pt-16 pb-20 md:pb-16 md:w-1/2 flex flex-col items-center justify-center text-center relative shrink-0 transition-all duration-500">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] bg-white/10 backdrop-blur-md text-[#E2B13C] mb-4 border border-white/20 shadow-xl">
            <UtensilsCrossed size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-[#E2B13C] text-3xl md:text-4xl font-extrabold tracking-tight">
            Smart Restaurant
          </h1>
          <p className="mt-2 text-[#E2B13C] text-sm font-medium tracking-wide max-w-[220px]">
            Scan. Order. Enjoy.
          </p>

          {/* Desktop Only */}
          <div className="hidden md:block mt-12 space-y-4 text-left">
            {['Quick QR Payment', 'Real-time Tracking', 'Exclusive Offers'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/60 text-sm">
                <CheckCircle2 size={18} className="text-[#E2B13C]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Login Form */}
        <div className="-mt-10 md:mt-0 bg-white rounded-t-[28px] md:rounded-none px-8 pt-10 pb-12 md:p-12 md:w-1/2 flex-1 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] md:shadow-none flex flex-col justify-center">
          <div className="max-w-[340px] mx-auto w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Identifier */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Username / Email
                </label>
                <input
                  {...register("identifier", { required: "Please enter username/email" })}
                  className={`w-full rounded-2xl border bg-slate-50 px-5 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C] ${
                    errors.identifier ? "border-red-400" : "border-slate-100"
                  }`}
                  placeholder="Enter your username/email"
                />
                {errors.identifier && (
                  <p className="text-xs text-red-500 font-semibold ml-2">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Password
                </label>
                <input
                  type="password"
                  {...register("password", { required: "Please enter password" })}
                  className={`w-full rounded-2xl border bg-slate-50 px-5 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#E2B13C]/10 focus:border-[#E2B13C] ${
                    errors.password ? "border-red-400" : "border-slate-100"
                  }`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-xs text-red-500 font-semibold ml-2">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const returnTo = sp.get("returnTo");
                    nav(returnTo ? `/forgot-password?returnTo=${encodeURIComponent(returnTo)}` : "/forgot-password");
                  }}
                  className="text-sm font-semibold text-[#E2B13C] hover:opacity-80 transition-opacity"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-slate-900 py-4 text-[16px] font-bold text-[#E2B13C] shadow-lg shadow-[#E2B13C]/20 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
              </button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const base = import.meta.env.VITE_APP_API_URL;
                  const returnTo = sp.get("returnTo");
                  window.location.href = `${base}/api/auth/google${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
                }}
                className="w-full rounded-full border border-slate-200 bg-white py-3.5 text-[15px] font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 space-y-6 text-center">

              <p className="text-[14px] text-slate-500 font-medium">
                Don't have an account?
                <button 
                  onClick={() => {
                    const returnTo = sp.get("returnTo");
                    nav(returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register");
                  }}
                  className="font-bold text-[#E2B13C] hover:underline ml-1"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}