import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';

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
  setSchedules: (updater: Schedule[] | ((prev: Schedule[]) => Schedule[])) => void;
  addSchedule: (schedule: Schedule) => Promise<void>;
  updateSchedule: (id: string, updated: Partial<Schedule>) => Promise<void>;
  deleteSchedule?: (id: string) => Promise<void>;
  clearSchedules?: () => Promise<void>;
  refreshSchedules: () => Promise<void>;
}

const SchedulesContext = createContext<SchedulesContextType | undefined>(undefined);

export const SchedulesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [schedules, setSchedulesState] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    if (!user?.id) {
      setSchedulesState([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(`@manager_schedules_${user.id}`);
      if (stored) {
        setSchedulesState(JSON.parse(stored));
      } else {
        setSchedulesState([]);
      }
    } catch (e) {
      console.error('Error fetching manager schedules:', e);
      setSchedulesState([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [user?.id]);

  const setSchedules = (updater: Schedule[] | ((prev: Schedule[]) => Schedule[])) => {
    setSchedulesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (user?.id) {
        AsyncStorage.setItem(`@manager_schedules_${user.id}`, JSON.stringify(next)).catch(console.error);
      }
      return next;
    });
  };

  const addSchedule = async (schedule: Schedule) => {
    if (!user?.id) return;
    setSchedules(prev => [schedule, ...prev]);
  };

  const updateSchedule = async (id: string, updated: Partial<Schedule>) => {
    if (!user?.id) return;
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const deleteSchedule = async (id: string) => {
    if (!user?.id) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const clearSchedules = async () => {
    if (!user?.id) return;
    setSchedulesState([]);
    try {
      await AsyncStorage.removeItem(`@manager_schedules_${user.id}`);
    } catch (e) {
      console.error('Error clearing manager schedules:', e);
    }
  };

  return (
    <SchedulesContext.Provider value={{ 
      schedules, 
      loading, 
      setSchedules, 
      addSchedule, 
      updateSchedule, 
      deleteSchedule,
      clearSchedules,
      refreshSchedules: fetchSchedules 
    }}>
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
