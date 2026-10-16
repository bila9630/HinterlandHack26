import { createClient } from "@supabase/supabase-js";

// The publishable key is safe to ship to the browser; access is governed by RLS.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://riqcdovpjqfzcdxcjpcg.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_EJvsJ1eGBQG_jxW6JvPh6w_ZjGU-ceH";

export const supabase = createClient(supabaseUrl, supabaseKey);
