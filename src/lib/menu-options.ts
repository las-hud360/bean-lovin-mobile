export type SizeId = "small" | "medium" | "large";
export type MilkId = "whole" | "oat" | "almond" | "soy" | "skim" | "none";
export type SyrupId = "vanilla" | "caramel" | "hazelnut" | "mocha" | "lavender";
export type TempId = "hot" | "iced";

export interface Option<T extends string> {
  id: T;
  label: string;
  priceDelta: number;
}

export const SIZES: Option<SizeId>[] = [
  { id: "small", label: "Small", priceDelta: 0 },
  { id: "medium", label: "Medium", priceDelta: 0.6 },
  { id: "large", label: "Large", priceDelta: 1.1 },
];

export const MILKS: Option<MilkId>[] = [
  { id: "whole", label: "Whole milk", priceDelta: 0 },
  { id: "skim", label: "Skim milk", priceDelta: 0 },
  { id: "oat", label: "Oat milk", priceDelta: 0.75 },
  { id: "almond", label: "Almond milk", priceDelta: 0.75 },
  { id: "soy", label: "Soy milk", priceDelta: 0.65 },
  { id: "none", label: "No milk", priceDelta: 0 },
];

export const SYRUPS: Option<SyrupId>[] = [
  { id: "vanilla", label: "Vanilla", priceDelta: 0.6 },
  { id: "caramel", label: "Caramel", priceDelta: 0.6 },
  { id: "hazelnut", label: "Hazelnut", priceDelta: 0.6 },
  { id: "mocha", label: "Mocha", priceDelta: 0.7 },
  { id: "lavender", label: "Lavender", priceDelta: 0.7 },
];

export const SHOT_PRICE = 0.9;
export const MAX_SHOTS = 4;
export const TAX_RATE = 0.0875;
export const STAMPS_PER_REWARD = 5;

export interface Customization {
  size: SizeId;
  milk: MilkId;
  syrups: SyrupId[];
  extraShots: number;
  temperature: TempId;
  notes?: string;
}

export const defaultCustomization = (): Customization => ({
  size: "medium",
  milk: "whole",
  syrups: [],
  extraShots: 0,
  temperature: "hot",
});

const delta = <T extends string>(list: Option<T>[], id: T) =>
  list.find((o) => o.id === id)?.priceDelta ?? 0;

/** Single-unit price for a menu item with the chosen options. */
export function unitPrice(basePrice: number, c: Customization, customizable = true): number {
  if (!customizable) return round(basePrice);
  const syrupTotal = c.syrups.reduce((sum, s) => sum + delta(SYRUPS, s), 0);
  return round(
    basePrice +
      delta(SIZES, c.size) +
      delta(MILKS, c.milk) +
      syrupTotal +
      c.extraShots * SHOT_PRICE,
  );
}

export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function describeCustomization(c: Customization, customizable = true): string {
  if (!customizable) return "";
  const parts: string[] = [
    SIZES.find((s) => s.id === c.size)?.label ?? "",
    c.temperature === "iced" ? "Iced" : "Hot",
  ];
  const milk = MILKS.find((m) => m.id === c.milk);
  if (milk && milk.id !== "whole") parts.push(milk.label);
  if (c.extraShots > 0) parts.push(`+${c.extraShots} shot${c.extraShots > 1 ? "s" : ""}`);
  for (const s of c.syrups) {
    const syrup = SYRUPS.find((o) => o.id === s);
    if (syrup) parts.push(syrup.label);
  }
  return parts.filter(Boolean).join(" · ");
}

export const CATEGORIES = ["Espresso", "Brewed", "Cold", "Tea", "Pastries", "Food"] as const;
export type Category = (typeof CATEGORIES)[number];
