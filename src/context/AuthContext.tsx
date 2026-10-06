import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { clearImageCache } from '../shared/images';
import { clearOutgoingImageCache } from '../shared/outgoingImages';
import { sessionIdentity, shouldClearSessionCache } from '../domain/session';
import { profileForAccount } from '../domain/userProfile';

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
function clearUserDrafts() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('fulgor_') && !key.startsWith('fulgor_pref_')) localStorage.removeItem(key);
  }
}

function profile(session: Session | null): UserProfile | null {
  if (!session) return null;
  return profileForAccount(session.user);
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
    let authEventReceived = false;
    let identity: string | null | undefined;
    const applySession = (session: Session | null) => {
      if (!mounted) return;
      const nextIdentity = sessionIdentity(session);
      if (shouldClearSessionCache(identity, nextIdentity)) {
        queryClient.clear();
        clearImageCache();
        clearOutgoingImageCache();
      }
      identity = nextIdentity;
      setUser(profile(session));
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || authEventReceived) return;
      if (error) console.warn('No se pudo restaurar la sesión:', error);
      applySession(data.session);
    }).catch(error => {
      if (!mounted || authEventReceived) return;
      console.warn('No se pudo restaurar la sesión:', error);
      applySession(null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authEventReceived = true;
      if (event === 'SIGNED_OUT') clearUserDrafts();
      applySession(session);
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
    clearOutgoingImageCache();
    clearUserDrafts();
  };
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no encontrado');
  return value;
}
