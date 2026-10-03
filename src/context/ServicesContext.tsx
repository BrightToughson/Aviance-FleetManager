import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ServiceRO = {
  id: string;
  vehicle: string;
  vendor: string;
  date: string;
  cost: string;
  status: string;
  tasks: string;
};

interface ServicesContextType {
  services: ServiceRO[];
  loading: boolean;
  addService: (service: Omit<ServiceRO, 'id' | 'date'>) => Promise<void>;
  updateService: (id: string, updates: Partial<ServiceRO>) => Promise<void>;
  refreshServices: () => Promise<void>;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ServiceRO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*, vehicle:vehicles(name, make, model), vendor:vendors(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching services:', error);
    } else if (data) {
      const formattedData: ServiceRO[] = data.map((item: any) => ({
        id: item.id,
        vehicle: item.vehicle ? `${item.vehicle.name} (${item.vehicle.make})` : 'Unknown Vehicle',
        vendor: item.vendor?.name || 'Internal Shop',
        date: new Date(item.service_date || item.created_at).toISOString().split('T')[0],
        cost: `GH₵${item.cost || '0.00'}`,
        status: item.status === 'scheduled' ? 'Needs Service' : item.status === 'completed' ? 'Completed' : 'Pending Approval',
        tasks: item.tasks || item.description || 'General Service',
      }));
      setServices(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const addService = async (service: Omit<ServiceRO, 'id' | 'date'>) => {
    const { error } = await supabase.from('services').insert([{
      // For a real app, vehicle_id and vendor_id would be resolved here
      status: service.status === 'Needs Service' ? 'scheduled' : 'pending',
      tasks: service.tasks,
      service_date: new Date().toISOString().split('T')[0]
    }]);

    if (!error) {
      fetchServices();
    }
  };

  const updateService = async (id: string, updates: Partial<ServiceRO>) => {
    setServices((prev) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status === 'Needs Service' ? 'scheduled' : 'completed';
    if (updates.tasks) dbUpdates.tasks = updates.tasks;
    
    await supabase.from('services').update(dbUpdates).eq('id', id);
  };

  return (
    <ServicesContext.Provider value={{ services, loading, addService, updateService, refreshServices: fetchServices }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
}

