import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { message } from "antd";
import { CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { mockPayFailApi, mockPaySuccessApi } from "../api/public.payments";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function MockPayPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const pid = sp.get("pid") || "";
  const billId = sp.get("billId") || "";

  // ✅ keep table/token so we can go back to BillPage correctly
  const table = sp.get("table") || "";
  const token = sp.get("token") || "";
  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => !pid || loading, [pid, loading]);

  function backToBill() {
    // BillPage của bạn dùng query string
    if (table && token) return nav(`/bill${q}`, { replace: true });

    // fallback nếu thiếu table/token: quay lại trang trước
    nav(-1);
  }

  async function onSuccess() {
    if (!pid) return;
    setLoading(true);
    try {
      await mockPaySuccessApi(pid);
      message.success("Mock payment success!");
      backToBill();
    } catch (e: any) {
      message.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onFail() {
    if (!pid) return;
    setLoading(true);
    try {
      await mockPayFailApi(pid);
      message.info("Mock payment failed/cancelled");
      backToBill();
    } catch (e: any) {
      message.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 py-8">
        <button
          onClick={() => nav(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Mock Payment Gateway
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
            <div>
              <span className="text-slate-500">paymentId:</span>{" "}
              <span className="font-mono">{pid || "(missing)"}</span>
            </div>
            <div>
              <span className="text-slate-500">billId:</span>{" "}
              <span className="font-mono">{billId || "(missing)"}</span>
            </div>
            <div>
              <span className="text-slate-500">table:</span>{" "}
              <span className="font-mono">{table || "(missing)"}</span>
            </div>
            <div>
              <span className="text-slate-500">token:</span>{" "}
              <span className="font-mono">
                {token ? `${token.slice(0, 18)}…` : "(missing)"}
              </span>
            </div>
          </div>

          {(!table || !token) && (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Missing <b>table</b> or <b>token</b> in query string.
              <div className="mt-1 font-normal text-amber-900/80">
                Tip: when navigating to this page, include{" "}
                <span className="font-mono">?pid=...&billId=...&table=...&token=...</span>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              disabled={disabled}
              onClick={onSuccess}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
                disabled
                  ? "bg-emerald-200 text-white/80"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Success
            </button>

            <button
              disabled={disabled}
              onClick={onFail}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
                disabled
                  ? "bg-rose-200 text-white/80"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Fail
            </button>
          </div>

          {!pid && (
            <div className="mt-3 text-xs text-rose-600">
              Missing <b>pid</b> in query string. Example:{" "}
              <span className="font-mono">/mock-pay?pid=...</span>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          Đây là trang giả lập để bạn test flow pay-online trước khi tích hợp MoMo thật.
        </div>
      </div>
    </div>
  );
}
