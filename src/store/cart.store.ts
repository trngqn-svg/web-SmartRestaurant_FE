import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartMod = {
  groupId: string;
  groupName: string;
  optionIds: string[];
  optionNames: string[];
  priceAdjustmentCents: number;
};

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  photoUrl?: string;
  unitPriceCents: number;
  qty: number;
  note?: string;
  mods: CartMod[];
};

type CartState = {
  tableId: string | null;
  setTableId: (tableId: string) => void;

  lines: CartLine[];
  addLine: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;

  orderNote: string;
  setOrderNote: (s: string) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tableId: null,
      setTableId: (tableId) => set({ tableId }),

      lines: [],
      addLine: (line) => {
        const qty = line.qty ?? 1;
        const prev = get().lines;
        const idx = prev.findIndex((x) => x.key === line.key);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
          return set({ lines: copy });
        }
        set({ lines: [...prev, { ...line, qty }] as any });
      },
      inc: (key) => {
        const prev = get().lines;
        const idx = prev.findIndex((x) => x.key === key);
        if (idx < 0) return;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        set({ lines: copy });
      },
      dec: (key) => {
        const prev = get().lines;
        const idx = prev.findIndex((x) => x.key === key);
        if (idx < 0) return;
        const cur = prev[idx];
        if (cur.qty <= 1) return set({ lines: prev.filter((x) => x.key !== key) });
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty - 1 };
        set({ lines: copy });
      },
      remove: (key) => set({ lines: get().lines.filter((x) => x.key !== key) }),
      clear: () => set({ lines: [], orderNote: "" }),

      orderNote: "",
      setOrderNote: (s) => set({ orderNote: s }),
    }),
    {
      name: "sr_cart_v1",
      partialize: (s) => ({
        tableId: s.tableId,
        lines: s.lines,
        orderNote: s.orderNote,
      }),
    }
  )
);

export function cartCount(lines: CartLine[]) {
  return lines.reduce((s, x) => s + x.qty, 0);
}
export function cartSubtotalCents(lines: CartLine[]) {
  return lines.reduce((s, x) => s + x.qty * x.unitPriceCents, 0);
}
