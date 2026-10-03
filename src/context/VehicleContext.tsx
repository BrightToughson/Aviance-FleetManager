import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const VehicleContext = createContext<any>(null);

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch vehicles from Supabase
  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        driver:profiles(full_name)
      `);
      
    if (error) {
      console.error('Error fetching vehicles:', error);
    } else if (data) {
      // Map database schema to frontend expectations
      const formattedData = data.map(v => ({
        ...v,
        assignedTo: v.driver?.full_name || null,
        image: v.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150&h=150',
        group: v.vehicle_group,
        meter: v.current_meter,
        plate: v.license_plate,
        // Capitalize status for UI compatibility
        status: v.status === 'out_of_service' ? 'Out of Service' : 
                v.status === 'maintenance' ? 'In Shop' : 'Active'
      }));
      setVehicles(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const updateVehicleImage = async (id: string, newImage: string) => {
    // Optimistic UI update
    setVehicles((prev: any) => prev.map((v: any) => v.id === id ? { ...v, image: newImage } : v));
    // Supabase update
    await supabase.from('vehicles').update({ image_url: newImage }).eq('id', id);
  };

  const updateVehicleData = async (id: string, newData: any) => {
    // Optimistic UI update
    setVehicles((prev: any) => prev.map((v: any) => v.id === id ? { ...v, ...newData } : v));
    // Supabase update (Requires mapping frontend keys back to DB columns)
    const dbData = { ...newData };
    if (newData.plate) dbData.license_plate = newData.plate;
    if (newData.group) dbData.vehicle_group = newData.group;
    if (newData.meter) dbData.current_meter = newData.meter;
    if (newData.image) dbData.image_url = newData.image;
    
    await supabase.from('vehicles').update(dbData).eq('id', id);
  }

  const addVehicle = async (newVehicle: any) => {
    const dbVehicle = {
      name: newVehicle.name,
      make: newVehicle.make,
      model: newVehicle.model,
      year: parseInt(newVehicle.year),
      vin: newVehicle.vin,
      license_plate: newVehicle.plate || '--',
      type: newVehicle.type,
      vehicle_group: newVehicle.group || 'Unassigned',
      current_meter: newVehicle.currentMeter || '0',
      status: 'active'
    };

    const { data, error } = await supabase.from('vehicles').insert([dbVehicle]).select();
    
    if (error) {
      console.error('Error adding vehicle:', error);
    } else {
      fetchVehicles(); // Refresh list to get the new ID and relationships
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles, loading, updateVehicleImage, updateVehicleData, addVehicle, refreshVehicles: fetchVehicles }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => useContext(VehicleContext);

