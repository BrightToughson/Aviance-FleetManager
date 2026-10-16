import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImageToSupabase } from '../lib/uploadImage';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const VehicleContext = createContext<any>(null);

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch vehicles for the authenticated manager
  const fetchVehicles = async () => {
    if (!user?.id) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Get vehicle IDs created/owned by this manager
      let myVehicleIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_vehicle_ids_${user.id}`);
        if (stored) myVehicleIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager vehicle IDs:', e);
      }

      // 2. Get drivers belonging to this manager
      const { data: myDrivers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id);
      const myDriverIds = (myDrivers || []).map((d: any) => d.id);

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profiles:profiles!vehicles_current_driver_id_fkey (full_name)
        `);
        
      if (error) {
        console.error('Error fetching vehicles:', error);
      } else if (data) {
        // Filter vehicles belonging to this manager
        const filtered = data.filter((v: any) => 
          v.manager_id === user.id ||
          myVehicleIds.includes(v.id) || 
          (v.current_driver_id && myDriverIds.includes(v.current_driver_id))
        );

        const formattedData = filtered.map((v: any) => ({
          ...v,
          assignedTo: v.profiles?.full_name || null,
          image: v.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150&h=150',
          group: v.vehicle_group,
          meter: v.current_meter,
          plate: v.license_plate,
          status: v.status === 'out_of_service' ? 'Out of Service' : 
                  v.status === 'maintenance' ? 'In Shop' : 'Active'
        }));
        setVehicles(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchVehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchVehicles();

      const channel = supabase.channel(`manager_vehicles_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vehicles' },
          () => {
            fetchVehicles();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setVehicles([]);
      setLoading(false);
    }
  }, [user?.id]);

  const updateVehicleImage = async (id: string, newImage: string) => {
    // Optimistic UI update
    setVehicles((prev: any) => prev.map((v: any) => v.id === id ? { ...v, image: newImage } : v));
    
    let uploadedImage = newImage;
    if (newImage && (newImage.startsWith('file://') || newImage.startsWith('blob:'))) {
      try {
        uploadedImage = await uploadImageToSupabase(newImage, 'media');
      } catch (err) {
        console.error("Failed to upload vehicle image", err);
      }
    }
    
    await supabase.from('vehicles').update({ image_url: uploadedImage }).eq('id', id);
  };

  const updateVehicleData = async (id: string, newData: any) => {
    // Optimistic UI update
    setVehicles((prev: any) => prev.map((v: any) => v.id === id ? { ...v, ...newData } : v));
    
    const dbData: any = { ...newData };
    if (newData.plate) dbData.license_plate = newData.plate;
    if (newData.group) dbData.vehicle_group = newData.group;
    if (newData.meter) dbData.current_meter = newData.meter;
    
    if (newData.image) {
      let uploadedImage = newData.image;
      if (uploadedImage && (uploadedImage.startsWith('file://') || uploadedImage.startsWith('blob:'))) {
        try {
          uploadedImage = await uploadImageToSupabase(uploadedImage, 'media');
        } catch (err) {
          console.error("Failed to upload vehicle image", err);
        }
      }
      dbData.image_url = uploadedImage;
      delete dbData.image;
    }
    
    if ('assignedTo' in newData) {
      if (newData.assignedTo === 'Unassigned' || !newData.assignedTo) {
        dbData.current_driver_id = null;
      }
      delete dbData.assignedTo;
    }
    
    await supabase.from('vehicles').update(dbData).eq('id', id);
  };

  const addVehicle = async (newVehicle: any) => {
    let imageUrl = newVehicle.profileImage || newVehicle.image || null;
    if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('blob:'))) {
      try {
        imageUrl = await uploadImageToSupabase(imageUrl, 'media');
      } catch (err) {
        console.error("Failed to upload vehicle image", err);
      }
    }

    const dbVehicle = {
      name: newVehicle.name,
      make: newVehicle.make,
      model: newVehicle.model || 'Unknown Model',
      year: newVehicle.year ? parseInt(newVehicle.year) || new Date().getFullYear() : new Date().getFullYear(),
      vin: newVehicle.vin || 'UNKNOWN',
      license_plate: newVehicle.plate || '--',
      type: newVehicle.type,
      vehicle_group: newVehicle.group || 'Unassigned',
      current_meter: newVehicle.currentMeter || '0',
      status: 'active',
      image_url: imageUrl,
      manager_id: user?.id || null
    };

    const { data, error } = await supabase.from('vehicles').insert([dbVehicle]).select();
    
    if (error) {
      console.error('Error adding vehicle:', error);
    } else if (data && data[0]?.id && user?.id) {
      try {
        const stored = await AsyncStorage.getItem(`@manager_vehicle_ids_${user.id}`);
        const currentIds: string[] = stored ? JSON.parse(stored) : [];
        if (!currentIds.includes(data[0].id)) {
          currentIds.push(data[0].id);
          await AsyncStorage.setItem(`@manager_vehicle_ids_${user.id}`, JSON.stringify(currentIds));
        }
      } catch (e) {
        console.error('Error saving manager vehicle ID:', e);
      }
      fetchVehicles();
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles, loading, updateVehicleImage, updateVehicleData, addVehicle, refreshVehicles: fetchVehicles }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => useContext(VehicleContext);
