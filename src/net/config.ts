/**
 * Supabase project used for Online team play (Realtime only: no tables, no stored data).
 * The publishable key is designed to be public. Override both with VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example). Empty values make Online mode report
 * "Can't reach the team server"; Same computer mode never needs them.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "https://oifzgkvgpxxnoiyvbwvt.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_MLEtZhHtP986Gyl_yK0Upw_fAT2Ch0t";
