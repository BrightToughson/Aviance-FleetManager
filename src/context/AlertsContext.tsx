import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import { supabase } from '../lib/supabase';
import { notificationService, NotificationPermissionStatus } from '../services/NotificationService';
import { InAppNotificationBanner } from '../components/InAppNotificationBanner';

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
  permissionStatus: NotificationPermissionStatus;
  requestPermissions: () => Promise<boolean>;
  addAlert: (
    title: string,
    body: string,
    type: AlertMessage['type'],
    options?: { notifySystem?: boolean; data?: any }
  ) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  activeBanner: AlertMessage | null;
  dismissBanner: () => void;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [activeBanner, setActiveBanner] = useState<AlertMessage | null>(null);

  const alertsRef = useRef<AlertMessage[]>([]);
  alertsRef.current = alerts;

  // Initialize Notification Service and check permission status on mount
  useEffect(() => {
    notificationService.init();
    notificationService.getPermissionStatus().then(status => {
      setPermissionStatus(status);
    });
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions();
    setPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  };

  const fetchAlerts = async () => {
    if (!user?.id) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Load locally cached alerts first
      const stored = await AsyncStorage.getItem(`@manager_alerts_${user.id}`);
      let localAlerts: AlertMessage[] = [];
      if (stored) {
        localAlerts = JSON.parse(stored).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }

      // 2. Fetch from Supabase alerts table
      let dbAlerts: AlertMessage[] = [];
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          dbAlerts = data
            .filter((a: any) => !a.manager_id || a.manager_id === user.id)
            .map((a: any) => ({
              id: a.id?.toString() || Math.random().toString(),
              title: a.title || 'Fleet Alert',
              body: a.body || '',
              isRead: Boolean(a.is_read),
              timestamp: new Date(a.created_at || Date.now()),
              type: (a.type as any) || 'system',
            }));
        }
      } catch (dbErr) {
        console.warn('Could not query alerts table from Supabase:', dbErr);
      }

      // Merge dbAlerts and localAlerts uniquely by id
      const alertMap = new Map<string, AlertMessage>();
      [...localAlerts, ...dbAlerts].forEach(item => {
        alertMap.set(item.id, item);
      });

      const merged = Array.from(alertMap.values()).sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      setAlerts(merged);
      await AsyncStorage.setItem(
        `@manager_alerts_${user.id}`,
        JSON.stringify(merged)
      );
    } catch (e) {
      console.error('Error fetching manager alerts:', e);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user?.id]);

  const saveAlerts = async (newAlerts: AlertMessage[]) => {
    setAlerts(newAlerts);
    if (user?.id) {
      try {
        await AsyncStorage.setItem(
          `@manager_alerts_${user.id}`,
          JSON.stringify(newAlerts)
        );
      } catch (e) {
        console.error('Error saving manager alerts to cache:', e);
      }
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const triggerNotification = (alert: AlertMessage, notifySystem: boolean = true) => {
    // 1. Show interactive in-app banner immediately
    setActiveBanner(alert);

    // 2. Trigger System Notification (Mobile push/local or Web Desktop notification + chime)
    if (notifySystem) {
      notificationService.sendSystemNotification({
        title: alert.title,
        body: alert.body,
        type: alert.type,
        data: { alertId: alert.id, type: alert.type },
      });
    }
  };

  const addAlert = async (
    title: string,
    body: string,
    type: AlertMessage['type'],
    options: { notifySystem?: boolean; data?: any } = {}
  ) => {
    const newAlert: AlertMessage = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title,
      body,
      isRead: false,
      timestamp: new Date(),
      type: type || 'system',
    };

    const updated = [newAlert, ...alertsRef.current];
    await saveAlerts(updated);

    // Try to save to Supabase alerts table so other sessions can see it
    if (user?.id) {
      try {
        await supabase.from('alerts').insert([
          {
            title,
            body,
            type: type || 'system',
            is_read: false,
            manager_id: user.id,
            user_id: user.id,
          },
        ]);
      } catch (err) {
        // Non-blocking if table doesn't have manager_id or offline
      }
    }

    // Trigger in-app banner & system alert
    triggerNotification(newAlert, options.notifySystem !== false);
  };

  // --- Realtime Supabase Subscription for Cross-Device / Driver-to-Manager Alerts ---
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('manager_realtime_alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;

          // Only accept alerts for this manager or general fleet
          if (newRow.manager_id && newRow.manager_id !== user.id) return;

          const incomingAlert: AlertMessage = {
            id: newRow.id?.toString() || Math.random().toString(),
            title: newRow.title || 'Fleet Alert',
            body: newRow.body || '',
            isRead: false,
            timestamp: new Date(newRow.created_at || Date.now()),
            type: (newRow.type as any) || 'system',
          };

          // Check if already in list
          if (alertsRef.current.some(a => a.id === incomingAlert.id)) return;

          const updated = [incomingAlert, ...alertsRef.current];
          saveAlerts(updated);
          triggerNotification(incomingAlert, true);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issues' },
        (payload: any) => {
          const newIssue = payload.new;
          if (!newIssue) return;

          const issueAlert: AlertMessage = {
            id: `issue_${newIssue.id || Date.now()}`,
            title: 'New Issue Reported',
            body: `Issue reported: ${newIssue.title || newIssue.description || 'Inspection issue flagged'}.`,
            isRead: false,
            timestamp: new Date(newIssue.created_at || Date.now()),
            type: 'request',
          };

          const updated = [issueAlert, ...alertsRef.current];
          saveAlerts(updated);
          triggerNotification(issueAlert, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    const updated = alerts.map(a => (a.id === id ? { ...a, isRead: true } : a));
    await saveAlerts(updated);
    try {
      await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    } catch {
      // offline fallback
    }
  };

  const markAllAsRead = async () => {
    const updated = alerts.map(a => ({ ...a, isRead: true }));
    await saveAlerts(updated);
    try {
      await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('manager_id', user?.id);
    } catch {
      // offline fallback
    }
  };

  const deleteAlert = async (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    await saveAlerts(updated);
    try {
      await supabase.from('alerts').delete().eq('id', id);
    } catch {
      // offline fallback
    }
  };

  const clearAllAlerts = async () => {
    setAlerts([]);
    if (user?.id) {
      await AsyncStorage.removeItem(`@manager_alerts_${user.id}`).catch(console.error);
    }
  };

  const dismissBanner = () => {
    setActiveBanner(null);
  };

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        unreadCount,
        loading,
        permissionStatus,
        requestPermissions,
        addAlert,
        markAsRead,
        markAllAsRead,
        deleteAlert,
        clearAllAlerts,
        refreshAlerts: fetchAlerts,
        activeBanner,
        dismissBanner,
      }}
    >
      {children}
      {/* Global In-App Notification Banner rendered at the root of the app */}
      <InAppNotificationBanner
        alert={activeBanner}
        onDismiss={dismissBanner}
      />
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
