import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getUserRole } from "../lib/getUserRole";

type AuthState = {
  user: User | null;
  role: "admin" | "user";
  loading: boolean;
  refresh: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  role: "user",
  loading: true,
  refresh: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    const role = await getUserRole();
    set({ user, role, loading: false });
  },
}));