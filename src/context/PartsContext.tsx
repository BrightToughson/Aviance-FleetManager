import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Part = {
  id: string;
  sku: string;
  name: string;
  category: string;
  qty: number;
  reorder: number;
  location: string;
  unitCost: number;
  depreciation?: number;
  vendorId?: string;
  compatibleVehicles?: string[];
  notes?: string;
  imageUrl?: string;
  receiptUrl?: string;
};

type PartsContextType = {
  parts: Part[];
  loading: boolean;
  addPart: (part: Omit<Part, 'id'>) => Promise<void>;
  updatePart: (id: string, updates: Partial<Part>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  refreshParts: () => Promise<void>;
};

const PartsContext = createContext<PartsContextType | undefined>(undefined);

export function PartsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParts = async () => {
    if (!user?.id) {
      setParts([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      let myPartIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_part_ids_${user.id}`);
        if (stored) myPartIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager part IDs:', e);
      }

      const { data, error } = await supabase
        .from('parts')
        .select('*');

      if (error) {
        console.error('Error fetching parts:', error);
      } else if (data) {
        const filtered = data.filter((p: any) => p.manager_id === user.id || myPartIds.includes(p.id));
        const formattedData: Part[] = filtered.map(p => ({
          id: p.id,
          sku: p.sku || p.part_number || '--',
          name: p.name,
          category: p.category || 'General',
          qty: p.quantity ?? 0,
          reorder: p.reorder_level ?? 0,
          location: p.location || 'Warehouse',
          unitCost: parseFloat(p.cost) || 0,
          depreciation: parseFloat(p.depreciation) || 0,
          vendorId: p.vendor_id,
          compatibleVehicles: p.compatible_vehicles || ['All'],
          notes: p.notes || '',
          imageUrl: p.image_url,
          receiptUrl: p.receipt_url,
        }));
        setParts(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchParts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchParts();
    } else {
      setParts([]);
      setLoading(false);
    }
  }, [user?.id]);

  const addPart = async (part: Omit<Part, 'id'>) => {
    // Validate UUID format so invalid strings do not break Postgres
    const isValidUUID = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const safeVendorId = isValidUUID(part.vendorId) ? part.vendorId : null;

    const { data, error } = await supabase.from('parts').insert([{
      name: part.name,
      sku: part.sku,
      category: part.category,
      quantity: part.qty,
      reorder_level: part.reorder,
      location: part.location,
      cost: part.unitCost,
      depreciation: part.depreciation || 0,
      vendor_id: safeVendorId,
      compatible_vehicles: part.compatibleVehicles,
      notes: part.notes,
      image_url: part.imageUrl,
      receipt_url: part.receiptUrl,
      manager_id: user?.id || null
    }]).select();

    if (error) {
      console.error('Error adding part:', error);
      throw error;
    }

    if (data && data[0]?.id && user?.id) {
      try {
        const stored = await AsyncStorage.getItem(`@manager_part_ids_${user.id}`);
        const currentIds: string[] = stored ? JSON.parse(stored) : [];
        if (!currentIds.includes(data[0].id)) {
          currentIds.push(data[0].id);
          await AsyncStorage.setItem(`@manager_part_ids_${user.id}`, JSON.stringify(currentIds));
        }
      } catch (e) {
        console.error('Error saving manager part ID:', e);
      }
    }

    await fetchParts();
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    setParts(parts.map(p => (p.id === id ? { ...p, ...updates } : p)));
    
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.qty !== undefined) dbUpdates.quantity = updates.qty;
    if (updates.reorder !== undefined) dbUpdates.reorder_level = updates.reorder;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.unitCost !== undefined) dbUpdates.cost = updates.unitCost;
    if (updates.depreciation !== undefined) dbUpdates.depreciation = updates.depreciation;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.compatibleVehicles !== undefined) dbUpdates.compatible_vehicles = updates.compatibleVehicles;

    const { error } = await supabase.from('parts').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating part:', error);
      throw error;
    }
  };

  const deletePart = async (id: string) => {
    setParts(parts.filter(p => p.id !== id));
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting part:', error);
      throw error;
    }
  };

  return (
    <PartsContext.Provider value={{ parts, loading, addPart, updatePart, deletePart, refreshParts: fetchParts }}>
      {children}
    </PartsContext.Provider>
  );
}

export function useParts() {
  const context = useContext(PartsContext);
  if (context === undefined) {
    throw new Error('useParts must be used within a PartsProvider');
  }
  return context;
}

