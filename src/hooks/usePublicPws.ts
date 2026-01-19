import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

type SessionClosedPayload = { sessionId: string; status: string; closedAt: string };

export function usePublicPws(args: {
  wsBaseUrl: string;
  tableId: string;
  token: string;
  onSessionClosed?: (p: SessionClosedPayload) => void;
  onAnyEvent?: (event: string, payload: any) => void;
}) {
  const { wsBaseUrl, tableId, token, onSessionClosed, onAnyEvent } = args;
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!wsBaseUrl || !tableId || !token) return;

    const s = io(`${wsBaseUrl}/pws`, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { table: tableId, token },
    });

    sockRef.current = s;

    // optional debug
    s.onAny((event, payload) => onAnyEvent?.(event, payload));

    s.on("session.closed", (p: SessionClosedPayload) => {
      onSessionClosed?.(p);
    });

    return () => {
      s.disconnect();
      sockRef.current = null;
    };
  }, [wsBaseUrl, tableId, token, onSessionClosed, onAnyEvent]);
}
