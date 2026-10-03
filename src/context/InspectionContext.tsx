import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Inspection = {
  id: string;
  date: string;
  type: string;
  status: 'Passed' | 'Flagged' | 'Failed';
  vehicle: string;
  driver?: string;
  notes?: string;
};

interface InspectionContextType {
  inspections: Inspection[];
  loading: boolean;
  addInspection: (inspection: Omit<Inspection, 'id' | 'date'>) => Promise<void>;
  refreshInspections: () => Promise<void>;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export function InspectionProvider({ children }: { children: React.ReactNode }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspections = async () => {
    setLoading(true);
    // Fetch inspections, joining the vehicles and profiles to get readable names
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        *,
        vehicle:vehicles(name, make, model),
        driver:profiles(full_name)
      `)
      .order('inspection_date', { ascending: false });

    if (error) {
      console.error('Error fetching inspections:', error);
    } else if (data) {
      const formattedData: Inspection[] = data.map((item: any) => ({
        id: item.id,
        date: new Date(item.inspection_date).toISOString().split('T')[0],
        type: 'Daily Inspection', // You can add 'type' to the schema later if needed
        status: item.status === 'fail' ? 'Failed' : item.status === 'pass' ? 'Passed' : 'Flagged',
        vehicle: item.vehicle ? `${item.vehicle.name} (${item.vehicle.make} ${item.vehicle.model})` : 'Unknown Vehicle',
        driver: item.driver?.full_name || 'Unknown Driver',
        notes: item.notes,
      }));
      setInspections(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const addInspection = async (inspection: Omit<Inspection, 'id' | 'date'>) => {
    // In reality, Drivers will mostly add inspections from the Driver App.
    // If a manager adds one, it will go here.
    const { error } = await supabase.from('inspections').insert([{
      status: inspection.status === 'Failed' ? 'fail' : inspection.status === 'Passed' ? 'pass' : 'pending',
      notes: inspection.notes || '',
      // We would ideally look up the vehicle_id based on the string, but for now we assume it's just a mock insert from Manager
    }]);

    if (!error) {
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

