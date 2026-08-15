import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in web/.env');
}

// Public, browser-safe client — only ever use the anon key here, never the
// service role key (that stays server-side in the backend).
export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');
