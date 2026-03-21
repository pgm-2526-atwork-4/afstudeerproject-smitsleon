import { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { resolveCurrentCity } from '../lib/location';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref so the onAuthStateChange closure always reads the latest value
  const signingInRef = useRef(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Skip if signIn is still checking blocked status
        if (signingInRef.current) return;
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const p = data as UserProfile | null;
    if (p?.blocked_at) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(p);
    setLoading(false);
  }

  // Register push token when a valid profile is loaded
  useEffect(() => {
    if (!profile?.id) return;
    registerForPushNotificationsAsync(profile.id);
  }, [profile?.id]);

  // Auto-update location on app start when user has location enabled
  useEffect(() => {
    if (!profile || !profile.share_location || !profile.latitude) return;

    (async () => {
      try {
        const result = await resolveCurrentCity(false);
        if (!result) return;

        // Only update if user moved >~1 km
        if (
          result.city === profile.city &&
          Math.abs((profile.latitude ?? 0) - result.latitude) < 0.01 &&
          Math.abs((profile.longitude ?? 0) - result.longitude) < 0.01
        ) return;

        await supabase.from('users').update({
          city: result.city,
          latitude: result.latitude,
          longitude: result.longitude,
        }).eq('id', profile.id);

        setProfile((prev) => prev ? { ...prev, ...result } : null);
      } catch {
        // Silently ignore — location update is best-effort
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.share_location]);

  async function signIn(email: string, password: string) {
    signingInRef.current = true;
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      signingInRef.current = false;
      return { error: error.message };
    }

    // Check if this account is blocked before the session propagates
    const { data: userData } = await supabase
      .from('users')
      .select('blocked_at')
      .eq('id', data.user.id)
      .single();

    if (userData?.blocked_at) {
      await supabase.auth.signOut();
      signingInRef.current = false;
      return { error: 'Je account is geblokkeerd. Je kunt dit account niet meer gebruiken' };
    }

    // Not blocked — let the session through
    signingInRef.current = false;
    setSession(data.session);
    await fetchProfile(data.user.id);
    return { error: null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
