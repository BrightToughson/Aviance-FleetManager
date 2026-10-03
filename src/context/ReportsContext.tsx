import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Report = {
  id: string;
  name: string;
  category: string;
  schedule: string;
  lastRun: string;
  format: string;
  description?: string;
  filters?: {
    vehicles?: string[];
    dateRange?: string;
    metrics?: string[];
  };
};

type ReportsContextType = {
  reports: Report[];
  loading: boolean;
  addReport: (report: Omit<Report, 'id'>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  refreshReports: () => Promise<void>;
};

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else if (data) {
      const formattedData: Report[] = data.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category || 'General',
        schedule: r.schedule || 'On Demand',
        lastRun: r.last_run || 'Never',
        format: r.format || 'PDF',
      }));
      setReports(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const addReport = async (report: Omit<Report, 'id'>) => {
    const { error } = await supabase.from('reports').insert([{
      name: report.name,
      category: report.category,
      schedule: report.schedule,
      last_run: report.lastRun,
      format: report.format
    }]);

    if (!error) fetchReports();
  };

  const deleteReport = async (id: string) => {
    setReports(reports.filter(r => r.id !== id));
    await supabase.from('reports').delete().eq('id', id);
  };

  return (
    <ReportsContext.Provider value={{ reports, loading, addReport, deleteReport, refreshReports: fetchReports }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}

