import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { message } from "antd";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyVnpayReturnApi } from "../api/public.payments";
import { getActiveBillApi } from "../api/public.bill";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type UiState = "LOADING" | "SUCCESS" | "FAIL" | "PENDING";

const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 25_000;

function readCustomerCtx(): { table: string; token: string } {
  try {
    const raw = localStorage.getItem("customer_ctx");
    if (!raw) return { table: "", token: "" };
    const obj = JSON.parse(raw) as { table?: string; token?: string };
    return { table: obj?.table || "", token: obj?.token || "" };
  } catch {
    return { table: "", token: "" };
  }
}

export default function VnpayReturnPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  // Prefer URL params, fallback to localStorage(customer_ctx)
  const tableFromUrl = sp.get("table") || "";
  const tokenFromUrl = sp.get("token") || "";
  const ctx = useMemo(() => readCustomerCtx(), []);
  const table = tableFromUrl || ctx.table || "";
  const token = tokenFromUrl || ctx.token || "";

  const q = useMemo(() => {
    if (!table || !token) return "";
    return `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;
  }, [table, token]);

  const txnRef = sp.get("vnp_TxnRef") || "";
  const resp = sp.get("vnp_ResponseCode") || "";

  const [ui, setUi] = useState<UiState>("LOADING");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState("Verifying payment...");

  const hasTableToken = useMemo(() => !!table && !!token, [table, token]);

  function backToBill() {
    if (hasTableToken) return nav(`/bill${q}`, { replace: true });
    nav(-1);
  }

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      setUi("LOADING");
      setVerified(null);
      setStatusText("Verifying payment...");

      try {
        // 1) Verify return signature on backend (also saves rawReturnParams)
        const qs = window.location.search; // contains vnp_*
        const r = await verifyVnpayReturnApi(qs);
        if (cancelled) return;

        setVerified(!!r.verified);

        // Invalid signature => fail
        if (!r.verified) {
          setUi("FAIL");
          setStatusText("Invalid signature. Unable to verify this transaction.");
          return;
        }

        // ResponseCode != 00 => fail/cancelled
        if (r.responseCode && r.responseCode !== "00") {
          setUi("FAIL");
          setStatusText("Payment failed or was cancelled.");
          return;
        }

        // If missing table/token => can't auto-check bill
        if (!hasTableToken) {
          setUi("PENDING");
          setStatusText(
            "Missing table/token context. Please go back to the Bill page and refresh."
          );
          return;
        }

        // 2) Poll bill status (final status is confirmed by IPN)
        setUi("PENDING");
        setStatusText("Returned successfully. Waiting for server confirmation (IPN)...");

        const start = Date.now();
        while (!cancelled && Date.now() - start < POLL_TIMEOUT_MS) {
          const b = await getActiveBillApi({ table, token });
          if (cancelled) return;

          const billStatus = String(b?.bill?.status || "").toUpperCase();
          if (billStatus === "PAID") {
            setUi("SUCCESS");
            setStatusText("Payment confirmed. Redirecting...");
            message.success("Payment successful ✅");
            nav(`/bill${q}`, { replace: true });
            return;
          }

          await sleep(POLL_INTERVAL_MS);
        }

        if (!cancelled) {
          setUi("PENDING");
          setStatusText(
            "We haven't received confirmation yet. Please return to the Bill page and try refreshing."
          );
        }
      } catch (e: any) {
        if (cancelled) return;
        setUi("FAIL");
        setStatusText(e?.message || "Verification failed.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTableToken, table, token, q, nav]);

  const Icon = ui === "LOADING" ? Loader2 : ui === "SUCCESS" ? CheckCircle2 : XCircle;
  const iconClass =
    ui === "LOADING"
      ? "h-4 w-4 animate-spin text-slate-700"
      : ui === "SUCCESS"
      ? "h-4 w-4 text-emerald-600"
      : "h-4 w-4 text-rose-600";

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
          <div className="mb-3 text-sm font-semibold text-slate-900">VNPAY Return</div>

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
              Missing <b>table</b> or <b>token</b> context.
              <div className="mt-1 font-normal text-amber-900/80">
                We tried reading <b>customer_ctx</b> from localStorage but couldn't find it.
                Please open the menu QR link again to restore context.
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Icon className={iconClass} />
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
          This page validates the return parameters. The final payment status is confirmed via IPN.
        </div>
      </div>
    </div>
  );
}
