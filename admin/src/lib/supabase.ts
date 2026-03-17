import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/** Regular client — uses anon key, respects RLS. Used for auth. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client — uses service role key, bypasses RLS.
 * Only use this for admin-specific operations (CRUD on events, users, etc.)
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
