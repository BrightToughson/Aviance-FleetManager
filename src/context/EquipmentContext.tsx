import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { uploadImageToSupabase } from '../lib/uploadImage';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const EquipmentContext = createContext<any>(null);

export const EquipmentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = async () => {
    if (!user?.id) {
      setEquipments([]);
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

      // 2. Get equipment IDs created by this manager
      let myEquipmentIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_equipment_ids_${user.id}`);
        if (stored) myEquipmentIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager equipment IDs:', e);
      }

      const { data, error } = await supabase
        .from('equipment')
        .select('*, profiles:profiles!equipment_assigned_driver_id_fkey (full_name, phone_number)');

      if (error) {
        console.error('Error fetching equipment:', error);
      } else if (data) {
        const filtered = data.filter((e: any) =>
          e.manager_id === user.id ||
          myEquipmentIds.includes(e.id) ||
          (e.assigned_driver_id && myDriverIds.includes(e.assigned_driver_id))
        );

        const formattedData = filtered.map(e => ({
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
          assignedTo: e.profiles?.full_name || e.manual_assigned_to || null,
          manualPhone: e.manual_phone || e.profiles?.phone_number || null,
          checkedOutAt: e.checked_out_at || null,
          image: e.image_url || 'https://images.unsplash.com/photo-1579708985165-4f365319808f?w=150&q=80'
        }));
        setEquipments(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchEquipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchEquipment();

      const channel = supabase.channel(`manager_equipment_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'equipment' },
          () => {
            fetchEquipment();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setEquipments([]);
      setLoading(false);
    }
  }, [user?.id]);

  const updateEquipmentImage = async (id: string, newImage: string) => {
    setEquipments((prev: any) => prev.map((e: any) => e.id === id ? { ...e, image: newImage } : e));
    
    let uploadedImage = newImage;
    if (newImage && (newImage.startsWith('file://') || newImage.startsWith('blob:'))) {
      try {
        uploadedImage = await uploadImageToSupabase(newImage, 'media');
      } catch (err) {
        console.error("Failed to upload equipment image", err);
      }
    }
    
    await supabase.from('equipment').update({ image_url: uploadedImage }).eq('id', id);
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
    
    if (newData.image) {
      let uploadedImage = newData.image;
      if (uploadedImage && (uploadedImage.startsWith('file://') || uploadedImage.startsWith('blob:'))) {
        try {
          uploadedImage = await uploadImageToSupabase(uploadedImage, 'media');
        } catch (err) {
          console.error("Failed to upload equipment image", err);
        }
      }
      dbUpdates.image_url = uploadedImage;
    }
    
    if ('assignedTo' in newData) {
      if (newData.assignedTo === 'Unassigned' || !newData.assignedTo) {
        dbUpdates.assigned_driver_id = null;
        dbUpdates.manual_assigned_to = null;
        dbUpdates.manual_phone = null;
        dbUpdates.checked_out_at = null;
      }
    }
    if ('assignedToId' in newData) {
      if (newData.assignedToId === 'manual') {
        dbUpdates.assigned_driver_id = null;
        dbUpdates.manual_assigned_to = newData.assignedTo;
      } else {
        // If it starts with user_, it's a Clerk auth profile. If not, it's a UUID contact.
        if (newData.assignedToId && newData.assignedToId.startsWith('user_')) {
          dbUpdates.assigned_driver_id = newData.assignedToId;
          dbUpdates.manual_assigned_to = null;
          dbUpdates.manual_phone = null;
        } else {
          // Fallback to manual entry for contacts so it doesn't break foreign key constraint
          dbUpdates.assigned_driver_id = null;
          dbUpdates.manual_assigned_to = newData.assignedTo;
          // Contact phone should ideally be mapped, but we clear it to avoid stale data if not provided
          dbUpdates.manual_phone = newData.manualPhone || null;
        }
      }
    }
    if ('manualPhone' in newData && newData.manualPhone !== undefined) {
      dbUpdates.manual_phone = newData.manualPhone;
    }
    if ('checked_out_at' in newData && newData.checked_out_at !== undefined) {
      dbUpdates.checked_out_at = newData.checked_out_at;
    }
    if ('status' in newData && newData.status !== undefined) {
      dbUpdates.status = newData.status;
    }

    const { error } = await supabase.from('equipment').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Failed to update equipment data:', error);
      if (Platform.OS === 'web') window.alert("Database Error: " + error.message);
      else {
        try { const { Alert } = require('react-native'); Alert.alert('Error', error.message); } catch(e) {}
      }
    }
  }

  const addEquipment = async (newEquipment: any) => {
    let imageUrl = newEquipment.profileImage || newEquipment.image || null;
    if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('blob:'))) {
      try {
        imageUrl = await uploadImageToSupabase(imageUrl, 'media');
      } catch (err) {
        console.error("Failed to upload equipment image", err);
      }
    }

    const { data, error } = await supabase.from('equipment').insert([{
      name: newEquipment.name,
      make: newEquipment.make,
      model: newEquipment.model,
      year: newEquipment.year,
      type: newEquipment.type,
      group_name: newEquipment.group || newEquipment.location,
      serial_number: newEquipment.serialNumber,
      status: newEquipment.status || 'Active',
      current_meter: newEquipment.currentMeter ? `${newEquipment.currentMeter} hrs` : "0 hrs",
      image_url: imageUrl,
      manager_id: user?.id || null
    }]).select();

    if (!error && data && data[0]?.id && user?.id) {
      try {
        const stored = await AsyncStorage.getItem(`@manager_equipment_ids_${user.id}`);
        const currentIds: string[] = stored ? JSON.parse(stored) : [];
        if (!currentIds.includes(data[0].id)) {
          currentIds.push(data[0].id);
          await AsyncStorage.setItem(`@manager_equipment_ids_${user.id}`, JSON.stringify(currentIds));
        }
      } catch (e) {
        console.error('Error saving manager equipment ID:', e);
      }
      fetchEquipment();
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      // UI will update via Realtime subscription
    } catch (err) {
      console.error('Error deleting equipment:', err);
    }
  };

  return (
    <EquipmentContext.Provider value={{ equipments, loading, updateEquipmentImage, updateEquipmentData, addEquipment, deleteEquipment, refreshEquipment: fetchEquipment }}>
      {children}
    </EquipmentContext.Provider>
  );
};

export const useEquipments = () => useContext(EquipmentContext);

