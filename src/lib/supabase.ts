import type { SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
// El inventario solo se obtiene del proyecto Supabase configurado.
export const isDemo = false;
export const isSupabaseConfigured = !isDemo && /^https:\/\//.test(url) && publishableKey.length > 20;
export let supabase: SupabaseClient | null = null;

export async function initializeSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(url, publishableKey);
}

export function requireSupabase() {
  if (!supabase) throw new Error('Configure VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}
