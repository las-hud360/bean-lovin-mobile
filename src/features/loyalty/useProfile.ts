import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  loyalty_stamps: number;
  free_drinks_available: number;
}

export function useProfile() {
  const { user } = useSession();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, loyalty_stamps, free_drinks_available")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
