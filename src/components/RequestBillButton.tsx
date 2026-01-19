import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { message } from "antd";
import { requestBillApi } from "../api/public.bill";
import { cn } from "../utils/cn";
import type { PublicTableSession } from "../api/public.session";

export default function RequestBillButton({
  session,
  onRequested,
  className,
}: {
  session: PublicTableSession | null;
  onRequested?: () => void;
  className?: string;
}) {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const token = sp.get("token") || "";

  const [acting, setActing] = useState(false);

  const label =
    session?.status === "BILL_REQUESTED"
      ? "View Bill"
      : session?.status === "PAYMENT_PENDING"
      ? "Payment Pending"
      : session?.status === "PAID"
      ? "Paid (View)"
      : session?.status === "CLOSED"
      ? "Closed"
      : "Request Bill";

  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const disabled = acting || !session || !table || !token || session.status === "CLOSED";

  async function onClick() {
    if (!session) return;

    // ✅ luôn cho vào bill page nếu đã request rồi
    if (session.status === "BILL_REQUESTED" || session.status === "PAYMENT_PENDING" || session.status === "PAID") {
      nav(`/bill${q}`);
      return;
    }

    // ✅ OPEN -> request bill rồi chuyển trang
    setActing(true);
    try {
      await requestBillApi({ sessionId: session.sessionId });
      message.success("Requested bill successfully");
      onRequested?.();
      nav(`/bill${q}`);
    } catch (e: any) {
      message.error(e?.message || "Request bill failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-full px-5 py-2.5 text-sm font-extrabold shadow-sm active:scale-[0.99]",
        disabled ? "bg-slate-700/60 text-white/60" : "bg-slate-800 text-[#E2B13C] hover:bg-slate-700",
        className
      )}
    >
      {acting ? "Working..." : label}
    </button>
  );
}
