import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.");
}

const customAuthStorage = {
  getItem: (key: string) => {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (sessionStorage.getItem('dustzero_no_persist') === 'true') {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(
  supabaseUrl || 'https://oxgjosjqzlulnfcmqbty.supabase.co',
  supabaseAnonKey || 'sb_publishable_rJ0CsOL6TB5rHWncEW8ThA_mX6gacNI',
  {
    auth: {
      storage: customAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
