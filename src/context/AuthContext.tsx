import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { clearImageCache } from '../shared/images';

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

function profile(session: Session | null): UserProfile | null {
  if (!session) return null;
  const account = session.user;
  return {
    name: String(account.user_metadata?.name || account.email || 'Operador'),
    role: String(account.app_metadata?.role || ''),
    avatar: '',
    email: account.email || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('fulgor_demo_') || key.startsWith('fulgor_cart_v2_') || key.startsWith('fulgor_cart_v3_'))
        localStorage.removeItem(key);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.warn('No se pudo restaurar la sesión:', error);
      setUser(profile(data.session));
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        queryClient.clear();
        clearImageCache();
      }
      if (event === 'SIGNED_OUT') {
        for (const key of Object.keys(localStorage)) if (key.startsWith('fulgor_')) localStorage.removeItem(key);
      }
      if (mounted) setUser(profile(session));
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [queryClient]);
  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Falta configurar Supabase.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClient.clear();
    clearImageCache();
    for (const key of Object.keys(localStorage)) if (key.startsWith('fulgor_')) localStorage.removeItem(key);
  };
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no encontrado');
  return value;
}
