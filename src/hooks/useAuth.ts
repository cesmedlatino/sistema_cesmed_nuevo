
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Starting signOut process...');
      
      // Clear local state immediately
      setSession(null);
      setUser(null);
      setLoading(false);
      
      // Clear local storage manually
      localStorage.removeItem('sb-yxjjodjpumynmklmhuox-auth-token');
      sessionStorage.clear();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Clear all sessions globally
      });
      
      if (error) {
        console.warn('Supabase signOut error (proceeding anyway):', error);
      }
      
      console.log('SignOut completed, redirecting...');
      
      // Force complete page reload to ensure all state is cleared
      window.location.replace('/');
      
    } catch (error) {
      console.error('Critical error during signOut:', error);
      // Even on error, ensure complete cleanup
      setSession(null);
      setUser(null);
      setLoading(false);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}
