import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Vendor = {
  id: string;
  name: string;
  category: string;
  status: string;
  contact: string;
  phone: string;
  email: string;
  rating: number;
  logo?: string;
  accountNumber?: string;
  taxId?: string;
  paymentTerms?: string;
  address?: string;
};

type VendorsContextType = {
  vendors: Vendor[];
  loading: boolean;
  addVendor: (vendor: Omit<Vendor, 'id'>) => Promise<void>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  refreshVendors: () => Promise<void>;
};

const VendorsContext = createContext<VendorsContextType | undefined>(undefined);

export function VendorsProvider({ children }: { children: React.ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching vendors:', error);
    } else if (data) {
      const formattedData: Vendor[] = data.map(v => ({
        id: v.id,
        name: v.name,
        category: v.category || v.service_type || 'General',
        status: v.status || 'Active',
        contact: v.contact_name || '',
        phone: v.phone || '',
        email: v.email || '',
        rating: parseFloat(v.rating) || 0,
        logo: v.logo_url,
        accountNumber: v.account_number,
        taxId: v.tax_id,
        paymentTerms: v.payment_terms,
        address: v.address
      }));
      setVendors(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const addVendor = async (vendor: Omit<Vendor, 'id'>) => {
    const { error } = await supabase.from('vendors').insert([{
      name: vendor.name,
      category: vendor.category,
      status: vendor.status,
      contact_name: vendor.contact,
      phone: vendor.phone,
      email: vendor.email,
      rating: vendor.rating,
      logo_url: vendor.logo,
      account_number: vendor.accountNumber,
      tax_id: vendor.taxId,
      payment_terms: vendor.paymentTerms,
      address: vendor.address,
    }]);

    if (!error) {
      fetchVendors();
    }
  };

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    setVendors(vendors.map(v => (v.id === id ? { ...v, ...updates } : v)));
    
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.contact) dbUpdates.contact_name = updates.contact;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.rating) dbUpdates.rating = updates.rating;
    if (updates.logo) dbUpdates.logo_url = updates.logo;
    if (updates.accountNumber) dbUpdates.account_number = updates.accountNumber;
    if (updates.taxId) dbUpdates.tax_id = updates.taxId;
    if (updates.paymentTerms) dbUpdates.payment_terms = updates.paymentTerms;
    if (updates.address) dbUpdates.address = updates.address;

    await supabase.from('vendors').update(dbUpdates).eq('id', id);
  };

  const deleteVendor = async (id: string) => {
    setVendors(vendors.filter(v => v.id !== id));
    await supabase.from('vendors').delete().eq('id', id);
  };

  return (
    <VendorsContext.Provider value={{ vendors, loading, addVendor, updateVendor, deleteVendor, refreshVendors: fetchVendors }}>
      {children}
    </VendorsContext.Provider>
  );
}

export function useVendors() {
  const context = useContext(VendorsContext);
  if (context === undefined) {
    throw new Error('useVendors must be used within a VendorsProvider');
  }
  return context;
}

