/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read client environment variables with fallback to user's provided Supabase project
const env = (import.meta as any).env || {};
const rawUrl = (env.VITE_SUPABASE_URL || 'https://ggovuvxzurmjiralkjlg.supabase.co/rest/v1/') as string;
const rawAnonKey = (env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnb3Z1dnh6dXJtamlyYWxramxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzU0MjAsImV4cCI6MjEwNDExMTQyMH0.KR8OWxZHnTJ7CF62MHjFrFM5h2ziw4qPyp5jFekgFlk') as string;

// Sanitize URL by removing trailing /rest/v1/ or slashes
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
export const supabaseAnonKey = rawAnonKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
