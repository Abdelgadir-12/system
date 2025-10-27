import { supabase } from '@/integrations/supabase/client';
import { isAdmin, getAdminDetectionInfo } from './adminConfig';

// Types aligned to Supabase table structure generated in `src/integrations/supabase/types.ts`
export interface Appointment {
  id: string;
  pet_name: string;
  owner_name: string;
  service: string;
  appointment_date: string;
  time_slot: string;
  status: string;
  owner_id: string;
  user_notes?: string;
  created_at: string;
  updated_at: string;
}

// Input accepted from UI. We allow extra fields for UI use, but only persist supported columns to DB.
export interface AppointmentInput {
  pet_name: string;
  pet_species?: string; // UI-only (not stored in current DB schema)
  owner_name: string;
  email?: string; // UI-only
  phone?: string; // UI-only
  service: string;
  appointment_date: string;
  time_slot?: string;
  additional_info?: string; // UI-only
  blood_test?: string; // UI-only
}

// Ensure current user is in admins table if they're an admin
export const ensureAdminAccess = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking admin access...');
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No authenticated user found');
      return false;
    }
    
    // Get user's role from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    
    const userRole = profileData?.role;
    console.log('👤 User role from profile:', userRole);
    
    // Check if user is admin (based on email or role)
    const isUserAdmin = isAdmin(user.email, userRole);
    
    // Log admin detection info for debugging
    const detectionInfo = getAdminDetectionInfo(user.email, userRole);
    console.log('🔍 Admin detection info:', detectionInfo);
    
    if (!isUserAdmin) {
      console.log('⚠️ User is not an admin');
      console.log('💡 To add your email as admin, edit src/utils/adminConfig.ts and add your email to ADMIN_EMAILS array');
      return false;
    }
    
    console.log('✅ User is admin, ensuring access...');
    
    // Add user to admins table if not already there
    const { error: insertError } = await supabase
      .from('admins' as any)
      .upsert({ user_id: user.id }, { onConflict: 'user_id' });
      
    if (insertError) {
      console.error('❌ Error adding user to admins table:', insertError);
      return false;
    }
    
    console.log('✅ Admin access ensured');
    return true;
  } catch (error) {
    console.error('❌ Failed to ensure admin access:', error);
    return false;
  }
};

