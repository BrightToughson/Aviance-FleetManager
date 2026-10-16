import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  imageUrl?: string;
  vehicleId?: string;
  reporterId?: string;
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
  const { user } = useUser();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    if (!user?.id) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Get drivers belonging to this manager
      const { data: myDrivers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id);
      const myDriverIds = (myDrivers || []).map((d: any) => d.id);

      // 2. Get vehicle IDs belonging to this manager
      let myVehicleIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_vehicle_ids_${user.id}`);
        if (stored) myVehicleIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager vehicle IDs for issues:', e);
      }

      // 3. Get issue IDs created by this manager
      let myIssueIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(`@manager_issue_ids_${user.id}`);
        if (stored) myIssueIds = JSON.parse(stored);
      } catch (e) {
        console.error('Error reading manager issue IDs:', e);
      }

      if (myDriverIds.length === 0 && myVehicleIds.length === 0 && myIssueIds.length === 0) {
        setIssues([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('issues')
        .select(`
          id,
          vehicle_id,
          reported_by,
          description,
          priority,
          status,
          image_url,
          created_at,
          vehicles(name, make, model),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching issues:', error);
      } else if (data) {
        const filtered = data.filter((item: any) =>
          (item.vehicle_id && myVehicleIds.includes(item.vehicle_id)) ||
          (item.reported_by && myDriverIds.includes(item.reported_by)) ||
          myIssueIds.includes(item.id)
        );

        const formattedData: Issue[] = filtered.map((item: any) => ({
          id: item.id,
          issue: item.description,
          priority: item.priority === 'high' ? 'High' : item.priority === 'medium' ? 'Medium' : 'Low',
          status: item.status === 'resolved' ? 'Resolved' : item.status === 'in_progress' ? 'In Progress' : 'Open',
          date: new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
          vehicle: item.vehicles ? `${item.vehicles.name || item.vehicles.make}` : 'Unknown Vehicle',
          reporter: item.profiles?.full_name || 'System',
          origin: 'Manual',
          imageUrl: item.image_url || undefined,
          vehicleId: item.vehicle_id,
          reporterId: item.reported_by,
        }));
        setIssues(formattedData);
      }
    } catch (err) {
      console.error('Error in fetchIssues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchIssues();

      const channel = supabase.channel(`manager_issues_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issues' },
          () => {
            fetchIssues();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setIssues([]);
      setLoading(false);
    }
  }, [user?.id]);

  const addIssue = async (issue: Omit<Issue, 'id' | 'date'>) => {
    const { data, error } = await supabase.from('issues').insert([{
      description: issue.issue,
      priority: issue.priority.toLowerCase(),
      status: issue.status === 'Resolved' ? 'resolved' : issue.status === 'In Progress' ? 'in_progress' : 'open',
      vehicle_id: issue.vehicleId || null,
      reported_by: user?.id || null,
    }]).select();

    if (!error && data && data[0]?.id && user?.id) {
      try {
        const stored = await AsyncStorage.getItem(`@manager_issue_ids_${user.id}`);
        const currentIds: string[] = stored ? JSON.parse(stored) : [];
        if (!currentIds.includes(data[0].id)) {
          currentIds.push(data[0].id);
          await AsyncStorage.setItem(`@manager_issue_ids_${user.id}`, JSON.stringify(currentIds));
        }
      } catch (e) {
        console.error('Error saving manager issue ID:', e);
      }
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

