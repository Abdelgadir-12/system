import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  joinedOn?: string;
  lastLogin?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const getUsersFromDB = async (): Promise<User[]> => {
  // Prefer the authenticated client first so admin policies apply
  try {
    console.log('🔍 Loading users with Supabase client...');
    const { data, error: supabaseError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (supabaseError) {
      throw supabaseError;
    }

    console.log('✅ Supabase client succeeded:', data?.length || 0);
    return data || [];
  } catch (clientError) {
    console.error('⚠️ Supabase client failed, trying REST fallback:', clientError);
    try {
      const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
      const url = `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`;
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
      const usersFromDB = await response.json();
      console.log('✅ REST fallback succeeded:', usersFromDB.length);
      return usersFromDB;
    } catch (fallbackError) {
      console.error('❌ All methods failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Update user status using REST API
export const updateUserStatusInDB = async (userId: string, status: string): Promise<boolean> => {
  console.log(`🔄 Updating user ${userId} status to: ${status}`);
  // Try authenticated client first
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    console.log('✅ User status updated via client');
    return true;
  } catch (clientError) {
    console.error('⚠️ Client update failed, trying REST fallback:', clientError);
    try {
      const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
      const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status, updated_at: new Date().toISOString() })
      });
      if (!response.ok) {
        throw new Error(`Failed to update user status: ${response.status} ${response.statusText}`);
      }
      console.log('✅ User status updated via REST');
      return true;
    } catch (fallbackError) {
      console.error('❌ Failed to update user status:', fallbackError);
      throw fallbackError;
    }
  }
};

// Update user role using REST API
export const updateUserRoleInDB = async (userId: string, role: string): Promise<boolean> => {
  console.log(`🔄 Updating user ${userId} role to: ${role}`);
  // Map UI roles to DB roles used by auth logic
  const dbRole = role === 'Admin' ? 'admin' : 'customer';
  // Try authenticated client first
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ "role": dbRole, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    console.log('✅ User role updated via client');
    return true;
  } catch (clientError) {
    console.error('⚠️ Client update failed, trying REST fallback:', clientError);
    try {
      const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
      const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ "role": dbRole, updated_at: new Date().toISOString() })
      });
      if (!response.ok) {
        throw new Error(`Failed to update user role: ${response.status} ${response.statusText}`);
      }
      console.log('✅ User role updated via REST');
      return true;
    } catch (fallbackError) {
      console.error('❌ Failed to update user role:', fallbackError);
      throw fallbackError;
    }
  }
};

// Delete user using REST API
export const deleteUserFromDB = async (userId: string): Promise<boolean> => {
  console.log(`🗑️ Deleting user ${userId}`);
  // Try authenticated client first
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
    console.log('✅ User deleted via client');
    return true;
  } catch (clientError) {
    console.error('⚠️ Client delete failed, trying REST fallback:', clientError);
    try {
      const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
      const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status} ${response.statusText}`);
      }
      console.log('✅ User deleted via REST');
      return true;
    } catch (fallbackError) {
      console.error('❌ Failed to delete user:', fallbackError);
      throw fallbackError;
    }
  }
};