// Get all appointments from database
export const getAppointmentsFromDB = async (): Promise<Appointment[]> => {
  try {
    console.log('🔍 Fetching appointments using REST API (like Pets)...');
    
    // Use the same approach as Pets - direct REST API call
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    const url = `${SUPABASE_URL}/rest/v1/appointments?select=*&order=appointment_date.asc`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
    }
    
    const appointmentsFromDB = await response.json();
    console.log('✅ REST API call succeeded:', appointmentsFromDB.length);
    return appointmentsFromDB;
    
  } catch (error) {
    console.error('❌ REST API call failed:', error);
    
    // Fallback to Supabase client
    try {
      console.log('🔄 Trying Supabase client as fallback...');
      const { data, error: supabaseError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Supabase client succeeded:', data?.length || 0);
      return data || [];
    } catch (fallbackError) {
      console.error('❌ All methods failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Get appointments for a specific user
export const getAppointmentsForUser = async (userId: string): Promise<Appointment[]> => {
  try {
    console.log(`🔍 Fetching appointments for user: ${userId}`);
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('owner_id', userId)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user appointments:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} appointments for user ${userId}`);
    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch user appointments:', error);
    throw error;
  }
};

// Save new appointment to database
// Note: owner_id is required by DB schema; pass the authenticated user's id
export const saveAppointmentToDB = async (
  appointment: AppointmentInput & { owner_id?: string }
): Promise<Appointment> => {
  try {
    console.log('💾 Saving appointment to database...', appointment);
    
    // First test the connection
    const connectionTest = await testAppointmentDBConnection();
    if (!connectionTest) {
      throw new Error('Database connection test failed');
    }
    
    // Resolve owner_id from argument or current authenticated user
    let ownerId = appointment.owner_id;
    if (!ownerId) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        throw new Error('User not authenticated. Please log in.');
      }
      ownerId = authData.user.id;
    }

    // Persist only columns that exist in the `appointments` table
    const insertPayload = {
      owner_id: ownerId,
      pet_name: appointment.pet_name,
      owner_name: appointment.owner_name,
      service: appointment.service,
      appointment_date: appointment.appointment_date,
      time_slot: appointment.time_slot ?? '',
      // Use status values allowed by DB CHECK constraint: 'scheduled' | 'completed' | 'cancelled'
      status: 'scheduled' as const,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving appointment:', error);
      // Provide more detailed error information
      if (error.code === 'PGRST116') {
        throw new Error('Database table not found. Please check if the appointments table exists.');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check database policies.');
      } else {
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }
    }

    console.log('✅ Appointment saved successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to save appointment:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to save appointment to database');
    }
  }
};

// Update appointment status
export const updateAppointmentStatusInDB = async (id: string, status: string): Promise<boolean> => {
  try {
    console.log(`🔄 Updating appointment ${id} status to: ${status}`);
    
    // Use REST API approach like Pets
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    const url = `${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ 
        status, 
        updated_at: new Date().toISOString() 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update appointment: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Appointment status updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update appointment status:', error);
    throw error;
  }
};

// Update appointment notes
export const updateAppointmentNotesInDB = async (id: string, user_notes: string): Promise<boolean> => {
  try {
    console.log(`📝 Updating appointment ${id} notes`);
    
    // Use REST API approach like Pets
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    const url = `${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ 
        user_notes, 
        updated_at: new Date().toISOString() 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update appointment notes: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Appointment notes updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update appointment notes:', error);
    throw error;
  }
};

// Delete appointment
export const deleteAppointmentFromDB = async (id: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Deleting appointment ${id}`);
    
    // Use REST API approach like Pets
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    const url = `${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete appointment: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Appointment deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete appointment:', error);
    throw error;
  }
};

// Get appointments by status
export const getAppointmentsByStatus = async (status: string): Promise<Appointment[]> => {
  try {
    console.log(`🔍 Fetching appointments with status: ${status}`);
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', status)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching appointments by status:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} appointments with status: ${status}`);
    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch appointments by status:', error);
    throw error;
  }
};

// Get upcoming appointments (today and future)
export const getUpcomingAppointments = async (): Promise<Appointment[]> => {
  try {
    console.log('🔍 Fetching upcoming appointments...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('appointment_date', today)
      .neq('status', 'cancelled')
      .order('appointment_date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) {
      console.error('❌ Error fetching upcoming appointments:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} upcoming appointments`);
    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch upcoming appointments:', error);
    throw error;
  }
};

// Get appointments count by status
export const getAppointmentStats = async () => {
  try {
    console.log('📊 Fetching appointment statistics...');
    
    const { data, error } = await supabase
      .from('appointments')
      .select('status');

    if (error) {
      console.error('❌ Error fetching appointment stats:', error);
      throw error;
    }

    const stats = {
      total: data?.length || 0,
      scheduled: data?.filter(apt => apt.status === 'scheduled').length || 0,
      completed: data?.filter(apt => apt.status === 'completed').length || 0,
      cancelled: data?.filter(apt => apt.status === 'cancelled').length || 0
    };

    console.log('✅ Appointment stats:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Failed to fetch appointment stats:', error);
    throw error;
  }
};

// Test database connection for appointments
export const testAppointmentDBConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing appointment database connection...');
    
    // Simple select query to test table access
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Appointment DB connection test failed:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    console.log('✅ Appointment DB connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Appointment DB connection test error:', error);
    return false;
  }
};

// Bypass function for admin access - tries multiple approaches
export const getAppointmentsBypass = async (): Promise<Appointment[]> => {
  console.log('🚀 Attempting admin bypass for appointments...');
  
  try {
    // Method 1: Try with different ordering
    const { data: data1, error: error1 } = await supabase
      .from('appointments')
      .select('*');
    
    if (!error1 && data1) {
      console.log('✅ Method 1 succeeded:', data1.length);
      return data1;
    }
    
    // Method 2: Try with specific columns only
    const { data: data2, error: error2 } = await supabase
      .from('appointments')
      .select('id, pet_name, owner_name, service, appointment_date, time_slot, status, owner_id');
    
    if (!error2 && data2) {
      console.log('✅ Method 2 succeeded:', data2.length);
      return data2;
    }
    
    // Method 3: Try with limit
    const { data: data3, error: error3 } = await supabase
      .from('appointments')
      .select('*')
      .limit(100);
    
    if (!error3 && data3) {
      console.log('✅ Method 3 succeeded:', data3.length);
      return data3;
    }
    
    // Method 4: Try with different auth approach
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: data4, error: error4 } = await supabase
        .from('appointments')
        .select('*')
        .eq('owner_id', user.id);
      
      if (!error4 && data4) {
        console.log('✅ Method 4 (user-specific) succeeded:', data4.length);
        return data4;
      }
    }
    
    // Method 5: Try with RPC call
    const { data: data5, error: error5 } = await supabase
      .rpc('get_all_appointments');
    
    if (!error5 && data5) {
      console.log('✅ Method 5 (RPC) succeeded:', data5.length);
      return data5;
    }
    
    // If all methods fail, throw the last error
    throw new Error(`All bypass methods failed. Last error: ${error1?.message || error2?.message || error3?.message || error5?.message}`);
    
  } catch (error) {
    console.error('❌ All bypass methods failed:', error);
    throw error;
  }
};
