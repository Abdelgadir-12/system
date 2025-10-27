
import { supabase } from '@/integrations/supabase/client';
import { ensureAdminAccess } from './appointmentDB';

export interface AdminStats {
  totalAppointments: number;
  totalPets: number;
  activeClients: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    console.log('🔍 Loading admin stats using REST API (like Pets)...');
    
    // Use the same approach as Pets - direct REST API calls
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    // Get appointments from REST API
    const appointmentsUrl = `${SUPABASE_URL}/rest/v1/appointments?select=*`;
    const appointmentsResponse = await fetch(appointmentsUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    let appointments: any[] = [];
    if (appointmentsResponse.ok) {
      appointments = await appointmentsResponse.json();
      console.log('✅ Appointments REST API call succeeded:', appointments.length);
    } else {
      console.error('Error fetching appointments for admin stats:', appointmentsResponse.statusText);
    }

    // Get pets from REST API
    const petsUrl = `${SUPABASE_URL}/rest/v1/pets?select=*`;
    const petsResponse = await fetch(petsUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    let pets: any[] = [];
    if (petsResponse.ok) {
      pets = await petsResponse.json();
      console.log('✅ Pets REST API call succeeded:', pets.length);
    } else {
      console.error('Error fetching pets for admin stats:', petsResponse.statusText);
    }

    // Calculate unique clients (owners) from appointments
    const uniqueClients = new Set();
    appointments.forEach(apt => {
      if (apt.owner_id) uniqueClients.add(apt.owner_id);
      else if (apt.email) uniqueClients.add(apt.email);
    });

    // Calculate appointment status counts (case-insensitive)
    const scheduledAppointments = appointments.filter(apt => apt.status?.toLowerCase() === 'scheduled').length;
    const completedAppointments = appointments.filter(apt => apt.status?.toLowerCase() === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status?.toLowerCase() === 'cancelled').length;

    return {
      totalAppointments: appointments.length,
      totalPets: pets.length,
      activeClients: uniqueClients.size,
      scheduledAppointments,
      completedAppointments,
      cancelledAppointments,
    };
  } catch (error) {
    console.error('Error calculating admin stats:', error);
    return {
      totalAppointments: 0,
      totalPets: 0,
      activeClients: 0,
      scheduledAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
    };
  }
};

export const getRecentAppointments = async (limit: number = 5) => {
  try {
    console.log('🔍 Loading recent appointments using REST API...');
    
    // Use the same approach as Pets - direct REST API call
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    const url = `${SUPABASE_URL}/rest/v1/appointments?select=*&order=created_at.desc&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recent appointments: ${response.status} ${response.statusText}`);
    }
    
    const appointments = await response.json();
    console.log('✅ Recent appointments REST API call succeeded:', appointments.length);
    
    return appointments.map((apt: any) => ({
      id: apt.id,
      petName: apt.pet_name,
      service: apt.service,
      date: apt.appointment_date,
      timeSlot: apt.time_slot,
      ownerName: apt.owner_name,
      status: apt.status,
      createdAt: new Date(apt.created_at).getTime()
    }));
  } catch (error) {
    console.error('Error getting recent appointments:', error);
    return [];
  }
};

export const getAppointmentsByStatus = async (status: string) => {
  try {
    console.log('🔍 Loading appointments by status using REST API...');
    
    // Use the same approach as Pets - direct REST API call
    const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
    
    const url = `${SUPABASE_URL}/rest/v1/appointments?select=*&status=eq.${status}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch appointments by status: ${response.status} ${response.statusText}`);
    }
    
    const appointments = await response.json();
    console.log('✅ Appointments by status REST API call succeeded:', appointments.length);
    
    return appointments.map((apt: any) => ({
      id: apt.id,
      petName: apt.pet_name,
      service: apt.service,
      date: apt.appointment_date,
      timeSlot: apt.time_slot,
      ownerName: apt.owner_name,
      status: apt.status,
      createdAt: new Date(apt.created_at).getTime()
    }));
  } catch (error) {
    console.error('Error getting appointments by status:', error);
    return [];
  }
};
