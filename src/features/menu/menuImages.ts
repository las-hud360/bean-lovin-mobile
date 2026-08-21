import espresso from "@/assets/cat-espresso.jpg";
import brewed from "@/assets/cat-brewed.jpg";
import cold from "@/assets/cat-cold.jpg";
import tea from "@/assets/cat-tea.jpg";
import pastries from "@/assets/cat-pastries.jpg";
import food from "@/assets/cat-food.jpg";

const byCategory: Record<string, string> = {
  Espresso: espresso,
  Brewed: brewed,
  Cold: cold,
  Tea: tea,
  Pastries: pastries,
  Food: food,
};

export function imageForItem(item: { image_url: string | null; category: string }): string {
  return item.image_url ?? byCategory[item.category] ?? espresso;
}
