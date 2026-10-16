import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlerts, AlertMessage } from '../../context/AlertsContext';
import { useTranslation } from 'react-i18next';

export default function AlertsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { t } = useTranslation();

  const {
    alerts,
    unreadCount,
    markAllAsRead,
    markAsRead,
    deleteAlert,
    clearAllAlerts,
    addAlert,
    permissionStatus,
    requestPermissions,
  } = useAlerts();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'reminder' | 'request' | 'assignment'>('all');

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = () => {
    const confirmAction = async () => {
      await clearAllAlerts();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to clear all alerts?')) {
        confirmAction();
      }
    } else {
      Alert.alert('Clear All Alerts', 'Are you sure you want to clear all alerts?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: confirmAction },
      ]);
    }
  };

  const handleSendTestAlert = async () => {
    const testTypes: AlertMessage['type'][] = ['reminder', 'assignment', 'request', 'system'];
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];

    await addAlert(
      `Test ${randomType.toUpperCase()} Notification`,
      `This is a live test alert verifying your in-app banner, sound chime, and system notifications!`,
      randomType
    );
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermissions();
    if (!granted && Platform.OS === 'web') {
      window.alert('Notifications were blocked. Please enable notification permissions in your browser address bar settings.');
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleAlertPress = (alert: AlertMessage) => {
    markAsRead(alert.id);
    switch (alert.type) {
      case 'reminder':
        router.push('/(manager)/reminders');
        break;
      case 'schedule':
        router.push('/(manager)/schedules');
        break;
      case 'assignment':
        router.push('/(manager)/assignments');
        break;
      case 'request':
        router.push('/(manager)/requests');
        break;
      case 'checklist':
        router.push('/(manager)/inspections');
        break;
      case 'system':
        router.push('/(manager)/maintenance');
        break;
      default:
        break;
    }
  };

  const getIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'reminder':
        return 'alarm';
      case 'schedule':
        return 'calendar';
      case 'assignment':
        return 'briefcase';
      case 'request':
        return 'document-text';
      case 'checklist':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'reminder':
        return '#F59E0B';
      case 'schedule':
        return '#3B82F6';
      case 'assignment':
        return '#10B981';
      case 'request':
        return '#8B5CF6';
      case 'checklist':
        return '#EF4444';
      default:
        return '#043094';
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'unread') return !a.isRead;
    if (activeTab === 'reminder') return a.type === 'reminder' || a.type === 'schedule';
    if (activeTab === 'request') return a.type === 'request' || a.type === 'checklist';
    if (activeTab === 'assignment') return a.type === 'assignment';
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Page Title & Main Actions */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.title}>{t('m_alerts_title', 'Alerts & Notifications')}</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>{unreadCount} unread</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Real-time notifications for fleet activities, driver requests, and critical reminders.
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleSendTestAlert}
          >
            <Ionicons name="flash-outline" size={16} color="#043094" />
            <Text style={styles.testBtnText}>Send Test Alert</Text>
          </TouchableOpacity>

          {alerts.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={handleMarkAllAsRead}
              >
                <Ionicons name="checkmark-done" size={16} color="#475569" />
                <Text style={styles.actionBtnSecondaryText}>Mark all read</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDanger}
                onPress={handleClearAll}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.actionBtnDangerText}>Clear all</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* System Notification Permission Banner */}
      {permissionStatus !== 'granted' && (
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBox}>
            <Ionicons name="notifications-circle" size={32} color="#043094" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.permissionTitle}>
              Enable {Platform.OS === 'web' ? 'Desktop' : 'System'} Notifications
            </Text>
            <Text style={styles.permissionBody}>
              Get immediate sound chimes and OS notifications when drivers report issues or inspection flags, even when the browser or app is in the background.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.enableBtn}
            onPress={handleRequestPermission}
          >
            <Text style={styles.enableBtnText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
            All ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'unread' && styles.filterChipActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[styles.filterChipText, activeTab === 'unread' && styles.filterChipTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'reminder' && styles.filterChipActive]}
          onPress={() => setActiveTab('reminder')}
        >
          <Text style={[styles.filterChipText, activeTab === 'reminder' && styles.filterChipTextActive]}>
            Reminders & Schedules
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'request' && styles.filterChipActive]}
          onPress={() => setActiveTab('request')}
        >
          <Text style={[styles.filterChipText, activeTab === 'request' && styles.filterChipTextActive]}>
            Issues & Requests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'assignment' && styles.filterChipActive]}
          onPress={() => setActiveTab('assignment')}
        >
          <Text style={[styles.filterChipText, activeTab === 'assignment' && styles.filterChipTextActive]}>
            Assignments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No notifications in this view</Text>
          <Text style={styles.emptySubtitle}>
            When drivers report issues, inspections, or assignments are made, they will appear here.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={handleSendTestAlert}
          >
            <Text style={styles.emptyActionBtnText}>Trigger a Test Alert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.alertsList}>
          {filteredAlerts.map(alert => {
            const color = getColor(alert.type);
            const icon = getIcon(alert.type);

            return (
              <TouchableOpacity
                key={alert.id}
                activeOpacity={0.88}
                style={[styles.card, !alert.isRead && styles.unreadCard]}
                onPress={() => handleAlertPress(alert)}
              >
                <View style={styles.iconContainer}>
                  <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={22} color={color} />
                  </View>
                  {!alert.isRead && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeBadgeContainer}>
                      <View style={[styles.tagPill, { backgroundColor: color + '15' }]}>
                        <Text style={[styles.tagPillText, { color }]}>
                          {alert.type.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.alertTitle, !alert.isRead && styles.unreadTitle]}>
                        {alert.title}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(alert.timestamp)}</Text>
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {alert.body}
                  </Text>
                </View>

                {/* Right Action Icons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => deleteAlert(alert.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                  </TouchableOpacity>

                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  unreadPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadPillText: {
    color: '#043094',
    fontSize: 12,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  testBtnText: {
    color: '#043094',
    fontWeight: '600',
    fontSize: 13,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnDangerText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },

  // Permission Card
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 14,
    flexWrap: 'wrap',
  },
  permissionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  permissionBody: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 18,
  },
  enableBtn: {
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Filters
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#043094',
    borderColor: '#043094',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Alerts List
  alertsList: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#043094',
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    marginRight: 14,
    position: 'relative',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#043094',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  unreadTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  description: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  deleteBtn: {
    padding: 6,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    maxWidth: 380,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyActionBtn: {
    marginTop: 18,
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
