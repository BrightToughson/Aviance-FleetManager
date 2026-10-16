import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/expo';

export type Assignment = {
  id: string;
  driverId?: string;
  driverName?: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupCoords?: { latitude: number; longitude: number };
  dropoffCoords?: { latitude: number; longitude: number };
  driverCoords?: { latitude: number; longitude: number };
  vehicle: string;
  vehicleId?: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  avatarUrl?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'In Progress' | 'Completed';
};

interface AssignmentsContextType {
  assignments: Assignment[];
  loading: boolean;
  addAssignment: (assignment: Omit<Assignment, 'id' | 'status'>) => Promise<void>;
  acceptAssignment: (id: string) => Promise<void>;
  rejectAssignment: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  refreshAssignments: () => Promise<void>;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    if (!user?.id) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Get drivers belonging to this manager
      const { data: myDrivers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id);
      const myDriverIds = (myDrivers || []).map((d: any) => d.id);

      if (myDriverIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .select('*, profiles(full_name, avatar_url), vehicles(name, make)')
        .in('driver_id', myDriverIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignments/trips:', error);
      } else if (data) {
        const safeIso = (dStr: string) => { const d = new Date(dStr); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]; };
        const safeTime = (dStr: string) => { const d = new Date(dStr); return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

        const formattedData: Assignment[] = data.map((t: any) => ({
          id: t.id,
          driverId: t.driver_id,
          driverName: t.profiles?.full_name || t.driver?.full_name || 'Unassigned',
          avatarUrl: t.profiles?.avatar_url || t.driver?.avatar_url,
          pickupLocation: t.start_location?.address || 'Unknown Pickup',
          dropoffLocation: t.end_location?.address || 'Unknown Dropoff',
          pickupCoords: t.start_location?.lat ? { latitude: t.start_location.lat, longitude: t.start_location.lng } : undefined,
          dropoffCoords: t.end_location?.lat ? { latitude: t.end_location.lat, longitude: t.end_location.lng } : undefined,
          driverCoords: t.current_location?.lat ? { latitude: t.current_location.lat, longitude: t.current_location.lng } : undefined,
          vehicle: (t.vehicles || t.vehicle) ? `${(t.vehicles || t.vehicle).name || (t.vehicles || t.vehicle).make || 'Unknown'}` : 'Unknown Vehicle',
          date: safeIso(t.start_time) || 'Unknown',
          startTime: safeTime(t.start_time),
          endTime: t.end_time ? safeTime(t.end_time) : '--:--',
          notes: t.notes || t.task_description || t.description || undefined,
          status: t.status === 'completed' ? 'Completed' : t.status === 'ongoing' ? 'In Progress' : t.status === 'cancelled' ? 'Rejected' : 'Pending',
        }));
        setAssignments(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchAssignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();

      // Listen for realtime updates from drivers
      const channel = supabase
        .channel(`manager_assignments_realtime_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
          fetchAssignments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setAssignments([]);
      setLoading(false);
    }
  }, [user?.id]);

  const getCombinedDateTime = (dateStr: string, timeStr: string) => {
    const d = new Date(dateStr);
    const t = new Date(timeStr);
    if (isNaN(d.getTime()) || isNaN(t.getTime())) return new Date().toISOString();
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const addAssignment = async (assignment: Omit<Assignment, 'id' | 'status'>) => {
    const payload: any = {
      start_location: { address: assignment.pickupLocation, lat: assignment.pickupCoords?.latitude, lng: assignment.pickupCoords?.longitude },
      end_location: { address: assignment.dropoffLocation, lat: assignment.dropoffCoords?.latitude, lng: assignment.dropoffCoords?.longitude },
      status: 'ongoing',
      start_time: getCombinedDateTime(assignment.date, assignment.startTime),
      end_time: getCombinedDateTime(assignment.date, assignment.endTime)
    };
    
    if (assignment.notes) payload.notes = assignment.notes;
    
    if (assignment.driverId) payload.driver_id = assignment.driverId;
    if (assignment.vehicleId) payload.vehicle_id = assignment.vehicleId;
    else {
      // Fallback: try to find a vehicle if none is provided but driver is
      if (assignment.driverId) {
         const { data: v } = await supabase.from('vehicles').select('id').eq('current_driver_id', assignment.driverId).limit(1);
         if (v && v.length > 0) payload.vehicle_id = v[0].id;
      }
    }

    const { error } = await supabase.from('assignments').insert([payload]);
    
    if (!error) {
      // Send an alert to the driver
      await supabase.from('alerts').insert([{
        title: 'New Route Assigned',
        body: `You have a new assignment: ${assignment.pickupLocation} to ${assignment.dropoffLocation}.`,
        type: 'assignment',
        user_id: assignment.driverId || null,
        manager_id: user?.id || null
      }]);
      fetchAssignments();
    }
    else console.error('Error inserting assignment:', error);
  };

  const acceptAssignment = async (id: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Accepted' } : a)));
    await supabase.from('assignments').update({ status: 'ongoing' }).eq('id', id);
  };

  const rejectAssignment = async (id: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Rejected' } : a)));
    await supabase.from('assignments').update({ status: 'cancelled' }).eq('id', id);
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (!error) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } else {
      console.error('Error deleting assignment:', error);
    }
  };

  return (
    <AssignmentsContext.Provider value={{ assignments, loading, addAssignment, acceptAssignment, rejectAssignment, deleteAssignment, refreshAssignments: fetchAssignments }}>
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

