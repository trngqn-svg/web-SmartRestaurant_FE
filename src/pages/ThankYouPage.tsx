import { useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";

export default function ThankYouPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    localStorage.removeItem("customer_ctx");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 pt-16">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm text-center">
          <div className="text-2xl font-extrabold text-slate-900">Thank you!</div>
          <div className="mt-2 text-sm text-slate-600">
            We hope to see you again. 
            {!user && (
              <span className="ml-1">
                If you would like to become a member, please
                <span 
                  className="ml-1 underline text-[#E2B13C] cursor-pointer"
                  onClick={() => nav("/register")}
                >
                  Join with us
                </span>.
              </span>
            )}
          </div>

          {user && (
            <button
              onClick={logout}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-[#E2B13C] shadow hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
