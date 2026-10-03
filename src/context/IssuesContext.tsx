import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Issue = {
  id: string;
  vehicle: string;
  issue: string;
  reporter: string;
  date: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'High' | 'Medium' | 'Low';
  needsServicing?: boolean;
  serviceDetails?: string;
  origin?: 'Manual' | 'Inspection';
};

interface IssuesContextType {
  issues: Issue[];
  loading: boolean;
  addIssue: (issue: Omit<Issue, 'id' | 'date'>) => Promise<void>;
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  refreshIssues: () => Promise<void>;
}

const IssuesContext = createContext<IssuesContextType | undefined>(undefined);

export function IssuesProvider({ children }: { children: React.ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('issues')
      .select(`
        id,
        description,
        priority,
        status,
        created_at,
        vehicle:vehicles(name, make, model),
        reporter:profiles(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching issues:', error);
    } else if (data) {
      const formattedData: Issue[] = data.map((item: any) => ({
        id: item.id,
        issue: item.description,
        priority: item.priority === 'high' ? 'High' : item.priority === 'medium' ? 'Medium' : 'Low',
        status: item.status === 'resolved' ? 'Resolved' : item.status === 'in_progress' ? 'In Progress' : 'Open',
        date: new Date(item.created_at).toISOString().split('T')[0],
        vehicle: item.vehicle ? `${item.vehicle.name || item.vehicle.make}` : 'Unknown Vehicle',
        reporter: item.reporter?.full_name || 'System',
        origin: 'Manual',
      }));
      setIssues(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const addIssue = async (issue: Omit<Issue, 'id' | 'date'>) => {
    const { error } = await supabase.from('issues').insert([{
      description: issue.issue,
      priority: issue.priority.toLowerCase(),
      status: issue.status === 'Resolved' ? 'resolved' : issue.status === 'In Progress' ? 'in_progress' : 'open',
      // We would ideally link vehicle_id and reported_by if we had them mapped
    }]);

    if (!error) {
      fetchIssues();
    }
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    // Optimistic UI update
    setIssues((prev) => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    
    // DB Update
    const dbUpdates: any = {};
    if (updates.issue) dbUpdates.description = updates.issue;
    if (updates.priority) dbUpdates.priority = updates.priority.toLowerCase();
    if (updates.status) {
      dbUpdates.status = updates.status === 'Resolved' ? 'resolved' : updates.status === 'In Progress' ? 'in_progress' : 'open';
    }
    
    await supabase.from('issues').update(dbUpdates).eq('id', id);
  };

  return (
    <IssuesContext.Provider value={{ issues, loading, addIssue, updateIssue, refreshIssues: fetchIssues }}>
      {children}
    </IssuesContext.Provider>
  );
}

export function useIssues() {
  const context = useContext(IssuesContext);
  if (context === undefined) {
    throw new Error('useIssues must be used within an IssuesProvider');
  }
  return context;
}

