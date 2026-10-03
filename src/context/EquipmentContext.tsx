import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const EquipmentContext = createContext<any>(null);

export const EquipmentProvider = ({ children }: { children: React.ReactNode }) => {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipment')
      .select('*, assigned_driver:profiles(full_name)');

    if (error) {
      console.error('Error fetching equipment:', error);
    } else if (data) {
      const formattedData = data.map(e => ({
        id: e.id,
        name: e.name,
        year: e.year || '--',
        make: e.make || '--',
        model: e.model || '--',
        serialNumber: e.serial_number || '--',
        status: e.status,
        type: e.type || 'Equipment',
        group: e.group_name || 'Unassigned',
        meter: e.current_meter || '0 hr',
        plate: '--',
        assignedTo: e.assigned_driver?.full_name || null,
        image: e.image_url || 'https://images.unsplash.com/photo-1579708985165-4f365319808f?w=150&q=80'
      }));
      setEquipments(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const updateEquipmentImage = async (id: string, newImage: string) => {
    setEquipments((prev: any) => prev.map((e: any) => e.id === id ? { ...e, image: newImage } : e));
    await supabase.from('equipment').update({ image_url: newImage }).eq('id', id);
  };

  const updateEquipmentData = async (id: string, newData: any) => {
    setEquipments((prev: any) => prev.map((e: any) => e.id === id ? { ...e, ...newData } : e));
    
    const dbUpdates: any = {};
    if (newData.name) dbUpdates.name = newData.name;
    if (newData.make) dbUpdates.make = newData.make;
    if (newData.model) dbUpdates.model = newData.model;
    if (newData.year) dbUpdates.year = newData.year;
    if (newData.type) dbUpdates.type = newData.type;
    if (newData.group) dbUpdates.group_name = newData.group;
    if (newData.serialNumber) dbUpdates.serial_number = newData.serialNumber;
    if (newData.status) dbUpdates.status = newData.status;
    if (newData.meter) dbUpdates.current_meter = newData.meter;
    if (newData.image) dbUpdates.image_url = newData.image;

    await supabase.from('equipment').update(dbUpdates).eq('id', id);
  }

  const addEquipment = async (newEquipment: any) => {
    const { error } = await supabase.from('equipment').insert([{
      name: newEquipment.name,
      make: newEquipment.make,
      model: newEquipment.model,
      year: newEquipment.year,
      type: newEquipment.type,
      group_name: newEquipment.group || newEquipment.location,
      serial_number: newEquipment.serialNumber,
      status: newEquipment.status || 'Active',
      current_meter: newEquipment.hours ? "0 hrs" : undefined,
      image_url: newEquipment.profileImage || newEquipment.image
    }]);

    if (!error) {
      fetchEquipment();
    }
  };

  return (
    <EquipmentContext.Provider value={{ equipments, loading, updateEquipmentImage, updateEquipmentData, addEquipment, refreshEquipment: fetchEquipment }}>
      {children}
    </EquipmentContext.Provider>
  );
};

export const useEquipments = () => useContext(EquipmentContext);

