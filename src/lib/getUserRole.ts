import { supabase } from './supabase';

export async function getUserRole(): Promise<"admin"|"user"> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "user";
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
    
  if (error || !data?.role) return "user";
  return data.role === "admin" ? "admin" : "user";
}