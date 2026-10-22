import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Demo mode (localStorage, no backend) is used for local UI work and the Playwright tests.
export const isDemo = import.meta.env.VITE_DEMO === "true" || !supabaseUrl || !supabaseAnonKey;

export const supabase = isDemo ? null : createClient(supabaseUrl, supabaseAnonKey);
