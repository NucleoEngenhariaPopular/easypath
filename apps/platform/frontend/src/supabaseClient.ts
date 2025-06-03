import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Public Key (anon)
// It's highly recommended to use environment variables for these
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or ANON key is missing from environment variables.');
  // Handle this error appropriately, e.g., throw an error or display a message
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
