import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { cn } from "../../utils/cn";
import { useAuth } from "../../auth/AuthProvider";
import { config } from "../../config/websocket";
import { ClipboardList, CreditCard, LogOut, Wifi, WifiOff } from "lucide-react";

export default function WaiterLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [connected, setConnected] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const isOrders = location.pathname.includes("/waiter/orders");
  const isBills = location.pathname.includes("/waiter/bills");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setConnected(false);
      return;
    }

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    const socket = io(config.WS_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      try {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);
        socket.disconnect();
      } catch {}
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;

      setConnected(false);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const tabBtnClass = (active: boolean) =>
    cn(
      "relative -mb-px inline-flex items-center justify-center px-3 py-3 text-sm font-semibold transition",
      active ? "text-[#E2B13C]" : "text-white hover:text-slate-200"
    );

  const underlineClass = (active: boolean) =>
    cn("absolute left-0 right-0 bottom-0 h-[2px] rounded-full", active ? "bg-[#E2B13C]" : "bg-transparent");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-extrabold tracking-tight text-[#E2B13C]">Waiter Dashboard</div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                connected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}
            >
              {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {connected ? "Online" : "Offline"}
            </span>
          </div>

          <button
            onClick={onLogout}
            disabled={loggingOut}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-extrabold tracking-tight shadow-sm",
              loggingOut ? "bg-slate-700 text-slate-300 cursor-not-allowed" : "bg-rose-600 text-white hover:bg-rose-500"
            )}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* top tabs */}
        <div className="mx-auto max-w-3xl px-2">
          <div className="flex items-stretch gap-1">
            <button onClick={() => navigate("/waiter/orders")} className={tabBtnClass(isOrders)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Orders
              <span className={underlineClass(isOrders)} />
            </button>

            <button onClick={() => navigate("/waiter/bills")} className={tabBtnClass(isBills)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Bills
              <span className={underlineClass(isBills)} />
            </button>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
