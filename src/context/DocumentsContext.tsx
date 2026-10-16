import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export const MAX_STORAGE_MB = 100;
export const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024;

export type Document = {
  id: string;
  name: string;
  category: string;
  linkedTo: string;
  entityId?: string;
  date: string;
  size: string;
  url?: string;
  expDate?: string;
};

export function parseSizeToBytes(sizeStr: string | number | undefined): number {
  if (!sizeStr) return 0;
  if (typeof sizeStr === 'number') return sizeStr;

  const str = String(sizeStr).trim().toUpperCase();
  const match = str.match(/^([\d.]+)\s*([A-Z]*)/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  if (isNaN(value)) return 0;

  const unit = match[2];
  if (unit.startsWith('GB')) {
    return value * 1024 * 1024 * 1024;
  } else if (unit.startsWith('MB')) {
    return value * 1024 * 1024;
  } else if (unit.startsWith('KB')) {
    return value * 1024;
  } else {
    return value;
  }
}

type DocumentsContextType = {
  documents: Document[];
  loading: boolean;
  addDocument: (doc: Omit<Document, 'id'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  totalUsedBytes: number;
  totalUsedMB: number;
  remainingMB: number;
  maxStorageMB: number;
  storageUsagePercentage: number;
  isStorageFull: boolean;
  canUploadFile: (fileSizeBytes: number) => { allowed: boolean; reason?: string };
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
        linkedTo: d.entity_type === 'vehicle' ? 'Vehicle' : d.entity_type === 'driver' ? 'Driver' : d.entity_type === 'vendor' ? 'Vendor' : 'Global',
        entityId: d.entity_id,
        date: new Date(d.created_at).toISOString().split('T')[0],
        size: d.file_size || 'Unknown Size',
        url: d.document_url,
        expDate: d.expiry_date,
      }));
      setDocuments(formattedData);
      resolveMissingSizes(formattedData);
    }
    setLoading(false);
  };

  const resolveMissingSizes = async (docs: Document[]) => {
    const unknownDocs = docs.filter(d => (!d.size || d.size === 'Unknown Size' || d.size === '0 MB') && d.url);
    if (unknownDocs.length === 0) return;

    for (const doc of unknownDocs) {
      if (!doc.url) continue;
      try {
        let bytes = 0;
        try {
          const headRes = await fetch(doc.url, { method: 'HEAD' });
          const cl = headRes.headers.get('content-length');
          if (cl && !isNaN(parseInt(cl, 10))) {
            bytes = parseInt(cl, 10);
          }
        } catch (_) {}

        if (bytes === 0) {
          const getRes = await fetch(doc.url);
          const blob = await getRes.blob();
          bytes = blob.size;
        }

        if (bytes > 0) {
          const mb = bytes / (1024 * 1024);
          const formatted = mb >= 0.01 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
          
          setDocuments(prev => prev.map(item => item.id === doc.id ? { ...item, size: formatted } : item));
          await supabase.from('documents').update({ file_size: formatted }).eq('id', doc.id);
        }
      } catch (err) {
        console.warn(`Could not determine file size for document ${doc.name}:`, err);
      }
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Compute live storage figures from documents list
  const totalUsedBytes = useMemo(() => {
    return documents.reduce((acc, doc) => acc + parseSizeToBytes(doc.size), 0);
  }, [documents]);

  const totalUsedMB = useMemo(() => {
    return totalUsedBytes / (1024 * 1024);
  }, [totalUsedBytes]);

  const remainingMB = useMemo(() => {
    return Math.max(0, MAX_STORAGE_MB - totalUsedMB);
  }, [totalUsedMB]);

  const storageUsagePercentage = useMemo(() => {
    return Math.min(100, Math.round((totalUsedMB / MAX_STORAGE_MB) * 100 * 10) / 10);
  }, [totalUsedMB]);

  const isStorageFull = totalUsedBytes >= MAX_STORAGE_BYTES;

  const canUploadFile = (fileSizeBytes: number) => {
    if (totalUsedBytes + fileSizeBytes > MAX_STORAGE_BYTES) {
      const fileMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
      return {
        allowed: false,
        reason: `Storage limit exceeded: Uploading this file (${fileMB} MB) will exceed the ${MAX_STORAGE_MB} MB fleet quota. You have ${remainingMB.toFixed(2)} MB remaining.`,
      };
    }
    return { allowed: true };
  };

  const addDocument = async (doc: Omit<Document, 'id'>) => {
    let uploadedUrl = doc.url || '';
    let docSize = doc.size;

    if (uploadedUrl && (uploadedUrl.startsWith('file://') || uploadedUrl.startsWith('blob:'))) {
      try {
        const { uploadFileToSupabase } = await import('../lib/uploadImage');
        uploadedUrl = await uploadFileToSupabase(uploadedUrl, 'documents', true);
      } catch (err) {
        console.error("Failed to upload document file", err);
      }
    }

    if ((!docSize || docSize === 'Unknown Size') && uploadedUrl) {
      try {
        const res = await fetch(uploadedUrl);
        const blob = await res.blob();
        if (blob.size > 0) {
          const mb = blob.size / (1024 * 1024);
          docSize = mb >= 0.01 ? `${mb.toFixed(2)} MB` : `${(blob.size / 1024).toFixed(1)} KB`;
        }
      } catch (_) {}
    }

    const newFileBytes = parseSizeToBytes(docSize);
    const check = canUploadFile(newFileBytes);
    if (!check.allowed) {
      throw new Error(check.reason || 'Storage quota exceeded');
    }

    const entityType = doc.linkedTo?.toLowerCase().includes('vehicle') 
      ? 'vehicle' 
      : doc.linkedTo?.toLowerCase().includes('vendor')
      ? 'vendor'
      : doc.linkedTo?.toLowerCase().includes('driver')
      ? 'driver'
      : 'other';

    const insertPayload: any = {
      name: doc.name,
      document_type: doc.category,
      entity_type: entityType,
      file_size: docSize || '0.01 MB',
      document_url: uploadedUrl,
    };
    if (doc.entityId) insertPayload.entity_id = doc.entityId;
    if (doc.expDate) insertPayload.expiry_date = doc.expDate;

    const { error } = await supabase.from('documents').insert([insertPayload]);

    if (!error) {
      fetchDocuments();
    }
  };

  const deleteDocument = async (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    await supabase.from('documents').delete().eq('id', id);
  };

  return (
    <DocumentsContext.Provider
      value={{
        documents,
        loading,
        addDocument,
        deleteDocument,
        refreshDocuments: fetchDocuments,
        totalUsedBytes,
        totalUsedMB,
        remainingMB,
        maxStorageMB: MAX_STORAGE_MB,
        storageUsagePercentage,
        isStorageFull,
        canUploadFile,
      }}
    >
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
