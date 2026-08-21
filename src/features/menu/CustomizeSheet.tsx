import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useCartStore } from "@/features/cart/cartStore";
import { imageForItem } from "@/features/menu/menuImages";
import type { MenuItem } from "@/features/menu/useMenu";
import {
  MAX_SHOTS,
  MILKS,
  SIZES,
  SYRUPS,
  defaultCustomization,
  formatPrice,
  unitPrice,
  type Customization,
  type MilkId,
  type SizeId,
  type SyrupId,
} from "@/lib/menu-options";
import { cn } from "@/lib/utils";

function Chip({
  selected,
  children,
  onClick,
  label,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

export function CustomizeSheet({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const addLine = useCartStore((s) => s.addLine);
  const [custom, setCustom] = useState<Customization>(defaultCustomization);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const each = useMemo(
    () => unitPrice(item.base_price, custom, item.customizable),
    [item, custom],
  );

  const toggleSyrup = (id: SyrupId) =>
    setCustom((c) => ({
      ...c,
      syrups: c.syrups.includes(id) ? c.syrups.filter((s) => s !== id) : [...c.syrups, id],
    }));

  const handleAdd = () => {
    addLine({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.base_price,
      customizable: item.customizable,
      category: item.category,
      customization: custom,
      quantity,
    });
    toast.success(`${quantity} × ${item.name} added to your cart`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close customization"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Customize ${item.name}`}
        className="animate-sheet-up relative flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-background shadow-lift"
      >
        <div className="relative shrink-0 bg-cream px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-card p-2 text-muted-foreground shadow-soft transition hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-4">
            <img
              src={imageForItem(item)}
              alt=""
              width={640}
              height={640}
              loading="lazy"
              className="h-20 w-20 rounded-2xl object-cover"
            />
            <div className="pr-10">
              <h2 className="text-xl font-bold leading-tight">{item.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {item.customizable ? (
            <>
              <section>
                <h3 className="mb-3 text-sm font-semibold">Temperature</h3>
                <div className="flex gap-2">
                  {(["hot", "iced"] as const).map((t) => (
                    <Chip
                      key={t}
                      selected={custom.temperature === t}
                      onClick={() => setCustom((c) => ({ ...c, temperature: t }))}
                      label={t === "hot" ? "Serve hot" : "Serve iced"}
                    >
                      {t === "hot" ? "Hot" : "Iced"}
                    </Chip>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <Chip
                      key={s.id}
                      selected={custom.size === s.id}
                      onClick={() => setCustom((c) => ({ ...c, size: s.id as SizeId }))}
                      label={`${s.label}${s.priceDelta ? `, plus ${formatPrice(s.priceDelta)}` : ""}`}
                    >
                      {s.label}
                      {s.priceDelta > 0 && (
                        <span className="ml-1 opacity-70">+{formatPrice(s.priceDelta)}</span>
                      )}
                    </Chip>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold">Milk</h3>
                <div className="flex flex-wrap gap-2">
                  {MILKS.map((m) => (
                    <Chip
                      key={m.id}
                      selected={custom.milk === m.id}
                      onClick={() => setCustom((c) => ({ ...c, milk: m.id as MilkId }))}
                      label={`${m.label}${m.priceDelta ? `, plus ${formatPrice(m.priceDelta)}` : ""}`}
                    >
                      {m.label}
                      {m.priceDelta > 0 && (
                        <span className="ml-1 opacity-70">+{formatPrice(m.priceDelta)}</span>
                      )}
                    </Chip>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold">Syrups</h3>
                <div className="flex flex-wrap gap-2">
                  {SYRUPS.map((s) => {
                    const selected = custom.syrups.includes(s.id);
                    return (
                      <Chip
                        key={s.id}
                        selected={selected}
                        onClick={() => toggleSyrup(s.id)}
                        label={`${s.label} syrup, plus ${formatPrice(s.priceDelta)}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          {s.label}
                          <span className="opacity-70">+{formatPrice(s.priceDelta)}</span>
                        </span>
                      </Chip>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold">Espresso shots</h3>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {custom.extraShots === 0
                      ? "Standard"
                      : `+${custom.extraShots} extra shot${custom.extraShots > 1 ? "s" : ""}`}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Remove an espresso shot"
                      disabled={custom.extraShots === 0}
                      onClick={() =>
                        setCustom((c) => ({ ...c, extraShots: Math.max(0, c.extraShots - 1) }))
                      }
                      className="rounded-full border border-border p-1.5 transition active:scale-90 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-4 text-center text-sm font-semibold">
                      {custom.extraShots}
                    </span>
                    <button
                      type="button"
                      aria-label="Add an espresso shot"
                      disabled={custom.extraShots >= MAX_SHOTS}
                      onClick={() =>
                        setCustom((c) => ({
                          ...c,
                          extraShots: Math.min(MAX_SHOTS, c.extraShots + 1),
                        }))
                      }
                      className="rounded-full border border-border p-1.5 transition active:scale-90 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              This item is served as-is — no customization needed.
            </p>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="rounded-full border border-border p-2 transition active:scale-90"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-6 text-center text-lg font-bold">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="rounded-full border border-border p-2 transition active:scale-90"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <PrimaryButton fullWidth onClick={handleAdd}>
            Add to cart · {formatPrice(each * quantity)}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
