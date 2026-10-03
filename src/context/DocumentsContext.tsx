import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Document = {
  id: string;
  name: string;
  category: string;
  linkedTo: string;
  date: string;
  size: string;
  url?: string;
  expDate?: string;
};

type DocumentsContextType = {
  documents: Document[];
  loading: boolean;
  addDocument: (doc: Omit<Document, 'id'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
};

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
    } else if (data) {
      const formattedData: Document[] = data.map(d => ({
        id: d.id,
        name: d.name || 'Untitled Document',
        category: d.document_type || 'General',
        linkedTo: d.entity_type === 'vehicle' ? 'Vehicle' : d.entity_type === 'driver' ? 'Driver' : 'Global',
        date: new Date(d.created_at).toISOString().split('T')[0],
        size: d.file_size || 'Unknown Size',
        url: d.document_url,
        expDate: d.expiry_date,
      }));
      setDocuments(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const addDocument = async (doc: Omit<Document, 'id'>) => {
    const { error } = await supabase.from('documents').insert([{
      name: doc.name,
      document_type: doc.category,
      entity_type: doc.linkedTo.toLowerCase() === 'vehicle' ? 'vehicle' : 'driver',
      file_size: doc.size,
      document_url: doc.url || '',
    }]);

    if (!error) {
      fetchDocuments();
    }
  };

  const deleteDocument = async (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    await supabase.from('documents').delete().eq('id', id);
  };

  return (
    <DocumentsContext.Provider value={{ documents, loading, addDocument, deleteDocument, refreshDocuments: fetchDocuments }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
}

