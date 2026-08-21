import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type Customization,
  TAX_RATE,
  round,
  unitPrice,
} from "@/lib/menu-options";

export interface CartLine {
  lineId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  customizable: boolean;
  category: string;
  customization: Customization;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  redeemFreeDrink: boolean;
  addLine: (line: Omit<CartLine, "lineId">) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  setRedeemFreeDrink: (value: boolean) => void;
}

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const sameLine = (a: CartLine, b: Omit<CartLine, "lineId">) =>
  a.menuItemId === b.menuItemId &&
  JSON.stringify(a.customization) === JSON.stringify(b.customization);

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      redeemFreeDrink: false,
      addLine: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => sameLine(l, line));
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.lineId === existing.lineId
                  ? { ...l, quantity: Math.min(l.quantity + line.quantity, 20) }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, lineId: makeId() }] };
        }),
      setQuantity: (lineId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.lineId !== lineId)
              : state.lines.map((l) =>
                  l.lineId === lineId ? { ...l, quantity: Math.min(quantity, 20) } : l,
                ),
        })),
      removeLine: (lineId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.lineId !== lineId) })),
      clear: () => set({ lines: [], redeemFreeDrink: false }),
      setRedeemFreeDrink: (value) => set({ redeemFreeDrink: value }),
    }),
    { name: "brew-bean-cart" },
  ),
);

export const linePrice = (line: CartLine) =>
  round(unitPrice(line.basePrice, line.customization, line.customizable) * line.quantity);

export function cartTotals(lines: CartLine[], redeemFreeDrink: boolean) {
  const subtotal = round(lines.reduce((sum, l) => sum + linePrice(l), 0));
  const drinkPrices = lines
    .filter((l) => l.customizable)
    .map((l) => unitPrice(l.basePrice, l.customization, true))
    .sort((a, b) => a - b);
  const discount = redeemFreeDrink && drinkPrices.length > 0 ? round(drinkPrices[0]!) : 0;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = round(taxable * TAX_RATE);
  return { subtotal, discount, tax, total: round(taxable + tax) };
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
