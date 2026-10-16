import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ServiceRO = {
  id: string;
  vehicleId?: string;
  rawCost?: number;
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
  const { user } = useUser();
  const [services, setServices] = useState<ServiceRO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    if (!user?.id) {
      setServices([]);
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
        console.error('Error reading manager vehicle IDs for services:', e);
      }

      // 3. Get service IDs created by this manager
      let myServiceIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_service_ids_${user.id}`);
        if (stored) myServiceIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager service IDs:', e);
      }

      const { data, error } = await supabase
        .from('services')
        .select('*, vehicles(name, make, model), vendors(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
      } else if (data) {
        const filtered = data.filter((item: any) =>
          (item.manager_id && item.manager_id === user.id) ||
          (item.vehicle_id && myVehicleIds.includes(item.vehicle_id)) ||
          myServiceIds.includes(item.id)
        );

        const formattedData: ServiceRO[] = filtered.map((item: any) => ({
          id: item.id,
          vehicleId: item.vehicle_id,
          rawCost: Number(item.cost) || 0,
          vehicle: item.vehicles ? `${item.vehicles.name} (${item.vehicles.make})` : 'Unknown Vehicle',
          vendor: item.vendors?.name || 'Internal Shop',
          date: new Date(item.service_date || item.created_at).toISOString().split('T')[0],
          cost: `GH₵${item.cost || '0.00'}`,
          status: item.status === 'scheduled' ? 'Needs Service' : item.status === 'completed' ? 'Completed' : 'Pending Approval',
          tasks: item.tasks || item.description || 'General Service',
        }));
        setServices(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchServices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchServices();

      const channel = supabase.channel(`manager_services_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'services' },
          () => {
            fetchServices();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setServices([]);
      setLoading(false);
    }
  }, [user?.id]);

  const addService = async (service: Omit<ServiceRO, 'id' | 'date'>) => {
    const { data, error } = await supabase.from('services').insert([{
      status: service.status === 'Needs Service' ? 'scheduled' : 'pending',
      tasks: service.tasks,
      vehicle_id: service.vehicleId || null,
      service_date: new Date().toISOString().split('T')[0],
      manager_id: user?.id || null
    }]).select();

    if (!error) {
      if (data && data[0]?.id && user?.id) {
        try {
          const stored = await AsyncStorage.getItem(`@manager_service_ids_${user.id}`);
          const currentIds: string[] = stored ? JSON.parse(stored) : [];
          if (!currentIds.includes(data[0].id)) {
            currentIds.push(data[0].id);
            await AsyncStorage.setItem(`@manager_service_ids_${user.id}`, JSON.stringify(currentIds));
          }
        } catch (e) {
          console.error('Error saving manager service ID:', e);
        }
      }
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

