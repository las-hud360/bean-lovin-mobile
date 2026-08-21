import { Link, useRouterState } from "@tanstack/react-router";
import { Coffee, ShoppingBag, Receipt, User } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCartStore, cartCount } from "@/features/cart/cartStore";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Coffee },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function CartBadge({ count }: { count: number }) {
  const [pulse, setPulse] = useState(false);
  const previous = useRef(count);

  useEffect(() => {
    if (count > previous.current) {
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), 450);
      return () => window.clearTimeout(timer);
    }
    previous.current = count;
    return undefined;
  }, [count]);

  useEffect(() => {
    previous.current = count;
  }, [count]);

  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-secondary px-1.5 text-[11px] font-bold leading-5 text-secondary-foreground",
        pulse && "animate-pop",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const lines = useCartStore((s) => s.lines);
  const count = cartCount(lines);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh justify-center bg-[oklch(0.93_0.02_78)] py-0 sm:py-8">
      <div className="relative flex w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-lift sm:rounded-[2.5rem] sm:border sm:border-border">
        <main className="flex-1 overflow-y-auto pb-28">{children}</main>

        <nav
          aria-label="Main navigation"
          className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="grid grid-cols-4">
            {TABS.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="relative">
                      <Icon
                        className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                        strokeWidth={active ? 2.4 : 1.9}
                        aria-hidden="true"
                      />
                      {to === "/cart" && <CartBadge count={count} />}
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
