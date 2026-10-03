import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Schedule = {
  id: string;
  title: string;
  dueDate: string;
  daysLeft: number;
  type: string;
  icon: string;
  status: string;
  description: string;
  timestamp?: number;
  isReminder?: boolean;
};

interface SchedulesContextType {
  schedules: Schedule[];
  loading: boolean;
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  addSchedule: (schedule: Schedule) => Promise<void>;
  updateSchedule: (id: string, updated: Partial<Schedule>) => Promise<void>;
  refreshSchedules: () => Promise<void>;
}

const SchedulesContext = createContext<SchedulesContextType | undefined>(undefined);

export const SchedulesProvider = ({ children }: { children: ReactNode }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching schedules/reminders:', error);
    } else if (data) {
      const formattedData: Schedule[] = data.map((item: any) => {
        const due = new Date(item.due_date);
        const today = new Date();
        const diffTime = Math.abs(due.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          id: item.id,
          title: item.title,
          dueDate: due.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          daysLeft: item.due_date ? diffDays : 0,
          type: item.title.includes('License') ? 'Document' : item.title.includes('Service') ? 'Maintenance' : 'Training',
          icon: item.title.includes('License') ? 'document-text' : item.title.includes('Service') ? 'construct' : 'school',
          status: item.status || 'active',
          description: item.description || '',
          isReminder: true,
        };
      });
      setSchedules(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const addSchedule = async (schedule: Schedule) => {
    const { error } = await supabase.from('reminders').insert([{
      title: schedule.title,
      description: schedule.description,
      status: schedule.status,
      // Assume dueDate is parseable or just skip date math for now if it's complex
    }]);

    if (!error) {
      fetchSchedules();
    }
  };

  const updateSchedule = async (id: string, updated: Partial<Schedule>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    
    const dbUpdates: any = {};
    if (updated.title) dbUpdates.title = updated.title;
    if (updated.description) dbUpdates.description = updated.description;
    if (updated.status) dbUpdates.status = updated.status;
    
    await supabase.from('reminders').update(dbUpdates).eq('id', id);
  };

  return (
    <SchedulesContext.Provider value={{ schedules, loading, setSchedules, addSchedule, updateSchedule, refreshSchedules: fetchSchedules }}>
      {children}
    </SchedulesContext.Provider>
  );
};

export const useSchedules = () => {
  const context = useContext(SchedulesContext);
  if (context === undefined) {
    throw new Error('useSchedules must be used within a SchedulesProvider');
  }
  return context;
};

