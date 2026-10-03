import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Assignment = {
  id: string;
  driverId?: string;
  driverName?: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupCoords?: { latitude: number; longitude: number };
  dropoffCoords?: { latitude: number; longitude: number };
  vehicle: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'In Progress' | 'Completed';
};

interface AssignmentsContextType {
  assignments: Assignment[];
  loading: boolean;
  addAssignment: (assignment: Omit<Assignment, 'id' | 'status'>) => Promise<void>;
  acceptAssignment: (id: string) => Promise<void>;
  rejectAssignment: (id: string) => Promise<void>;
  refreshAssignments: () => Promise<void>;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*, driver:profiles(full_name), vehicle:vehicles(name, make)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments/trips:', error);
    } else if (data) {
      const formattedData: Assignment[] = data.map((t: any) => ({
        id: t.id,
        driverId: t.driver_id,
        driverName: t.driver?.full_name || 'Unassigned',
        pickupLocation: t.start_location?.address || 'Unknown Pickup',
        dropoffLocation: t.end_location?.address || 'Unknown Dropoff',
        pickupCoords: t.start_location?.lat ? { latitude: t.start_location.lat, longitude: t.start_location.lng } : undefined,
        dropoffCoords: t.end_location?.lat ? { latitude: t.end_location.lat, longitude: t.end_location.lng } : undefined,
        vehicle: t.vehicle ? `${t.vehicle.name || t.vehicle.make}` : 'Unknown Vehicle',
        date: new Date(t.start_time).toISOString().split('T')[0],
        startTime: new Date(t.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: t.end_time ? new Date(t.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
        status: t.status === 'completed' ? 'Completed' : t.status === 'ongoing' ? 'In Progress' : t.status === 'cancelled' ? 'Rejected' : 'Pending',
      }));
      setAssignments(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const addAssignment = async (assignment: Omit<Assignment, 'id' | 'status'>) => {
    const { error } = await supabase.from('trips').insert([{
      // To properly link driver and vehicle we'd need IDs. For dummy logic we skip mapping IDs
      start_location: { address: assignment.pickupLocation },
      end_location: { address: assignment.dropoffLocation },
      status: 'ongoing',
      start_time: new Date(assignment.date + 'T' + (assignment.startTime || '00:00') + ':00Z').toISOString()
    }]);
    
    if (!error) fetchAssignments();
  };

  const acceptAssignment = async (id: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Accepted' } : a)));
    await supabase.from('trips').update({ status: 'ongoing' }).eq('id', id);
  };

  const rejectAssignment = async (id: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Rejected' } : a)));
    await supabase.from('trips').update({ status: 'cancelled' }).eq('id', id);
  };

  return (
    <AssignmentsContext.Provider value={{ assignments, loading, addAssignment, acceptAssignment, rejectAssignment, refreshAssignments: fetchAssignments }}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentsContext);
  if (context === undefined) {
    throw new Error('useAssignments must be used within an AssignmentsProvider');
  }
  return context;
}

