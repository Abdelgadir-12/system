
import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { User, Pet, Appointment } from "@/types/auth";
import { usePetManagement } from "@/hooks/usePetManagement";
import { getSessionUser, verifyCredentials, setLocalSession, clearLocalSession, createLocalUser } from "@/utils/localAuth";


type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean }>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const petManagement = usePetManagement(user);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    console.log("Setting up auth state listener");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (!isMounted) return;
        
        setSession(session);
        
        if (session?.user) {
          console.log("User session found, creating user profile");
          
          // Create user profile immediately from session data
          const userProfile: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: 'customer',
          };

          // Check if this is an admin user (based on email)
          if (session.user.email === 'admin@example.com') {
            userProfile.role = 'admin';
          }

          console.log("Setting user profile:", userProfile);
          if (isMounted) {
            setUser(userProfile);
          }

          // Try to fetch profile from database asynchronously (don't block login)
          // Use a timeout to wait for the database trigger to create the profile
          setTimeout(async () => {
            if (!isMounted) return;
            
            try {
              console.log("Attempting to fetch profile from database");
              
              // Wait a bit for the trigger to complete, then try to fetch the profile
              // The database trigger should automatically create the profile
              const { data: fullProfile, error: fullError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (fullProfile && !fullError && isMounted) {
                console.log("Full profile loaded:", fullProfile);
                setUser({
                  id: fullProfile.id,
                  name: fullProfile.name,
                  email: fullProfile.email,
                  role: fullProfile["role"] as "admin" | "customer",
                  phone: fullProfile.phone,
                  address: fullProfile.address,
                });
              } else if (fullError) {
                console.log("Profile fetch error (will retry on next login):", fullError);
                // Don't block login - the trigger might take time or there might be RLS issues
                // The user can still use the app with the basic profile from session
              } else {
                console.log("Profile not found yet - trigger may still be processing");
                // Profile might not be created yet by the trigger
                // Don't block login - use the session profile for now
              }
            } catch (error) {
              console.log("Profile fetch error:", error);
              // Don't block login for profile errors
            }
          }, 1000);
        } else {
          console.log("No Supabase user session, checking local session");
          if (isMounted) {
            const localUser = getSessionUser();
            if (localUser) {
              console.log("Local session found for:", localUser.email);
              setUser(localUser);
            } else {
              console.log("No local session found, clearing user state");
              setUser(null);
            }
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
        }
        console.log("Initial session:", session?.user?.email);
        
        if (isMounted) {
          setSession(session);
          if (!session) {
            // If there's no Supabase session, try local session
            const localUser = getSessionUser();
            if (localUser) {
              console.log("Setting user from local session:", localUser.email);
              setUser(localUser);
            }
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; isAdmin?: boolean }> => {
    console.log("Login attempt for:", email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Login response:", { user: data.user?.email, error: error?.message });

      if (error) {
        console.error('Supabase login error:', error.message);
      }

      if (data.user) {
        console.log("Login successful for:", data.user.email);
        const isAdmin = data.user.email === 'admin@example.com';
        return { success: true, isAdmin };
      }
      
      // If Supabase login failed or returned no user, try local auth fallback
      const localUser = verifyCredentials(email, password);
      if (localUser) {
        console.log("Local login successful for:", localUser.email);
        setUser(localUser);
        setLocalSession(localUser.id);
        const isAdmin = localUser.role === 'admin';
        return { success: true, isAdmin };
      }

      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      // On unexpected errors, still attempt local auth
      try {
        const localUser = verifyCredentials(email, password);
        if (localUser) {
          console.log("Local login successful after error for:", localUser.email);
          setUser(localUser);
          setLocalSession(localUser.id);
          const isAdmin = localUser.role === 'admin';
          return { success: true, isAdmin };
        }
      } catch {}
      return { success: false };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    // Create a local-only user and do NOT call Supabase.
    // Local users are stored in localStorage and won't be created on the remote website.
    try {
      const user = createLocalUser(name, email, password);
      // set in-memory user and local session so the app treats the user as signed up
      setUser(user);
      setLocalSession(user.id);
      return true;
    } catch (error: unknown) {
      console.error('Local signup failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message || 'Signup failed');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearLocalSession();
    setUser(null);
    setSession(null);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      console.log('Updating user profile with:', updates);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error.message);
        throw new Error(error.message);
      }

      setUser({ ...user, ...updates });
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message || 'Unknown profile update error');
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  console.log("Auth context state:", { 
    isAuthenticated, 
    isAdmin, 
    isLoading, 
    userEmail: user?.email,
    sessionExists: !!session 
  });

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        signup, 
        logout,
        updateUserProfile,
        ...petManagement,
        isAuthenticated, 
        isAdmin,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
