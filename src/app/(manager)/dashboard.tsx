import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Modal, TouchableOpacity, Pressable, Platform } from 'react-native';
import ResponsiveLineChart from '../../components/ResponsiveLineChart';
import ResponsiveBarChart from '../../components/ResponsiveBarChart';
import { useSearch } from '../../context/SearchContext';
import { Ionicons } from '@expo/vector-icons';
import { useVehicles } from '../../context/VehicleContext';
import { useIssues } from '../../context/IssuesContext';
import { useSchedules } from '../../context/SchedulesContext';
import { useAssignments } from '../../context/AssignmentsContext';
import { useEquipments } from '../../context/EquipmentContext';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Real Data from Contexts will be used
const emptyGraphData = [{value: 0, label: 'No Data'}];

const DashboardCard = ({ children, style, icon, iconColor = '#0EA5E9', title, badge }: any) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View 
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={[
        styles.card, 
        style,
        Platform.OS === 'web' && ({
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease',
          transform: isHovered ? [{ translateY: -3 }] : [{ translateY: 0 }],
          boxShadow: isHovered 
            ? '0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
          borderColor: isHovered ? '#CBD5E1' : '#E2E8F0',
        } as any)
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {icon && (
            <View style={[styles.cardIconBadge, { backgroundColor: `${iconColor}15` }]}>
              <Ionicons name={icon} size={15} color={iconColor} />
            </View>
          )}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {badge && (
          <View style={[styles.cardHeaderBadge, { backgroundColor: badge.bg || '#F1F5F9' }]}>
            <Text style={[styles.cardHeaderBadgeText, { color: badge.color || '#475569' }]}>{badge.text}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const { searchQuery } = useSearch();
  const [modalVisible, setModalVisible] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [isManageHovered, setIsManageHovered] = useState(false);
  
  const [fleetCode, setFleetCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    async function loadFleetCode() {
      if (!user?.id) return;
      if (user?.unsafeMetadata?.fleetCode && typeof user.unsafeMetadata.fleetCode === 'string') {
        setFleetCode(user.unsafeMetadata.fleetCode);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('fleet_code')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.fleet_code) {
          setFleetCode(data.fleet_code);
        }
      } catch (e) {
        console.error('Error fetching manager fleet_code in dashboard:', e);
      }
    }
    loadFleetCode();
  }, [user?.id, user?.unsafeMetadata?.fleetCode]);

  const handleCopyCode = async () => {
    if (!fleetCode) return;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(fleetCode);
      } else {
        await Clipboard.setStringAsync(fleetCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy fleet code in dashboard:', e);
    }
  };
  
  const [fuelData, setFuelData] = useState([{label: 'No Data', value: 0}]);
  const [vehicleReminders, setVehicleReminders] = useState({overdue: 0, soon: 0});
  const [contactReminders, setContactReminders] = useState({overdue: 0, soon: 0});
  
  const [repairTrendsData, setRepairTrendsData] = useState([{label: 'No Data', value: 0}]);
  const [timeToResolveData, setTimeToResolveData] = useState([{label: 'No Data', value: 0}]);

  React.useEffect(() => {
    async function loadExtraData() {
      if (!user?.id) {
        setVehicleReminders({overdue: 0, soon: 0});
        setContactReminders({overdue: 0, soon: 0});
        setFuelData([{label: 'Total Fuel Cost', value: 0}]);
        return;
      }

      // 1. Load Manager Reminders
      try {
        const stored = await AsyncStorage.getItem(`@manager_reminders_${user.id}`);
        const rems = stored ? JSON.parse(stored) : [];
        let vOverdue = 0, vSoon = 0, cOverdue = 0, cSoon = 0;
        const today = new Date();
        rems.forEach((r: any) => {
          const isVehicle = r.vehicleId != null || r.type === 'Vehicle' || r.category === 'vehicle';
          const dueDate = new Date(r.dueDate || r.date || r.due_date);
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          if (r.status === 'overdue' || diffDays < 0) {
            isVehicle ? vOverdue++ : cOverdue++;
          } else if (r.status === 'pending' && diffDays <= 14) {
            isVehicle ? vSoon++ : cSoon++;
          }
        });
        setVehicleReminders({overdue: vOverdue, soon: vSoon});
        setContactReminders({overdue: cOverdue, soon: cSoon});
      } catch (e) {
        console.error('Error loading manager reminders for dashboard:', e);
      }

      // 2. Load Manager Fuel Logs
      try {
        const { data: myDrivers } = await supabase
          .from('profiles')
          .select('id')
          .eq('manager_id', user.id);
        const myDriverIds = (myDrivers || []).map((d: any) => d.id);

        let myVehicleIds: string[] = [];
        try {
          const storedV = await AsyncStorage.getItem(`@manager_vehicle_ids_${user.id}`);
          if (storedV) myVehicleIds = JSON.parse(storedV);
        } catch (e) {}

        if (myDriverIds.length === 0 && myVehicleIds.length === 0) {
          setFuelData([{label: 'Total Fuel Cost', value: 0}]);
          return;
        }

        const { data: fuel } = await supabase.from('fuel_logs').select('cost, date, vehicle_id, driver_id');
        if (fuel && fuel.length > 0) {
          const filtered = fuel.filter((l: any) =>
            (l.vehicle_id && myVehicleIds.includes(l.vehicle_id)) ||
            (l.driver_id && myDriverIds.includes(l.driver_id))
          );
          const total = filtered.reduce((sum: number, log: any) => sum + Number(log.cost || 0), 0);
          setFuelData([{label: 'Total Fuel Cost', value: total}]);
        } else {
          setFuelData([{label: 'Total Fuel Cost', value: 0}]);
        }
      } catch (e) {
        console.error('Error loading fuel logs for dashboard:', e);
      }
    }
    loadExtraData();
  }, [user?.id]);
  
  // Contexts
  const { vehicles } = useVehicles();
  const { issues } = useIssues();
  const { schedules } = useSchedules();
  const { assignments } = useAssignments();
  const { equipments } = useEquipments();

  React.useEffect(() => {
    // Generate a 6-month rolling timeline window up to the current month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const timelineMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      timelineMonths.push(monthNames[d.getMonth()]);
    }

    const monthCounts: Record<string, number> = {};
    const resolveTimeCounts: Record<string, { totalDays: number; count: number }> = {};
    timelineMonths.forEach(m => {
      monthCounts[m] = 0;
      resolveTimeCounts[m] = { totalDays: 0, count: 0 };
    });

    if (issues && issues.length > 0) {
      issues.forEach((issue: any) => {
        const d = new Date(issue.date || new Date());
        const month = d.toLocaleString('default', { month: 'short' });
        if (monthCounts[month] !== undefined) {
          monthCounts[month] += 1;
        }

        const statusLower = (issue.status || '').toLowerCase();
        if (statusLower === 'resolved') {
          if (resolveTimeCounts[month] !== undefined) {
            resolveTimeCounts[month].totalDays += 2; // Average resolution benchmark
            resolveTimeCounts[month].count += 1;
          }
        }
      });
    }

    const trends = timelineMonths.map(m => ({ label: m, value: monthCounts[m] }));
    const resolveTimes = timelineMonths.map(m => ({
      label: m,
      value: resolveTimeCounts[m].count > 0 ? Math.round(resolveTimeCounts[m].totalDays / resolveTimeCounts[m].count) : 0
    }));

    setRepairTrendsData(trends);
    setTimeToResolveData(resolveTimes);
  }, [issues]);

  // Metrics
  const activeVehicles = vehicles?.filter((v: any) => v.status === 'Active').length || 0;
  const inShopVehicles = vehicles?.filter((v: any) => v.status === 'In Shop').length || 0;
  const outOfServiceVehicles = vehicles?.filter((v: any) => v.status === 'Out of Service').length || 0;
  
  const openIssuesCount = issues?.filter((i: any) => (i.status || '').toLowerCase() === 'open').length || 0;
  const resolvedIssuesCount = issues?.filter((i: any) => (i.status || '').toLowerCase() === 'resolved').length || 0;
  const criticalFaults = issues?.filter((i: any) => {
    const prio = (i.priority || '').toLowerCase();
    const title = (i.issue || i.description || '').toLowerCase();
    return prio === 'high' || prio === 'critical' || title.includes('critical');
  }) || [];

  const getFaultDetails = (fault: any) => {
    const rawText = fault.issue || fault.description || fault.title || 'Unspecified Fault';
    const catMatch = rawText.match(/^\[(.*?)\]\s*(.*)$/);
    const category = catMatch ? catMatch[1] : (fault.category || 'Defect');
    const description = catMatch && catMatch[2] ? catMatch[2] : rawText;
    
    const catLower = category.toLowerCase();
    let icon: any = 'alert-circle';
    if (catLower.includes('tire') || catLower.includes('wheel')) icon = 'disc-outline';
    else if (catLower.includes('brake')) icon = 'hand-left-outline';
    else if (catLower.includes('engine') || catLower.includes('motor')) icon = 'hardware-chip-outline';
    else if (catLower.includes('battery') || catLower.includes('electric')) icon = 'flash-outline';
    else if (catLower.includes('transmission') || catLower.includes('gear')) icon = 'git-compare-outline';
    else if (catLower.includes('oil') || catLower.includes('fluid')) icon = 'water-outline';
    else if (catLower.includes('light')) icon = 'bulb-outline';

    return {
      category,
      description,
      icon,
      vehicle: fault.vehicle || 'Fleet Vehicle',
      reporter: fault.reporter || 'Driver',
      date: fault.date || 'Recent',
      status: fault.status || 'Open'
    };
  };

  const overdueSchedules = schedules?.filter((s: any) => s.daysLeft < 0 || s.status === 'overdue').length || 0;
  const dueSoonSchedules = schedules?.filter((s: any) => s.daysLeft >= 0 && s.daysLeft <= 14 && s.status !== 'completed').length || 0;

  const assignedVehicles = vehicles?.filter((v: any) => v.assignedTo && v.assignedTo !== 'Unassigned').length || 0;
  const unassignedVehicles = vehicles?.filter((v: any) => !v.assignedTo || v.assignedTo === 'Unassigned').length || 0;

  const equipmentActive = equipments?.filter((e: any) => (e.status || '').toLowerCase() === 'available' || (e.status || '').toLowerCase() === 'active').length || 0;
  const equipmentInactive = equipments?.filter((e: any) => (e.status || '').toLowerCase() !== 'available' && (e.status || '').toLowerCase() !== 'active').length || 0;

  const activeWorkOrders = schedules?.filter((s: any) => s.status === 'active' || s.status === 'in_progress').length || 0;
  const pendingWorkOrders = schedules?.filter((s: any) => s.status === 'pending').length || 0;
  
  const isLarge = width >= 1366; 
  const isMedium = width >= 1024;
  const hasSidebar = width >= 768;
  
  const mainWidth = hasSidebar ? width - 280 : width;
  
  const singleColWidth = isLarge ? '31.5%' : isMedium ? '48%' : '100%';
  const doubleColWidth = isLarge ? '65%' : '100%';
  
  const largeChartWidth = isLarge ? (mainWidth * 0.65) - 80 : mainWidth - 80;
  const smallChartWidth = isLarge ? (mainWidth * 0.315) - 80 : isMedium ? (mainWidth * 0.48) - 80 : mainWidth - 80;

  // Define widgets in an array with categories, icons, and badges
  const allWidgets = [
    {
      id: 'repair-trends',
      title: 'Repair Priority Class Trends',
      category: 'Maintenance Categorization',
      icon: 'trending-up',
      iconColor: '#0EA5E9',
      badge: { text: '6M Trend', color: '#0284C7', bg: '#E0F2FE' },
      isLarge: true,
      content: (
        <ResponsiveLineChart
          data={repairTrendsData}
          width={largeChartWidth}
          height={280}
          color="#0EA5E9"
        />
      )
    },
    {
      id: 'service-reminders',
      title: 'Service Reminders',
      category: 'Service',
      icon: 'notifications-outline',
      iconColor: '#EF4444',
      badge: { text: 'Realtime', color: '#DC2626', bg: '#FEE2E2' },
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#EF444410', borderColor: '#EF444425' }]}>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>{overdueSchedules}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_overdue', 'Overdue')}</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B25' }]}>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{dueSoonSchedules}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_due_soon', 'Due Soon')}</Text>
          </View>
        </View>
      )
    },
    {
      id: 'time-to-resolve',
      title: 'Time to Resolve',
      category: 'Issues',
      icon: 'timer-outline',
      iconColor: '#6366F1',
      badge: { text: 'Days Avg', color: '#4F46E5', bg: '#EEF2FF' },
      isLarge: false,
      content: (
        <ResponsiveLineChart
          data={timeToResolveData}
          width={smallChartWidth}
          height={160}
          color="#6366F1"
        />
      )
    },
    {
      id: 'open-issues',
      title: 'Open Issues',
      category: 'Issues',
      icon: 'alert-circle-outline',
      iconColor: '#F59E0B',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B25' }]}>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{openIssuesCount}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_open', 'Open')}</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#10B98110', borderColor: '#10B98125' }]}>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>{resolvedIssuesCount}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_resolved', 'Resolved')}</Text>
          </View>
        </View>
      )
    },
    {
      id: 'vehicle-renewal',
      title: 'Vehicle Renewal Reminders',
      category: 'Vehicles',
      icon: 'calendar-outline',
      iconColor: '#EF4444',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#EF444410', borderColor: '#EF444425' }]}>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>{vehicleReminders.overdue}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_overdue', 'Overdue')}</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B25' }]}>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{vehicleReminders.soon}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_due_soon', 'Due Soon')}</Text>
          </View>
        </View>
      )
    },
    {
      id: 'active-work-orders',
      title: 'Active Work Orders',
      category: 'Service',
      icon: 'construct-outline',
      iconColor: '#0EA5E9',
      isLarge: false,
      content: (
        <>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#0EA5E9' }]} />
              <Text style={styles.listText}>{t('dash_status_open', 'Open')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.badgeText, { color: '#0284C7' }]}>{activeWorkOrders}</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.listText}>{t('dash_pending', 'Pending')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>{pendingWorkOrders}</Text></View>
          </View>
        </>
      )
    },
    {
      id: 'contact-renewal',
      title: 'Contact Renewal Reminders',
      category: 'Contacts',
      icon: 'people-outline',
      iconColor: '#8B5CF6',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#EF444410', borderColor: '#EF444425' }]}>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>{contactReminders.overdue}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_overdue', 'Overdue')}</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B25' }]}>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{contactReminders.soon}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_due_soon', 'Due Soon')}</Text>
          </View>
        </View>
      )
    },
    {
      id: 'vehicle-assignments',
      title: 'Vehicle Assignments',
      category: 'Vehicles',
      icon: 'key-outline',
      iconColor: '#10B981',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#10B98110', borderColor: '#10B98125' }]}>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>{assignedVehicles}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_assigned', 'Assigned')}</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={[styles.metricBubble, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B25' }]}>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{unassignedVehicles}</Text>
            </View>
            <Text style={styles.metricLabel}>{t('dash_status_unassigned', 'Unassigned')}</Text>
          </View>
        </View>
      )
    },
    {
      id: 'vehicle-status',
      title: 'Vehicle Status',
      category: 'Vehicles',
      icon: 'car-sport-outline',
      iconColor: '#0EA5E9',
      isLarge: false,
      content: (
        <>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.listText}>{t('dash_status_active', 'Active')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}><Text style={[styles.badgeText, { color: '#059669' }]}>{activeVehicles}</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.listText}>{t('dash_status_in_shop', 'In Shop')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>{inShopVehicles}</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.listText}>{t('dash_status_out_of_service', 'Out of Service')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#DC2626' }]}>{outOfServiceVehicles}</Text></View>
          </View>
        </>
      )
    },
    {
      id: 'equipment-status',
      title: 'Equipment Status',
      category: 'Equipment',
      icon: 'hardware-chip-outline',
      iconColor: '#10B981',
      isLarge: false,
      content: (
        <>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.listText}>{t('dash_status_in_service', 'In-Service')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}><Text style={[styles.badgeText, { color: '#059669' }]}>{equipmentActive}</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.listText}>{t('dash_status_out_of_service', 'Out-of-Service')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#DC2626' }]}>{equipmentInactive}</Text></View>
          </View>
        </>
      )
    },
    {
      id: 'vehicle-locations',
      title: 'Vehicle Locations',
      category: 'Vehicles',
      icon: 'location-outline',
      iconColor: '#0EA5E9',
      isLarge: false,
      content: (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={28} color="#CBD5E1" style={{ marginBottom: 6 }} />
          <Text style={styles.emptyText}>{t('dash_no_results', 'No Location Broadcasts')}</Text>
        </View>
      )
    },
    {
      id: 'critical-faults',
      title: 'Critical Faults',
      category: 'Issues',
      icon: 'warning-outline',
      iconColor: '#EF4444',
      badge: { 
        text: criticalFaults.length > 0 ? `${criticalFaults.length} Action Needed` : 'All Clear', 
        color: criticalFaults.length > 0 ? '#DC2626' : '#059669', 
        bg: criticalFaults.length > 0 ? '#FEE2E2' : '#DCFCE7' 
      },
      isLarge: false,
      content: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {criticalFaults.length > 0 ? (
            <View style={{ flex: 1 }}>
              {criticalFaults.slice(0, 2).map((fault: any) => {
                const details = getFaultDetails(fault);
                return (
                  <Pressable
                    key={fault.id}
                    onPress={() => router.push(`/(manager)/issues/${fault.id}` as any)}
                    style={({ hovered }: any) => [
                      styles.criticalFaultCard,
                      hovered && styles.criticalFaultCardHovered,
                      Platform.OS === 'web' && ({
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: hovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
                        boxShadow: hovered ? '0 8px 16px -4px rgba(220, 38, 38, 0.12)' : 'none',
                        borderColor: hovered ? '#FCA5A5' : '#FECACA',
                      } as any)
                    ]}
                  >
                    <View style={styles.faultTopRow}>
                      <View style={styles.faultTagGroup}>
                        <View style={styles.faultCategoryChip}>
                          <Ionicons name={details.icon} size={12} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.faultCategoryText}>{details.category}</Text>
                        </View>
                        <View style={styles.faultVehicleChip}>
                          <Ionicons name="car-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
                          <Text style={styles.faultVehicleText} numberOfLines={1}>{details.vehicle}</Text>
                        </View>
                      </View>
                      <View style={styles.faultUrgentBadge}>
                        <View style={styles.faultPulseDot} />
                        <Text style={styles.faultUrgentText}>CRITICAL</Text>
                      </View>
                    </View>

                    <Text style={styles.faultDescription} numberOfLines={2}>
                      {details.description}
                    </Text>

                    <View style={styles.faultFooterRow}>
                      <View style={styles.faultMetaLeft}>
                        <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.faultDateText}>{details.date}</Text>
                        {details.reporter && (
                          <>
                            <Text style={styles.faultMetaDot}>•</Text>
                            <Text style={styles.faultReporterText} numberOfLines={1}>{details.reporter}</Text>
                          </>
                        )}
                      </View>
                      <View style={styles.faultActionBtn}>
                        <Text style={styles.faultActionText}>Inspect</Text>
                        <Ionicons name="arrow-forward" size={11} color="#DC2626" style={{ marginLeft: 3 }} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}

              <View style={styles.faultCardFooter}>
                <Pressable 
                  onPress={() => router.push('/(manager)/issues' as any)}
                  style={({ hovered }: any) => [
                    styles.faultViewAllLink,
                    hovered && styles.faultViewAllLinkHovered
                  ]}
                >
                  <Text style={styles.faultViewAllText}>
                    {criticalFaults.length > 2 
                      ? `View all ${criticalFaults.length} issues in tracker` 
                      : 'Open Issues Manager'}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#DC2626" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.faultEmptyState}>
              <View style={styles.faultEmptyIconContainer}>
                <Ionicons name="shield-checkmark" size={26} color="#10B981" />
              </View>
              <Text style={styles.faultEmptyTitle}>Zero Critical Defects</Text>
              <Text style={styles.faultEmptySubtitle}>All fleet vehicles are operating within normal safety limits with no critical alarms.</Text>
              <View style={styles.faultEmptyStatusPill}>
                <View style={[styles.dot, { backgroundColor: '#10B981', marginRight: 6 }]} />
                <Text style={styles.faultEmptyStatusText}>Fleet Status: Safe & Ready</Text>
              </View>
            </View>
          )}
        </View>
      )
    },
    {
      id: 'fuel-costs',
      title: 'Fuel Costs',
      category: 'Cost',
      icon: 'flame-outline',
      iconColor: '#10B981',
      badge: { text: 'Expenditure', color: '#059669', bg: '#D1FAE5' },
      isLarge: false,
      content: (
        <ResponsiveBarChart
          data={fuelData}
          width={smallChartWidth}
          height={140}
          color="#10B981"
        />
      )
    },
    {
      id: 'fleet-invite',
      title: 'Driver Fleet Join Code',
      category: 'Team',
      icon: 'key-outline',
      iconColor: '#043094',
      badge: { text: 'Driver Onboarding', color: '#1E40AF', bg: '#DBEAFE' },
      isLarge: false,
      content: (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            Invite Code For Drivers
          </Text>
          <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#043094', letterSpacing: 2 }}>
              {fleetCode || 'AV-XXXXXX'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.dashboardCopyBtn, copied && { backgroundColor: '#16A34A' }]}
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
              {copied ? "Copied!" : "Copy Fleet Code"}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 12, lineHeight: 16, paddingHorizontal: 16 }}>
            Share this with drivers so they can sign up independently on the Driver App.
          </Text>
        </View>
      )
    }
  ];

  // Filter widgets based on hidden state and search query
  const filteredWidgets = allWidgets.filter(widget => 
    !hiddenWidgets.includes(widget.id) &&
    widget.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleWidget = (id: string) => {
    if (hiddenWidgets.includes(id)) {
      setHiddenWidgets(prev => prev.filter(wId => wId !== id));
    } else {
      setHiddenWidgets(prev => [...prev, id]);
    }
  };

  // Group widgets by category for the modal
  const groupedWidgets = allWidgets.reduce((acc: any, widget) => {
    if (!acc[widget.category]) acc[widget.category] = [];
    acc[widget.category].push(widget);
    return acc;
  }, {});

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t('dash_title', 'My Dashboard')}</Text>
          <Text style={styles.subtitle}>Fleet telemetry, maintenance benchmarks and live performance</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TouchableOpacity 
            style={[
              styles.fleetCodeChip,
              copied && styles.fleetCodeChipSuccess,
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              } as any)
            ]}
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <View style={styles.fleetCodeChipIcon}>
              <Ionicons name="key" size={13} color="#043094" />
            </View>
            <Text style={styles.fleetCodeChipLabel}>Fleet Code:</Text>
            <Text style={styles.fleetCodeChipCode}>{fleetCode || '...'}</Text>
            <Ionicons 
              name={copied ? "checkmark-circle" : "copy-outline"} 
              size={14} 
              color={copied ? "#16A34A" : "#64748B"} 
              style={{ marginLeft: 4 }} 
            />
          </TouchableOpacity>

          <Pressable 
            style={[
              styles.manageButton,
              Platform.OS === 'web' && ({
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                backgroundColor: isManageHovered ? '#F8FAFC' : '#FFFFFF',
                transform: isManageHovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
                boxShadow: isManageHovered ? '0 6px 16px rgba(15, 23, 42, 0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
                borderColor: isManageHovered ? '#0EA5E9' : '#E2E8F0',
              } as any)
            ]} 
            onHoverIn={() => setIsManageHovered(true)}
            onHoverOut={() => setIsManageHovered(false)}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="grid-outline" size={16} color={isManageHovered ? '#0EA5E9' : '#475569'} style={{ marginRight: 6 }} />
            <Text style={[styles.manageButtonText, isManageHovered && { color: '#0EA5E9' }]}>{t('dash_manage_widgets', 'Manage Widgets')}</Text>
            <Ionicons name="chevron-down" size={16} color={isManageHovered ? '#0EA5E9' : '#64748B'} style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {filteredWidgets.length === 0 ? (
          <View style={[styles.emptyState, { width: '100%', marginTop: 40 }]}>
            <Text style={{ fontSize: 16, color: '#64748B' }}>{t('dash_no_widgets', 'No widgets found matching')} "{searchQuery}"</Text>
          </View>
        ) : (
          filteredWidgets.map(widget => (
            <DashboardCard 
              key={widget.id} 
              title={widget.title}
              icon={widget.icon}
              iconColor={widget.iconColor}
              badge={widget.badge}
              style={{ 
                width: (widget.isLarge && filteredWidgets.length > 1) ? doubleColWidth : singleColWidth, 
                minHeight: widget.isLarge ? 360 : undefined 
              }}
            >
              {widget.content}
            </DashboardCard>
          ))
        )}
      </View>
    </ScrollView>

    <Modal visible={modalVisible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.dropdownContent}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Customize Dashboard</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
            {Object.keys(groupedWidgets).map(category => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {groupedWidgets[category].map((widget: any) => {
                  const isVisible = !hiddenWidgets.includes(widget.id);
                  return (
                    <TouchableOpacity 
                      key={widget.id} 
                      style={styles.modalItem}
                      onPress={() => toggleWidget(widget.id)}
                    >
                      <Ionicons 
                        name={isVisible ? "checkbox" : "square-outline"} 
                        size={20} 
                        color={isVisible ? "#0ea5e9" : "#CBD5E1"} 
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.modalItemText, !isVisible && { color: '#94A3B8' }]}>{widget.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '400' },
  manageButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 16, 
    paddingVertical: 9, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 2, 
    elevation: 1 
  },
  manageButtonText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 14, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 3, 
    elevation: 2 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  chart: { marginTop: 10, alignSelf: 'center' },
  metricsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    marginTop: 8, 
    paddingBottom: 8 
  },
  metricItem: { 
    alignItems: 'center' 
  },
  metricBubble: {
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: { 
    fontSize: 34, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricLabel: { 
    fontSize: 12, 
    color: '#64748B', 
    fontWeight: '500',
  },
  listRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC' 
  },
  listLeft: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  listText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  emptyText: { color: '#94A3B8', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.2)' },
  dropdownContent: { 
    position: 'absolute', 
    top: 75, 
    right: 24, 
    width: 320, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    maxHeight: 520, 
    shadowColor: '#0F172A', 
    shadowOffset: { width: 0, height: 16 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 24, 
    elevation: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalList: { flexGrow: 1 },
  categoryGroup: { marginBottom: 14 },
  categoryTitle: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#94A3B8', 
    marginBottom: 8, 
    marginTop: 4, 
    textTransform: 'uppercase', 
    letterSpacing: 0.6 
  },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  modalItemText: { fontSize: 13, color: '#334155', fontWeight: '500' },

  // Critical Faults Card styles
  criticalFaultCard: {
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  criticalFaultCardHovered: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  faultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  faultTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  faultCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  faultCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  faultVehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 140,
  },
  faultVehicleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  faultUrgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  faultPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  faultUrgentText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  faultDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 10,
  },
  faultFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faultMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faultDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  faultMetaDot: {
    fontSize: 11,
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  faultReporterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 110,
  },
  faultActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  faultActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  faultCardFooter: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  faultViewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  faultViewAllLinkHovered: {
    backgroundColor: '#FEE2E250',
  },
  faultViewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginRight: 2,
  },
  faultEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  faultEmptyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  faultEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  faultEmptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
    maxWidth: 240,
    lineHeight: 16,
  },
  faultEmptyStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  faultEmptyStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  
  // Fleet Code Quick Chip in Dashboard Header
  fleetCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  fleetCodeChipSuccess: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  fleetCodeChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  fleetCodeChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  fleetCodeChipCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#043094',
    letterSpacing: 0.5,
  },
  dashboardCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
