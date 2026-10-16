import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Inspection = {
  id: string;
  vehicleId?: string;
  date: string;
  type: string;
  status: 'Passed' | 'Flagged' | 'Failed' | 'Certified';
  vehicle: string;
  driver?: string;
  notes?: string;
  checklist?: Record<string, boolean>;
  fuel_level?: string;
  fuel_image_url?: string;
  issue_location?: string;
  issue_images?: Record<string, string>;
};

interface InspectionContextType {
  inspections: Inspection[];
  loading: boolean;
  addInspection: (inspection: Omit<Inspection, 'id' | 'date'>) => Promise<void>;
  refreshInspections: () => Promise<void>;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export function InspectionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspections = async () => {
    if (!user?.id) {
      setInspections([]);
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

      // 2. Get vehicle IDs belonging to this manager
      let myVehicleIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_vehicle_ids_${user.id}`);
        if (stored) myVehicleIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager vehicle IDs for inspections:', e);
      }

      // 3. Get inspection IDs created by this manager
      let myInspectionIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_inspection_ids_${user.id}`);
        if (stored) myInspectionIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager inspection IDs:', e);
      }

      if (myDriverIds.length === 0 && myVehicleIds.length === 0 && myInspectionIds.length === 0) {
        setInspections([]);
        setLoading(false);
        return;
      }

      // Fetch inspections, joining the vehicles and profiles to get readable names
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          vehicles(name, make, model),
          profiles(full_name)
        `)
        .order('inspection_date', { ascending: false });

      if (error) {
        console.error('Error fetching inspections:', error);
      } else if (data) {
        const filtered = data.filter((item: any) =>
          (item.vehicle_id && myVehicleIds.includes(item.vehicle_id)) ||
          (item.driver_id && myDriverIds.includes(item.driver_id)) ||
          myInspectionIds.includes(item.id)
        );

        const formattedData: Inspection[] = filtered.map((item: any) => ({
          id: item.id,
          vehicleId: item.vehicle_id,
          date: new Date(item.inspection_date).toISOString().split('T')[0],
          type: 'Daily Inspection',
          status: item.status === 'fail' ? 'Failed' : item.status === 'pass' ? 'Passed' : 'Flagged',
          vehicle: item.vehicles ? `${item.vehicles.name} (${item.vehicles.make} ${item.vehicles.model})` : 'Unknown Vehicle',
          driver: item.profiles?.full_name || 'Unknown Driver',
          notes: item.notes,
          checklist: item.checklist,
          fuel_level: item.fuel_level,
          fuel_image_url: item.fuel_image_url,
          issue_location: item.issue_location,
          issue_images: item.issue_images,
        }));
        setInspections(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchInspections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchInspections();

      const channel = supabase.channel(`manager_inspections_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inspections' },
          () => {
            fetchInspections();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setInspections([]);
      setLoading(false);
    }
  }, [user?.id]);

  const addInspection = async (inspection: Omit<Inspection, 'id' | 'date'>) => {
    const { data, error } = await supabase.from('inspections').insert([{
      status: inspection.status === 'Failed' ? 'fail' : inspection.status === 'Passed' ? 'pass' : 'pending',
      notes: inspection.notes || '',
      vehicle_id: inspection.vehicleId || null,
      driver_id: user?.id || null,
    }]).select();

    if (!error && data && data[0]?.id && user?.id) {
      try {
        const stored = await AsyncStorage.getItem(`@manager_inspection_ids_${user.id}`);
        const currentIds: string[] = stored ? JSON.parse(stored) : [];
        if (!currentIds.includes(data[0].id)) {
          currentIds.push(data[0].id);
          await AsyncStorage.setItem(`@manager_inspection_ids_${user.id}`, JSON.stringify(currentIds));
        }
      } catch (e) {
        console.error('Error saving manager inspection ID:', e);
      }
      fetchInspections();
    }
  };

  return (
    <InspectionContext.Provider value={{ inspections, loading, addInspection, refreshInspections: fetchInspections }}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspections() {
  const context = useContext(InspectionContext);
  if (context === undefined) {
    throw new Error('useInspections must be used within an InspectionProvider');
  }
  return context;
}

