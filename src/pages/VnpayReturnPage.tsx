import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { message } from "antd";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyVnpayReturnApi } from "../api/public.payments";
import { getActiveBillApi } from "../api/public.bill";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function VnpayReturnPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const table = sp.get("table") || "";
  const token = sp.get("token") || "";
  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const txnRef = sp.get("vnp_TxnRef") || "";
  const resp = sp.get("vnp_ResponseCode") || "";

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState("Đang xác nhận thanh toán...");

  const hasTableToken = useMemo(() => !!table && !!token, [table, token]);

  function backToBill() {
    if (table && token) return nav(`/bill${q}`, { replace: true });
    nav(-1);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) Call backend return endpoint to verify signature + store params
        const qs = window.location.search; // contains vnp_*
        const r = await verifyVnpayReturnApi(qs);
        setVerified(!!r.verified);

        // Nếu user cancel/failed theo responseCode => show luôn
        // (IPN có thể vẫn bắn, nhưng thường fail thì thôi)
        if (r.verified && r.responseCode && r.responseCode !== "00") {
          setStatusText("Thanh toán không thành công hoặc đã huỷ.");
          return;
        }

        if (!hasTableToken) {
          setStatusText("Thiếu table/token, không thể tự động kiểm tra bill.");
          return;
        }

        // 2) Poll bill status (IPN mới chốt PAID)
        setStatusText("Đã quay về. Đang chờ hệ thống xác nhận (IPN)...");
        const start = Date.now();
        const timeoutMs = 25_000;

        while (Date.now() - start < timeoutMs) {
          const b = await getActiveBillApi({ table, token });

          if (String(b?.bill?.status || "").toUpperCase() === "PAID") {
            message.success("Thanh toán thành công ✅");
            nav(`/bill${q}`, { replace: true });
            return;
          }

          await new Promise((res) => setTimeout(res, 1200));
        }

        setStatusText("Chưa nhận được xác nhận. Vui lòng quay lại trang Bill và thử refresh.");
      } catch (e: any) {
        setStatusText(e?.message || "Xác nhận thất bại");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, token]);

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
            VNPAY Return
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
            <div>
              <span className="text-slate-500">vnp_TxnRef:</span>{" "}
              <span className="font-mono">{txnRef || "(missing)"}</span>
            </div>
            <div>
              <span className="text-slate-500">vnp_ResponseCode:</span>{" "}
              <span className="font-mono">{resp || "(missing)"}</span>
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
            <div>
              <span className="text-slate-500">signature verified:</span>{" "}
              <span className="font-mono">
                {verified === null ? "(pending)" : verified ? "true" : "false"}
              </span>
            </div>
          </div>

          {!hasTableToken && (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Missing <b>table</b> or <b>token</b> in query string.
              <div className="mt-1 font-normal text-amber-900/80">
                Tip: cấu hình <b>VNP_RETURN_URL</b> nên include table/token.
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
              ) : verified ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-600" />
              )}
              {statusText}
            </div>
          </div>

          <button
            onClick={backToBill}
            className={cn(
              "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold",
              "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            Back to Bill
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          Trang này xác nhận return. Trạng thái thanh toán chuẩn sẽ do IPN cập nhật.
        </div>
      </div>
    </div>
  );
}
