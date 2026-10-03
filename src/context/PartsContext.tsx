import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Part = {
  id: string;
  sku: string;
  name: string;
  category: string;
  qty: number;
  reorder: number;
  location: string;
  unitCost: number;
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
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('parts').select('*');

    if (error) {
      console.error('Error fetching parts:', error);
    } else if (data) {
      const formattedData: Part[] = data.map(p => ({
        id: p.id,
        sku: p.sku || p.part_number || '--',
        name: p.name,
        category: p.category || 'General',
        qty: p.quantity || 0,
        reorder: p.reorder_level || 0,
        location: p.location || 'Warehouse',
        unitCost: parseFloat(p.cost) || 0,
        vendorId: p.vendor_id,
        compatibleVehicles: p.compatible_vehicles || ['All'],
        imageUrl: p.image_url,
        receiptUrl: p.receipt_url,
      }));
      setParts(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const addPart = async (part: Omit<Part, 'id'>) => {
    const { error } = await supabase.from('parts').insert([{
      name: part.name,
      sku: part.sku,
      category: part.category,
      quantity: part.qty,
      reorder_level: part.reorder,
      location: part.location,
      cost: part.unitCost,
      vendor_id: part.vendorId,
      compatible_vehicles: part.compatibleVehicles,
      image_url: part.imageUrl,
      receipt_url: part.receiptUrl
    }]);

    if (!error) {
      fetchParts();
    }
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    setParts(parts.map(p => (p.id === id ? { ...p, ...updates } : p)));
    
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.sku) dbUpdates.sku = updates.sku;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.qty !== undefined) dbUpdates.quantity = updates.qty;
    if (updates.reorder !== undefined) dbUpdates.reorder_level = updates.reorder;
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.unitCost !== undefined) dbUpdates.cost = updates.unitCost;
    if (updates.compatibleVehicles) dbUpdates.compatible_vehicles = updates.compatibleVehicles;

    await supabase.from('parts').update(dbUpdates).eq('id', id);
  };

  const deletePart = async (id: string) => {
    setParts(parts.filter(p => p.id !== id));
    await supabase.from('parts').delete().eq('id', id);
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

