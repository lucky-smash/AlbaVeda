import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { findVariant, type Product, type Variant } from "../data/catalog";

/**
 * Client-side cart persisted to localStorage. There is no commerce backend in
 * this project: checkout hands the order to the AlbaVeda team by email/phone
 * (see pages/Checkout.tsx). Lines are keyed by the source variant slug.
 */

export interface CartLine {
  variantId: string;
  qty: number;
}

export interface ResolvedLine extends CartLine {
  product: Product;
  variant: Variant;
  lineTotal: number;
}

type Action =
  | { type: "add"; variantId: string; qty: number }
  | { type: "set"; variantId: string; qty: number }
  | { type: "remove"; variantId: string }
  | { type: "clear" };

const STORAGE_KEY = "albaveda.cart.v1";
export const MAX_QTY = 20;

function reducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const existing = lines.find((l) => l.variantId === action.variantId);
      if (existing) {
        return lines.map((l) =>
          l.variantId === action.variantId ? { ...l, qty: Math.min(MAX_QTY, l.qty + action.qty) } : l,
        );
      }
      return [...lines, { variantId: action.variantId, qty: Math.min(MAX_QTY, action.qty) }];
    }
    case "set":
      if (action.qty <= 0) return lines.filter((l) => l.variantId !== action.variantId);
      return lines.map((l) => (l.variantId === action.variantId ? { ...l, qty: Math.min(MAX_QTY, action.qty) } : l));
    case "remove":
      return lines.filter((l) => l.variantId !== action.variantId);
    case "clear":
      return [];
  }
}

function load(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // Drop lines whose variant no longer exists in the catalogue.
    return parsed.filter(
      (l): l is CartLine => typeof l?.variantId === "string" && Number.isFinite(l?.qty) && l.qty > 0 && !!findVariant(l.variantId),
    );
  } catch {
    return [];
  }
}

interface CartContextValue {
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  savings: number;
  add: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Incremented on every add — lets the header badge play a small acknowledgement. */
  pulse: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [raw, dispatch] = useReducer(reducer, undefined, load);
  const [isOpen, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    } catch {
      /* storage full or disabled — cart still works for this session */
    }
  }, [raw]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      dispatch({ type: "clear" });
      for (const l of load()) dispatch({ type: "add", variantId: l.variantId, qty: l.qty });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((variantId: string, qty = 1) => {
    dispatch({ type: "add", variantId, qty });
    setPulse((p) => p + 1);
  }, []);
  const setQty = useCallback((variantId: string, qty: number) => dispatch({ type: "set", variantId, qty }), []);
  const remove = useCallback((variantId: string) => dispatch({ type: "remove", variantId }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const lines: ResolvedLine[] = [];
    for (const l of raw) {
      const found = findVariant(l.variantId);
      if (!found) continue;
      lines.push({ ...l, ...found, lineTotal: round(found.variant.price * l.qty) });
    }
    const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
    const savings = round(
      lines.reduce((s, l) => s + (l.variant.compareAt ? (l.variant.compareAt - l.variant.price) * l.qty : 0), 0),
    );
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      savings,
      add,
      setQty,
      remove,
      clear,
      isOpen,
      open,
      close,
      pulse,
    };
  }, [raw, add, setQty, remove, clear, isOpen, open, close, pulse]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
