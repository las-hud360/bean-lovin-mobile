CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Coffee Lover',
  avatar_url text,
  loyalty_stamps integer NOT NULL DEFAULT 0,
  free_drinks_available integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  base_price numeric(10,2) NOT NULL,
  image_url text,
  is_popular boolean NOT NULL DEFAULT false,
  customizable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_items_public_read" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_item_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_all_own" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'received',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  used_free_drink boolean NOT NULL DEFAULT false,
  pickup_code text NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 4)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order_items_insert_own" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Coffee Lover'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

INSERT INTO public.menu_items (name, description, category, base_price, is_popular, customizable, sort_order) VALUES
('Espresso', 'A bold, concentrated shot pulled from our house blend.', 'Espresso', 2.75, false, true, 1),
('Doppio', 'Двойной — two full shots for a serious lift.', 'Espresso', 3.25, false, true, 2),
('Cortado', 'Equal parts espresso and lightly steamed milk.', 'Espresso', 3.95, true, true, 3),
('Flat White', 'Velvety microfoam over a double ristretto.', 'Espresso', 4.75, true, true, 4),
('Cappuccino', 'Espresso crowned with a deep cap of airy foam.', 'Espresso', 4.50, true, true, 5),
('Caffe Latte', 'Smooth espresso with steamed milk and a thin foam layer.', 'Espresso', 4.95, true, true, 6),
('Mocha', 'Dark chocolate, espresso and steamed milk.', 'Espresso', 5.25, false, true, 7),
('House Drip', 'Slow-batch brew rotated daily from single-origin beans.', 'Brewed', 2.95, false, true, 8),
('Pour Over', 'Hand-poured V60, bright and clean.', 'Brewed', 4.25, false, true, 9),
('French Press', 'Full-bodied immersion brew for two.', 'Brewed', 4.50, false, true, 10),
('Iced Latte', 'Chilled espresso and cold milk over ice.', 'Cold', 4.95, true, true, 11),
('Cold Brew', 'Steeped 18 hours for a mellow, chocolatey finish.', 'Cold', 4.75, true, true, 12),
('Nitro Cold Brew', 'Nitrogen-infused, cascading and creamy.', 'Cold', 5.50, false, true, 13),
('Iced Caramel Macchiato', 'Vanilla milk, espresso and a caramel drizzle.', 'Cold', 5.75, true, true, 14),
('Masala Chai Latte', 'Spiced black tea simmered with steamed milk.', 'Tea', 4.50, false, true, 15),
('Matcha Latte', 'Ceremonial-grade matcha whisked with milk.', 'Tea', 5.00, true, true, 16),
('Butter Croissant', 'Laminated overnight, baked each morning.', 'Pastries', 3.75, true, false, 17),
('Cinnamon Roll', 'Warm swirl with cream cheese glaze.', 'Pastries', 4.25, false, false, 18),
('Almond Biscotti', 'Twice-baked, made for dunking.', 'Pastries', 2.50, false, false, 19),
('Avocado Toast', 'Sourdough, smashed avocado, chili and lime.', 'Food', 8.50, false, false, 20),
('Breakfast Sandwich', 'Egg, aged cheddar and greens on a brioche bun.', 'Food', 7.95, true, false, 21),
('Greek Yogurt Bowl', 'Honey, toasted granola and seasonal fruit.', 'Food', 6.50, false, false, 22);