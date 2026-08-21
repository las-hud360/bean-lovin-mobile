import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  STAMPS_PER_REWARD,
  TAX_RATE,
  round,
  unitPrice,
  type Customization,
} from "@/lib/menu-options";

const customizationSchema = z.object({
  size: z.enum(["small", "medium", "large"]),
  milk: z.enum(["whole", "oat", "almond", "soy", "skim", "none"]),
  syrups: z.array(z.enum(["vanilla", "caramel", "hazelnut", "mocha", "lavender"])).max(5),
  extraShots: z.number().int().min(0).max(4),
  temperature: z.enum(["hot", "iced"]),
  notes: z.string().max(200).optional(),
});

const checkoutSchema = z.object({
  redeemFreeDrink: z.boolean(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
        customization: customizationSchema,
      }),
    )
    .min(1)
    .max(30),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const ids = [...new Set(data.items.map((i) => i.menuItemId))];
    const { data: menuRows, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, base_price, customizable")
      .in("id", ids);
    if (menuError) throw new Error("Could not load the menu right now.");
    if (!menuRows || menuRows.length !== ids.length) {
      throw new Error("One of the items in your cart is no longer available.");
    }

    const menu = new Map(menuRows.map((m) => [m.id, m]));

    const priced = data.items.map((item) => {
      const menuItem = menu.get(item.menuItemId)!;
      const price = unitPrice(
        Number(menuItem.base_price),
        item.customization as Customization,
        menuItem.customizable,
      );
      return {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        unit_price: price,
        quantity: item.quantity,
        customizable: menuItem.customizable,
        customization: menuItem.customizable ? item.customization : {},
      };
    });

    const subtotal = round(priced.reduce((sum, p) => sum + p.unit_price * p.quantity, 0));

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("loyalty_stamps, free_drinks_available")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error("Could not load your loyalty card.");

    const available = profile?.free_drinks_available ?? 0;
    const drinkPrices = priced.filter((p) => p.customizable).map((p) => p.unit_price).sort((a, b) => a - b);
    const useFree = data.redeemFreeDrink && available > 0 && drinkPrices.length > 0;
    const discount = useFree ? round(drinkPrices[0]!) : 0;
    const taxable = Math.max(round(subtotal - discount), 0);
    const tax = round(taxable * TAX_RATE);
    const total = round(taxable + tax);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "received",
        subtotal,
        discount,
        tax,
        total,
        used_free_drink: useFree,
      })
      .select("id, pickup_code")
      .single();
    if (orderError || !order) throw new Error("We couldn't place your order. Please try again.");

    const { error: itemsError } = await supabase.from("order_items").insert(
      priced.map((p) => ({
        order_id: order.id,
        menu_item_id: p.menu_item_id,
        name: p.name,
        unit_price: p.unit_price,
        quantity: p.quantity,
        customization: p.customization,
      })),
    );
    if (itemsError) throw new Error("We couldn't save your order items. Please try again.");

    const drinkCount = priced
      .filter((p) => p.customizable)
      .reduce((n, p) => n + p.quantity, 0);
    const currentStamps = profile?.loyalty_stamps ?? 0;
    const totalStamps = currentStamps + drinkCount;
    const earnedRewards = Math.floor(totalStamps / STAMPS_PER_REWARD);
    const nextStamps = totalStamps % STAMPS_PER_REWARD;
    const nextFreeDrinks = Math.max(available - (useFree ? 1 : 0), 0) + earnedRewards;

    await supabase
      .from("profiles")
      .update({ loyalty_stamps: nextStamps, free_drinks_available: nextFreeDrinks })
      .eq("id", userId);

    return {
      orderId: order.id as string,
      pickupCode: order.pickup_code as string,
      total,
      earnedRewards,
      stamps: nextStamps,
    };
  });

/** Advances an order through its preparation stages (used by the live pickup board). */
export const advanceOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const flow = ["received", "preparing", "ready", "completed"] as const;

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found.");

    const index = flow.indexOf(order.status as (typeof flow)[number]);
    const next = flow[Math.min(index + 1, flow.length - 1)]!;
    if (next === order.status) return { status: order.status as string };

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", order.id);
    if (updateError) throw new Error("Could not update the order status.");

    return { status: next as string };
  });
