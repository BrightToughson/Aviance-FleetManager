import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface SystemNotificationPayload {
  title: string;
  body: string;
  type?: string;
  data?: Record<string, any>;
  onClick?: () => void;
}

class NotificationService {
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (Platform.OS !== 'web') {
      try {
        // Set foreground notification handler for mobile
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Set up Android High-Priority Channel
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('fleet_alerts', {
            name: 'Fleet Alerts & Reminders',
            description: 'Critical fleet updates, driver issues, and maintenance alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#043094',
            sound: 'default',
          }).catch(err => console.warn('Error setting notification channel:', err));
        }
      } catch (err) {
        console.warn('Error initializing mobile notifications:', err);
      }
    }
  }

  public async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied';
      }
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'undetermined';
    } else {
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
          return 'granted';
        }
        if (settings.canAskAgain) {
          return 'undetermined';
        }
        return 'denied';
      } catch (err) {
        console.warn('Error checking permissions:', err);
        return 'undetermined';
      }
    }
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
      }
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.warn('Web notification permission error:', err);
        return false;
      }
    } else {
      try {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        return status === 'granted';
      } catch (err) {
        console.warn('Mobile notification permission error:', err);
        return false;
      }
    }
  }

  public playChime() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        // Elegant dual-tone chime (587Hz -> 880Hz, D5 to A5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880.0, now);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
      } catch {
        // AudioContext autoplay policy before user interaction
      }
    }
  }

  public async sendSystemNotification(payload: SystemNotificationPayload): Promise<void> {
    this.init();

    if (Platform.OS === 'web') {
      this.playChime();

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const notif = new Notification(payload.title, {
              body: payload.body,
              icon: '/favicon.ico',
              tag: payload.type || 'fleet_alert',
              data: payload.data,
            });

            notif.onclick = () => {
              window.focus();
              notif.close();
              if (payload.onClick) {
                payload.onClick();
              }
            };
          } catch (err) {
            console.warn('Failed to display web notification:', err);
          }
        }
      }
    } else {
      // Mobile System Notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
            data: payload.data,
          },
          trigger: Platform.OS === 'android' ? { channelId: 'fleet_alerts' } : null,
        });
      } catch (err) {
        console.warn('Failed to schedule mobile notification:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
