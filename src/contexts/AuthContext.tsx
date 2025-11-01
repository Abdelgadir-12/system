
import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { User, Pet, Appointment } from "@/types/auth";
import { usePetManagement } from "@/hooks/usePetManagement";
import { createLocalUser, verifyCredentials, setLocalSession, clearLocalSession, getSessionUser, updateStoredUser, findUserByEmail } from "@/utils/localAuth";

export type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean }>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  getUserPets: () => Promise<Pet[]>;
  addPet: (pet: Omit<Pet, 'id' | 'ownerId'>) => Promise<Pet>;
  updatePet: (id: string, updates: Partial<Omit<Pet, 'id' | 'ownerId'>>) => Promise<boolean>;
  deletePet: (id: string) => Promise<boolean>;
  getPetById: (id: string) => Promise<Pet | null>;
  calculatePetAge: (birthDate: string) => string;
  getUserAppointments: () => Promise<Appointment[]>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const petManagement = usePetManagement(user);

  // load profile from supabase if available
  const loadProfileFromSession = async (s: Session | null) => {
    if (!s?.user) return null;
    const base: User = {
      id: s.user.id,
      name: s.user.user_metadata?.name || s.user.email?.split('@')[0] || 'User',
      email: s.user.email || '',
      role: s.user.email === 'admin@example.com' ? 'admin' : 'customer',
    };

    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      if (error) {
        console.warn('Profile fetch warning:', error.message || error);
        return base;
      }
      if (profile) return { ...base, ...profile } as User;
      return base;
    } catch (err) {
      console.error('Error loading profile:', err);
      return base;
    }
  };

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      // Subscribe to Supabase auth changes
      const { data } = supabase.auth.onAuthStateChange(async (_event, sess) => {
        if (!mounted) return;
        setSession(sess ?? null);

        if (sess?.user) {
          const u = await loadProfileFromSession(sess);
          if (mounted) setUser(u);
        } else {
          // No supabase session: check for local session (locally created user)
          const local = getSessionUser();
          if (local && mounted) {
            setUser(local);
          } else if (mounted) {
            setUser(null);
          }
        }

        if (mounted) setIsLoading(false);
      });

      // initial session
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) console.warn('getSession error:', error.message || error);
        if (initialSession?.user) {
          const u = await loadProfileFromSession(initialSession);
          if (mounted) setUser(u);
        } else {
          const local = getSessionUser();
          if (local && mounted) setUser(local);
        }
      } catch (err) {
        console.error('Initial session error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }

      return () => {
        mounted = false;
        // unsubscribe if available
        try {
          type MaybeSub = { subscription?: { unsubscribe?: () => void } };
          const sub = (data as unknown as MaybeSub)?.subscription;
          if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
        } catch (e) {
          console.warn('Failed to unsubscribe auth listener', e);
        }
      };
    };

    const disposer = setup();
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; isAdmin?: boolean }> => {
    // Try Supabase first
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Supabase auth failed; try local
        console.warn('Supabase login error, falling back to local:', error.message || error);
      }
      if (data?.user) {
        const u = await loadProfileFromSession({ user: data.user } as Session);
        setUser(u);
        setSession({} as Session);
        return { success: true, isAdmin: data.user.email === 'admin@example.com' };
      }
    } catch (err) {
      console.error('Supabase login exception:', err);
    }

    // Local fallback
    try {
      const local = verifyCredentials(email, password);
      if (local) {
        setUser(local);
  try { setLocalSession(local.id); } catch (e) { console.warn('setLocalSession failed', e); }
        return { success: true, isAdmin: local.role === 'admin' };
      }
    } catch (err) {
      console.error('Local login error:', err);
    }

    return { success: false };
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const user = createLocalUser(name, email, password);
      // Auto-login local user
    try { setLocalSession(user.id); } catch (e) { console.warn('setLocalSession failed', e); }
      setUser(user);
      return true;
    } catch (err) {
      console.error('Local signup error:', err);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn('supabase.signOut failed', e); }
    try { clearLocalSession(); } catch (e) { console.warn('clearLocalSession failed', e); }
    setUser(null);
    setSession(null);
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) return;

    // If there's a stored local user with this email, update local storage
    try {
      const stored = findUserByEmail(user.email || '');
      if (stored) {
        updateStoredUser(stored.id, updates);
        setUser({ ...user, ...updates });
        return;
      }
    } catch (err) {
      console.warn('Error checking local user storage:', err);
    }

    // Otherwise update Supabase profile
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      setUser({ ...user, ...updates });
    } catch (err) {
      console.error('Failed to update profile in Supabase:', err);
      throw err;
    }
  };

  const contextValue: AuthContextType = {
    user,
    login,
    signup,
    logout,
    updateUserProfile,
    getUserPets: petManagement.getUserPets,
    addPet: petManagement.addPet,
    updatePet: petManagement.updatePet,
    deletePet: petManagement.deletePet,
    getPetById: petManagement.getPetById,
    calculatePetAge: petManagement.calculatePetAge,
    getUserAppointments: petManagement.getUserAppointments,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLoading,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// NOTE: useAuth hook is exported from a separate file `src/contexts/useAuth.ts`
