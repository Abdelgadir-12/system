import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Search, Trash2, Check, X, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
  Appointment,
  deleteAppointmentFromDB,
  getAppointmentsFromDB,
  getAppointmentsBypass,
  testAppointmentDBConnection,
  updateAppointmentStatusInDB,
} from "@/utils/appointmentDB";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useNotification } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";

const Appointments = () => {
  const { toast } = useToast();
  const { showNotification } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterService, setFilterService] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading appointments using REST API (like Pets)...');
      
      // Use the same approach as Pets - direct REST API call
      const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
      
      let url = `${SUPABASE_URL}/rest/v1/appointments?select=*&order=appointment_date.asc`;
      
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
      setAppointments(appointmentsFromDB);
      
    } catch (error) {
      console.error('❌ REST API call failed:', error);
      
      // Fallback to the original methods
      try {
        console.log('🔄 Trying original methods as fallback...');
        const data = await getAppointmentsFromDB();
        console.log('✅ Original method succeeded:', data.length);
        setAppointments(data);
      } catch (originalError) {
        console.error('❌ Original method failed:', originalError);
        toast({
          title: "Error",
          description: `Could not load appointments: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStatusUpdate = async (id: string, status: Appointment['status']) => {
    const success = await updateAppointmentStatusInDB(id, status);
    if (success) {
      loadAppointments();
      toast({
        title: "Status Updated",
        description: `Appointment status changed to ${status}`,
      });
      // Find the updated appointment and trigger notification
      const updated = appointments.find(a => a.id === id);
      if (updated) {
        showNotification({
          petName: updated.pet_name,
          service: updated.service,
          date: updated.appointment_date,
          timeSlot: updated.time_slot,
          ownerName: updated.owner_name,
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteAppointmentFromDB(id);
    if (success) {
      loadAppointments();
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been removed.",
      });
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    // Filter by search term
    const searchMatch = 
      appointment.pet_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      appointment.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by status
    const statusMatch = filterStatus === "All" || appointment.status === filterStatus;

    // Filter by service
    const serviceMatch = filterService === "all" || appointment.service === filterService;

    return searchMatch && statusMatch && serviceMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "scheduled": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search appointments..."
            className="pl-10 pr-4 py-2 w-full rounded-md border focus:outline-none focus:ring-2 focus:ring-pet-blue-dark dark:bg-gray-800 dark:border-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select 
          className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
        >
          <option value="all">All Services</option>
          <option value="General Consultation">General Consultation</option>
          <option value="Vaccination">Vaccination</option>
          <option value="Pet Grooming">Pet Grooming</option>
          <option value="Dental Care">Dental Care</option>
          <option value="Surgery">Surgery</option>
          <option value="Emergency Care">Emergency Care</option>
          <option value="Hematology">Hematology</option>
          <option value="Pharmacy Services">Pharmacy Services</option>
          <option value="Digital X-Ray">Digital X-Ray</option>
          <option value="Blood Chemistry">Blood Chemistry</option>
          <option value="Tonometry">Tonometry</option>
          <option value="Surgery with Gas Anesthetic Machine">Surgery with Gas Anesthetic Machine</option>
        </select>
      </div>

      {/* Appointments Table */}
      <div className="border rounded-md dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Pet</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Clock className="animate-spin h-4 w-4 mr-2" />
                    Loading appointments...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAppointments.length > 0 ? (
              filteredAppointments.slice().reverse().map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">{appointment.id.substring(0, 8)}</TableCell>
                  <TableCell>{appointment.pet_name}</TableCell>
                  <TableCell>{appointment.owner_name}</TableCell>
                  <TableCell className="capitalize">{appointment.service}</TableCell>
                  <TableCell>{new Date(appointment.appointment_date).toLocaleDateString()}</TableCell>
                  <TableCell>{appointment.time_slot}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleStatusUpdate(appointment.id, "completed")}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          <span>Mark as Completed</span>
                        </DropdownMenuItem>
                                                  <DropdownMenuItem 
                          onClick={() => handleStatusUpdate(appointment.id, "scheduled")}
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          <span>Mark as Scheduled</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusUpdate(appointment.id, "cancelled")}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(appointment.id)}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No appointments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Appointments;
