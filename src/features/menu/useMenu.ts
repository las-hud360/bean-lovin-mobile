import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  image_url: string | null;
  is_popular: boolean;
  customizable: boolean;
  sort_order: number;
}

export const menuQueryOptions = queryOptions({
  queryKey: ["menu-items"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<MenuItem[]> => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, description, category, base_price, image_url, is_popular, customizable, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ ...row, base_price: Number(row.base_price) }));
  },
});
