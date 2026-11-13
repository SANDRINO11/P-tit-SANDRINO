import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type UserRole = 'member' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'suspended';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginAsOwner: () => void;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'sandrino_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not yet configured, check local storage for owner or member session
    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem(LOCAL_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed.user || null);
          setProfile(parsed.profile || null);
        }
      } catch (e) {}
      setLoading(false);
      return;
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, currentUser?: User | null) => {
    const activeUser = currentUser || user;
    const userEmail = (activeUser?.email || '').toLowerCase();
    const isOwner = userEmail === 'petitsandrino1@gmail.com';

    // Safe fallback profile in case profiles table is not yet migrated in Supabase (PGRST205)
    const fallbackProfile: Profile = {
      id: userId,
      full_name: activeUser?.user_metadata?.full_name || (isOwner ? 'Pétit SANDRINO' : (activeUser?.email?.split('@')[0] || 'Membre')),
      email: activeUser?.email || '',
      phone: activeUser?.user_metadata?.phone || '',
      role: isOwner ? 'admin' : (activeUser?.user_metadata?.role || 'member'),
      status: 'active',
      created_at: activeUser?.created_at || new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.profiles" does not exist')) {
          console.warn("Table 'profiles' non encore créée dans Supabase (PGRST205). Utilisation du profil local sécurisé.");
          setProfile(fallbackProfile);
        } else if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
          // Table exists but no row for this user: automatically create profile row in Supabase
          try {
            const { data: inserted, error: insertErr } = await supabase
              .from('profiles')
              .upsert([fallbackProfile])
              .select()
              .single();

            if (!insertErr && inserted) {
              setProfile(inserted as Profile);
              return;
            }
          } catch (e) {}
          setProfile(fallbackProfile);
        } else {
          console.warn('Notice fetch profile:', error.message);
          setProfile(fallbackProfile);
        }
      } else if (data) {
        // Enforce owner as admin
        if (isOwner && data.role !== 'admin') {
          data.role = 'admin';
          // Update in Supabase as well
          supabase.from('profiles').update({ role: 'admin' }).eq('id', userId).then();
        }
        setProfile(data as Profile);
      } else {
        setProfile(fallbackProfile);
      }
    } catch (e) {
      setProfile(fallbackProfile);
    } finally {
      setLoading(false);
    }
  };

  const loginAsOwner = () => {
    const ownerUser = {
      id: 'owner-admin-id',
      email: 'petitsandrino1@gmail.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User;

    const ownerProfile: Profile = {
      id: 'owner-admin-id',
      full_name: 'Pétit SANDRINO',
      email: 'petitsandrino1@gmail.com',
      phone: '+228 90 00 00 00',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString()
    };

    setUser(ownerUser);
    setProfile(ownerProfile);
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: ownerUser, profile: ownerProfile }));
    } catch (e) {}
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch (e) {}
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user && isSupabaseConfigured) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      session, 
      loading, 
      signOut, 
      refreshProfile, 
      loginAsOwner,
      isConfigured: isSupabaseConfigured 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
