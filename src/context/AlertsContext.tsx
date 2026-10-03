import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AlertMessage {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  timestamp: Date;
  type: 'reminder' | 'schedule' | 'assignment' | 'request' | 'checklist' | 'system';
}

interface AlertsContextType {
  alerts: AlertMessage[];
  unreadCount: number;
  loading: boolean;
  addAlert: (title: string, body: string, type: AlertMessage['type']) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
    } else if (data) {
      const formattedData: AlertMessage[] = data.map(a => ({
        id: a.id,
        title: a.title,
        body: a.body,
        isRead: a.is_read,
        timestamp: new Date(a.created_at),
        type: (a.type as AlertMessage['type']) || 'system'
      }));
      setAlerts(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const addAlert = async (title: string, body: string, type: AlertMessage['type']) => {
    const { error } = await supabase.from('alerts').insert([{ title, body, type, is_read: false }]);
    if (!error) fetchAlerts();
  };

  const markAsRead = async (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    const unreadIds = alerts.filter(a => !a.isRead).map(a => a.id);
    if (unreadIds.length > 0) {
      await supabase.from('alerts').update({ is_read: true }).in('id', unreadIds);
    }
  };

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, loading, addAlert, markAsRead, markAllAsRead, refreshAlerts: fetchAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};

