import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useUser } from '@clerk/expo';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const uploadImageToSupabase = async (uri: string): Promise<string> => {
  console.warn("uploadImageToSupabase not fully implemented yet");
  return uri;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  avatar: string;
  contact_type?: string;
  company?: string;
  location?: string;
  whatsapp?: string;
  notes?: string;
  // Driver specific fields
  status?: string;
  vehicle?: string;
  licenseExp?: string;
  score?: number;
  joinedDate?: string;
  licenseNumber?: string;
  isProfile?: boolean;
};

interface PersonnelContextType {
  personnel: Person[];
  loading: boolean;
  addPerson: (person: Omit<Person, 'id'>) => Promise<void>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePersons: (ids: string[]) => Promise<void>;
  removeDriverFromFleet: (id: string) => Promise<void>;
  refreshPersonnel: () => Promise<void>;
}

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

export function PersonnelProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonnel = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch contact IDs belonging to this manager
      let myContactIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_contact_ids_${user.id}`);
        if (stored) myContactIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager contact IDs:', e);
      }
      
      // Fetch profiles (drivers belonging to this manager)
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*, driver_details(*)')
        .eq('manager_id', user.id);
        
      // Fetch generic contacts belonging to this manager
      let contacts: any[] = [];
      const { data: contactData, error: contactErr } = await supabase
        .from('contacts')
        .select('*');
      if (!contactErr && contactData) {
        contacts = contactData.filter((c: any) => c.manager_id === user.id || myContactIds.includes(c.id));
      }

      // Fetch assigned vehicles to map to drivers
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('name, license_plate, current_driver_id')
        .not('current_driver_id', 'is', null);
        
      const vehicleMap = new Map();
      if (vehicles) {
        vehicles.forEach(v => {
          vehicleMap.set(v.current_driver_id, `${v.name} - ${v.license_plate}`);
        });
      }

      if (profileErr) {
        console.error('Error fetching personnel profiles:', profileErr);
        setLoading(false);
        return;
      }

    const formattedProfiles = (profiles || [])
      .filter(p => p.id !== user.id)
      .map(p => {
        // Self-heal: ensure role in database is 'driver' if it was incorrectly marked as 'manager'
        if (p.role !== 'driver' || !p.is_driver) {
          supabase
            .from('profiles')
            .update({ role: 'driver', is_driver: true, is_manager: false })
            .eq('id', p.id)
            .then(({ error }) => {
              if (error) console.warn('Could not auto-update driver role in DB:', error);
            });
        }

        // Map driver details whether returned as a single 1-to-1 object or an array
        const details = Array.isArray(p.driver_details)
          ? (p.driver_details[0] || null)
          : (p.driver_details || null);
        
        return {
          id: p.id,
          name: p.full_name,
          role: 'Driver',
          department: p.department || 'Fleet',
          contact_type: 'Internal', // All drivers and team profiles are Internal
          phone: p.phone_number || '',
          email: p.email || '',
          avatar: p.avatar_url || '',
          status: p.status || 'Active',
          vehicle: vehicleMap.get(p.id) || 'Unassigned',
          licenseExp: details?.license_expiry || '',
          licenseNumber: details?.license_number || '',
          score: details?.rating != null ? parseFloat(details.rating) : 100,
          joinedDate: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          isProfile: true
        };
      });

    const formattedContacts = (contacts || []).map(c => ({
      id: c.id,
      name: c.name,
      role: c.role || 'Staff',
      department: (c as any).department || 'Unassigned',
      contact_type: c.contact_type || (c.role === 'Driver' || c.role === 'Manager' ? 'Internal' : 'External'),
      company: c.company || '',
      phone: c.phone_number || '',
      email: c.email || '',
      avatar: (c as any).avatar_url || '',
      status: 'Active',
      vehicle: 'Unassigned',
      score: 100,
      licenseExp: '2030-01-01',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isProfile: false
    }));

    setPersonnel([...formattedProfiles, ...formattedContacts]);
    } catch (error) {
      console.error('Error fetching personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPersonnel();

      const profilesChannel = supabase.channel('manager_personnel_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            fetchPersonnel();
          }
        )
        .subscribe();

      const vehiclesChannel = supabase.channel('manager_personnel_vehicles_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vehicles' },
          () => {
            fetchPersonnel();
          }
        )
        .subscribe();

      const detailsChannel = supabase.channel('manager_driver_details_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'driver_details' },
          () => {
            fetchPersonnel();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(vehiclesChannel);
        supabase.removeChannel(detailsChannel);
      };
    }
  }, [user?.id]);

  const addPerson = async (person: Omit<Person, 'id'>) => {
    // Optimistic UI update so it shows up immediately in the lists
    const tempId = `temp-${Date.now()}`;
    const newPerson: Person = {
      ...person,
      id: tempId,
      status: person.status || 'Active',
      contact_type: person.contact_type || 'External',
      vehicle: person.vehicle || 'Unassigned',
      score: person.score || 100,
    };
    setPersonnel(prev => [...prev, newPerson]);

    let avatarUrl = person.avatar;
    if (avatarUrl && (avatarUrl.startsWith('file://') || avatarUrl.startsWith('blob:'))) {
      try {
        avatarUrl = await uploadImageToSupabase(avatarUrl);
      } catch (err) {
        console.error("Failed to upload avatar", err);
      }
    }

    // If it's a Driver or Manager, it belongs in Auth/Profiles (handled differently via signup)
    // For this context, generic contacts are added to the `contacts` table with supported columns
    const contactPayload: any = {
      name: person.name,
      role: person.role || 'Staff',
      phone_number: person.phone || null,
      email: person.email || null,
      manager_id: user?.id || null,
    };

    const { data, error } = await supabase.from('contacts').insert([contactPayload]).select();

    if (!error) {
      if (data && data[0]?.id && user?.id) {
        try {
          const stored = await AsyncStorage.getItem(`@manager_contact_ids_${user.id}`);
          const currentIds: string[] = stored ? JSON.parse(stored) : [];
          if (!currentIds.includes(data[0].id)) {
            currentIds.push(data[0].id);
            await AsyncStorage.setItem(`@manager_contact_ids_${user.id}`, JSON.stringify(currentIds));
          }
        } catch (e) {
          console.error('Error saving manager contact ID:', e);
        }
      }
      await fetchPersonnel();
    } else {
      console.error('Error inserting person into Supabase contacts:', error);
      if (Platform.OS === 'web') window.alert("Database Error: " + (error.message || JSON.stringify(error)));
      else {
        try {
          const { Alert } = require('react-native');
          Alert.alert("Database Error", error.message || JSON.stringify(error));
        } catch(e) {}
      }
      setPersonnel(prev => prev.filter(p => p.id !== tempId));
      throw error;
    }
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    // Optimistic UI update
    setPersonnel(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    let uploadedAvatar = updates.avatar;
    if (uploadedAvatar && (uploadedAvatar.startsWith('file://') || uploadedAvatar.startsWith('blob:'))) {
      try {
        uploadedAvatar = await uploadImageToSupabase(uploadedAvatar);
      } catch (err) {
        console.error("Failed to upload avatar", err);
      }
    }

    const target = personnel.find(p => p.id === id);
    const isProfile = target?.isProfile || id.startsWith('user_');

    if (isProfile) {
      const profilePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) profilePayload.full_name = updates.name;
      if (updates.phone !== undefined) profilePayload.phone_number = updates.phone;
      if (updates.email !== undefined) profilePayload.email = updates.email;
      if (updates.department !== undefined) profilePayload.department = updates.department;
      if (updates.status !== undefined) profilePayload.status = updates.status;
      if (uploadedAvatar !== undefined) profilePayload.avatar_url = uploadedAvatar;
      if (updates.role) {
        const lowerRole = updates.role.toLowerCase();
        if (['driver', 'manager', 'admin'].includes(lowerRole)) {
          profilePayload.role = lowerRole;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', id);

      if (error) {
        console.error('Error updating profile in Supabase:', error);
        await fetchPersonnel();
        throw error;
      }

      if (updates.licenseExp !== undefined || updates.licenseNumber !== undefined || updates.score !== undefined) {
        const detailsPayload: any = {
          profile_id: id,
          updated_at: new Date().toISOString(),
        };
        if (updates.licenseExp !== undefined) detailsPayload.license_expiry = updates.licenseExp || null;
        if (updates.licenseNumber !== undefined) detailsPayload.license_number = updates.licenseNumber || null;
        if (updates.score !== undefined) detailsPayload.rating = updates.score;

        const { error: dErr } = await supabase.from('driver_details').upsert(detailsPayload);
        if (dErr) console.warn('Could not update driver_details:', dErr);
      }
    } else {
      const contactPayload: any = {};
      if (updates.name !== undefined) contactPayload.name = updates.name;
      if (updates.phone !== undefined) contactPayload.phone_number = updates.phone;
      if (updates.email !== undefined) contactPayload.email = updates.email;
      if (updates.role !== undefined) contactPayload.role = updates.role;

      const { error } = await supabase
        .from('contacts')
        .update(contactPayload)
        .eq('id', id);

      if (error) {
        console.error('Error updating contact in Supabase:', error);
        await fetchPersonnel();
        throw error;
      }
    }

    await fetchPersonnel();
  };

  const deletePersons = async (ids: string[]) => {
    setPersonnel(prev => prev.filter(p => !ids.includes(p.id)));
    await supabase.from('profiles').delete().in('id', ids);
    await supabase.from('contacts').delete().in('id', ids);
  };

  const removeDriverFromFleet = async (id: string) => {
    // Set manager_id to null so they are no longer in this manager's fleet
    const { data, error } = await supabase.from('profiles').update({ manager_id: null }).eq('id', id).select();
    if (error || !data || data.length === 0) {
      console.error('Failed to remove driver from fleet:', error || 'RLS denied the update (0 rows updated)');
      if (Platform.OS === 'web') window.alert("Could not remove driver from fleet (Permission denied).");
      else Alert.alert("Error", "Could not remove driver from fleet (Permission denied).");
      return;
    }
    // Optimistically update UI only if successful
    setPersonnel(prev => prev.filter(p => p.id !== id));
  };

  return (
    <PersonnelContext.Provider value={{ personnel, loading, addPerson, updatePerson, deletePersons, removeDriverFromFleet, refreshPersonnel: fetchPersonnel }}>
      {children}
    </PersonnelContext.Provider>
  );
}

export function usePersonnel() {
  const context = useContext(PersonnelContext);
  if (context === undefined) {
    throw new Error('usePersonnel must be used within a PersonnelProvider');
  }
  return context;
}

