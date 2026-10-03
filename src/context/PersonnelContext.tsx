import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Person = {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  avatar: string;
  // Driver specific fields
  status?: string;
  vehicle?: string;
  licenseExp?: string;
  score?: number;
  joinedDate?: string;
  licenseNumber?: string;
};

interface PersonnelContextType {
  personnel: Person[];
  loading: boolean;
  addPerson: (person: Omit<Person, 'id'>) => Promise<void>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  refreshPersonnel: () => Promise<void>;
}

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

export function PersonnelProvider({ children }: { children: React.ReactNode }) {
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonnel = async () => {
    setLoading(true);
    
    // Fetch profiles (drivers and managers)
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*, driver_details(*)');
      
    // Fetch generic contacts
    const { data: contacts, error: contactErr } = await supabase
      .from('contacts')
      .select('*');

    if (profileErr || contactErr) {
      console.error('Error fetching personnel:', profileErr || contactErr);
      setLoading(false);
      return;
    }

    const formattedProfiles = (profiles || []).map(p => {
      // Map driver details if they exist
      const details = p.driver_details && p.driver_details.length > 0 ? p.driver_details[0] : null;
      
      return {
        id: p.id,
        name: p.full_name,
        role: p.role === 'driver' ? 'Driver' : 'Manager',
        department: p.department || 'Fleet',
        phone: p.phone_number || '',
        email: p.email || '',
        avatar: p.avatar_url || 'https://i.pravatar.cc/150?u=' + p.id,
        status: p.status || 'Active',
        vehicle: 'Unassigned', // In a real app, query the vehicles table for current_driver_id
        licenseExp: details?.license_expiry || '',
        licenseNumber: details?.license_number || '',
        score: details?.rating ? parseFloat(details.rating) : 0,
        joinedDate: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    });

    const formattedContacts = (contacts || []).map(c => ({
      id: c.id,
      name: c.name,
      role: c.role || 'Staff',
      department: 'External',
      phone: c.phone_number || '',
      email: c.email || '',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    }));

    setPersonnel([...formattedProfiles, ...formattedContacts]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const addPerson = async (person: Omit<Person, 'id'>) => {
    // If it's a Driver or Manager, it belongs in Auth/Profiles (handled differently via signup)
    // For this context, we will assume "addPerson" adds a generic contact to the `contacts` table
    const { error } = await supabase.from('contacts').insert([{
      name: person.name,
      role: person.role,
      phone_number: person.phone,
      email: person.email,
    }]);

    if (!error) {
      fetchPersonnel();
    }
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    // Optimistic UI
    setPersonnel(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    // Quick check: UUIDs for profiles are standard length, contacts might differ, 
    // but both are UUIDs in our schema. We can attempt to update both or check the role.
    if (updates.role === 'Driver' || updates.role === 'Manager') {
      await supabase.from('profiles').update({
        full_name: updates.name,
        phone_number: updates.phone,
        department: updates.department,
        status: updates.status,
      }).eq('id', id);
    } else {
      await supabase.from('contacts').update({
        name: updates.name,
        phone_number: updates.phone,
        email: updates.email,
        role: updates.role
      }).eq('id', id);
    }
  };

  return (
    <PersonnelContext.Provider value={{ personnel, loading, addPerson, updatePerson, refreshPersonnel: fetchPersonnel }}>
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

