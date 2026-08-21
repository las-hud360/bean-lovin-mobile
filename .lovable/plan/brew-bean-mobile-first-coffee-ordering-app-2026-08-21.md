# Brew & Bean — Mobile-First Coffee Ordering App

A phone-shaped, mobile-first web app with the full ordering flow: browse, customize, cart, checkout, live order tracking, loyalty stamps, and profile.

## Stack note

The original brief specified React Native + Expo + Firebase. This platform builds web apps, so the equivalent stack is:

- React + TanStack Start + TypeScript (instead of Expo)
- Lovable Cloud — auth, Postgres, realtime (instead of Firebase Auth/Firestore)
- Tailwind CSS (instead of NativeWind)
- Zustand for cart/UI state (unchanged)
- Custom components only, no external UI kit

## Design

- Coffee brown `#6F4E37` primary, amber `#FFB347` secondary, off-white `#F9F6F0` background, espresso text
- Inter typography, generous rounding, soft shadows, warm illustrated drink imagery
- Layout locked to a mobile column (max ~430px) centered on larger screens, with a fixed bottom tab bar: Home, Cart, Orders, Profile
- Spring-style animations: add-to-cart fly/bounce, cart badge pop, sheet slide-up for customization, stamp fill animation

## Screens

1. **Auth** (`/auth`) — email/password sign in + sign up, Google sign-in, error states
2. **Home** (`/`) — greeting, loyalty strip, search field, category chips (Espresso, Brewed, Cold, Tea, Food, Pastries), drink grid
3. **Drink detail / customization** — size, milk type, syrup flavors, extra espresso shots, quantity; price recalculates live
4. **Cart** (`/cart`) — line items with edits, subtotal, tax, total, free-drink redemption when a reward is available, checkout button
5. **Orders** (`/orders`) — active order card with live status timeline (Received → Preparing → Ready for Pickup → Completed) plus past orders
6. **Profile** (`/profile`) — name/avatar, loyalty stamp card (5 stamps = free drink), favorites, order history, sign out

## Backend (Lovable Cloud)

Tables with RLS and grants:

- `profiles` — id, display name, avatar, loyalty_stamps, free_drinks_available (auto-created on signup via trigger)
- `menu_items` — name, description, category, base_price, image_url, seeded with ~18 items via migration
- `favorites` — user_id + menu_item_id
- `orders` — user_id, status, subtotal, tax, total, used_free_drink, timestamps
- `order_items` — order_id, item name/price snapshot, quantity, customization JSON

Rules:
- Menu is publicly readable; everything else is scoped to `auth.uid()`
- Order placement runs in a server function: recalculates prices server-side, applies tax, awards a stamp, and consumes a free drink when redeemed
- Order status changes stream to the Orders screen via realtime subscription
- Google sign-in configured through Lovable Cloud social auth

## Technical notes

- Feature-based folders: `src/features/{auth,menu,cart,orders,loyalty,profile}` with shared UI in `src/components`
- Zustand store for cart with localStorage persistence; server is the source of truth for orders and loyalty
- Protected screens live under `_authenticated`; `/auth` stays public
- Accessibility labels on all interactive controls, loading/empty/error states everywhere
- Per-route head metadata for title/description/OG tags

## Build order

1. Enable Lovable Cloud, migrations + menu seed, design tokens
2. Auth screen and session wiring
3. Shell: bottom tabs, home screen, menu browsing, search, filters
4. Customization sheet and cart
5. Checkout, orders, realtime tracking
6. Loyalty card and profile
