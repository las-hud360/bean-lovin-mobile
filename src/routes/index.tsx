import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Star, Sparkles } from "lucide-react";
import { menuQueryOptions, type MenuItem } from "@/features/menu/useMenu";
import { imageForItem } from "@/features/menu/menuImages";
import { CustomizeSheet } from "@/features/menu/CustomizeSheet";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/features/loyalty/useProfile";
import { CATEGORIES, STAMPS_PER_REWARD, formatPrice } from "@/lib/menu-options";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brew & Bean — Order Ahead Coffee" },
      {
        name: "description",
        content:
          "Browse the Brew & Bean menu, customize milk, syrups and shots, and skip the line with order-ahead pickup.",
      },
      { property: "og:title", content: "Brew & Bean — Order Ahead Coffee" },
      {
        property: "og:description",
        content: "Browse the menu, customize your drink and collect a free coffee every fifth cup.",
      },
    ],
  }),
  component: HomeScreen,
});

function LoyaltyStrip() {
  const { user } = useSession();
  const { data: profile } = useProfile();

  if (!user) {
    return (
      <Link
        to="/auth"
        className="mx-5 flex items-center gap-3 rounded-3xl bg-primary px-4 py-3.5 text-primary-foreground shadow-soft transition active:scale-[0.99]"
      >
        <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">
          Sign in to collect stamps — every 5th drink is on us.
        </span>
      </Link>
    );
  }

  const stamps = profile?.loyalty_stamps ?? 0;
  const rewards = profile?.free_drinks_available ?? 0;

  return (
    <Link
      to="/profile"
      aria-label={`Loyalty card: ${stamps} of ${STAMPS_PER_REWARD} stamps`}
      className="mx-5 flex items-center justify-between gap-3 rounded-3xl bg-primary px-4 py-3.5 text-primary-foreground shadow-soft transition active:scale-[0.99]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
          {rewards > 0 ? `${rewards} free drink ready` : "Loyalty card"}
        </p>
        <p className="mt-0.5 text-sm">
          {STAMPS_PER_REWARD - stamps} more {STAMPS_PER_REWARD - stamps === 1 ? "drink" : "drinks"} to a
          free coffee
        </p>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: STAMPS_PER_REWARD }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-3 rounded-full border border-primary-foreground/50",
              i < stamps && "bg-secondary border-secondary",
            )}
          />
        ))}
      </div>
    </Link>
  );
}

function MenuCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={`${item.name}, ${formatPrice(item.base_price)}. Customize and add to cart`}
      className="animate-rise group flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-left shadow-soft transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-cream">
        <img
          src={imageForItem(item)}
          alt={item.name}
          width={640}
          height={640}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.is_popular && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Popular
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <h3 className="text-sm font-semibold leading-tight">{item.name}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        <p className="mt-auto pt-2 text-sm font-bold text-primary">
          {formatPrice(item.base_price)}
        </p>
      </div>
    </button>
  );
}

function HomeScreen() {
  const { data: items, isLoading, isError, refetch } = useQuery(menuQueryOptions);
  const { user } = useSession();
  const { data: profile } = useProfile();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      const matchesCategory = !category || item.category === category;
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [items, search, category]);

  const firstName = (profile?.display_name ?? user?.email?.split("@")[0] ?? "").split(" ")[0];

  return (
    <div>
      <header className="px-5 pb-4 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Brew &amp; Bean
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">
          {firstName ? `Morning, ${firstName}.` : "Good morning."}
          <br />
          <span className="text-primary">What are we brewing?</span>
        </h1>
      </header>

      <LoyaltyStrip />

      <div className="px-5 pt-5">
        <label htmlFor="menu-search" className="sr-only">
          Search the menu
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="menu-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lattes, cold brew, pastries…"
            className="w-full rounded-full border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
          />
        </div>
      </div>

      <div
        className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        {[null, ...CATEGORIES].map((c) => {
          const active = category === c;
          return (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={active}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {c ?? "All"}
            </button>
          );
        })}
      </div>

      <section className="px-5 pb-8 pt-5" aria-label="Menu">
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">We couldn't load the menu.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing matches “{search}”. Try another search.
          </p>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} onSelect={setSelected} />
            ))}
          </div>
        )}
      </section>

      {selected && <CustomizeSheet item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
