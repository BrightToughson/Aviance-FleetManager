import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAssignments } from '../../../context/AssignmentsContext';

export default function AssignmentDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const { assignments } = useAssignments();

  const assignment = assignments.find(a => a.id === id);

  if (!assignment) {
    return <View style={styles.container}><Text style={{padding:20}}>{t('common_loading', 'Loading...')}</Text></View>;
  }

  const driverAssignments = assignments.filter(a => a.driverId === assignment.driverId && a.id !== id);
  const completedAssignments = driverAssignments.filter(a => a.status === 'Completed').map(a => ({
    id: a.id,
    date: a.date,
    route: t('assign_route_format', '{{pickup}} to {{dropoff}}', { pickup: a.pickupLocation, dropoff: a.dropoffLocation }),
    time: `${a.startTime} - ${a.endTime}`,
    stops: 1
  }));

  const data = {
    id: assignment.id,
    driverName: assignment.driverName || t('common_unassigned', 'Unassigned'),
    driverImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
    licenseNumber: t('common_pending', 'Pending...'),
    licenseExp: t('common_pending', 'Pending...'),
    vehicleAssigned: assignment.vehicle,
    status: assignment.status,
    currentAssignment: {
      id: assignment.id,
      route: t('assign_route_format', '{{pickup}} to {{dropoff}}', { pickup: assignment.pickupLocation, dropoff: assignment.dropoffLocation }),
      time: `${assignment.startTime} - ${assignment.endTime}`,
      stops: 1,
      completedStops: assignment.status === 'Completed' ? 1 : 0,
      notes: assignment.notes || t('assign_no_notes', 'No notes provided.'),
    },
    completedAssignments
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backBtnText}>{t('assign_back', 'Back to Assignments')}</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.statusText, { color: '#1D4ED8' }]}>{t(`assign_status_${data.status.toLowerCase().replace(' ', '_')}`, data.status)}</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={[styles.profileHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Image source={{ uri: data.driverImage }} style={styles.profileAvatar} />
          <View style={styles.profileTitleContainer}>
            <Text style={styles.profileName}>{data.driverName}</Text>
            <Text style={styles.profileSubtitle}>{t('driver_lbl_license_prefix', 'License: ')}{data.licenseNumber} ({t('driver_lbl_exp_prefix', 'Expires: ')}{data.licenseExp})</Text>
          </View>
          <View style={[styles.vehicleBadge, isMobile && { marginTop: 15 }]}>
            <Ionicons name="car" size={20} color="#043094" />
            <Text style={styles.vehicleText}>{data.vehicleAssigned}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('assign_current_title', 'Current Assignment')}</Text>
      <TouchableOpacity 
        style={styles.currentAssignmentCard}
        onPress={() => router.push({ pathname: '/(manager)/assignments/task/[taskId]', params: { taskId: data.currentAssignment.id } })}
      >
        <View style={styles.currentAssignmentHeader}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Ionicons name="map" size={24} color="#059669" style={{ marginTop: 2 }} />
            <View>
              <Text style={styles.currentRouteTitle}>{data.currentAssignment.route}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.currentTime}>{data.currentAssignment.time}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressLabel}>{t('assign_progress', 'Progress')}</Text>
            <Text style={styles.progressValue}>{t('assign_stops_progress', '{{completed}} of {{total}} Stops', { completed: data.currentAssignment.completedStops, total: data.currentAssignment.stops })}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(data.currentAssignment.completedStops / data.currentAssignment.stops) * 100}%` }]} />
          </View>
        </View>
        
        <View style={styles.notesContainer}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          <Text style={styles.notesText}>{data.currentAssignment.notes}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('assign_completed_title', 'Completed Assignments')}</Text>
      <View style={styles.completedCard}>
        {data.completedAssignments.map((assignment, index) => (
          <TouchableOpacity 
            key={assignment.id} 
            style={[styles.completedRow, index !== 0 && { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}
            onPress={() => router.push({ pathname: '/(manager)/assignments/task/[taskId]', params: { taskId: assignment.id } })}
          >
            <View style={styles.completedDateCol}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.completedDate}>{assignment.date}</Text>
            </View>
            <View style={styles.completedInfoCol}>
              <Text style={styles.completedRoute}>{assignment.route}</Text>
              <Text style={styles.completedDetails}>{assignment.time} • {t('assign_stops_count', '{{count}} Stops', { count: assignment.stops })}</Text>
            </View>
            <View style={styles.completedStatusCol}>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1000, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },

  profileCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 32, padding: 24 },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, marginRight: 20 },
  profileTitleContainer: { flex: 1 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  
  vehicleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', gap: 8 },
  vehicleText: { fontSize: 15, fontWeight: '600', color: '#1E3A8A' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, marginTop: 10 },
  
  currentAssignmentCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 24, marginBottom: 32 },
  currentAssignmentHeader: { marginBottom: 20 },
  currentRouteTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  currentTime: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  
  progressContainer: { marginBottom: 20 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  progressValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#059669', borderRadius: 4 },
  
  notesContainer: { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, alignItems: 'flex-start', gap: 8, borderWidth: 1, borderColor: '#FEF3C7' },
  notesText: { fontSize: 14, color: '#92400E', flex: 1, lineHeight: 20 },

  completedCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 40 },
  completedRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  completedDateCol: { flexDirection: 'row', alignItems: 'center', width: 140, gap: 8 },
  completedDate: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  completedInfoCol: { flex: 1 },
  completedRoute: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  completedDetails: { fontSize: 13, color: '#6B7280' },
  completedStatusCol: { width: 40, alignItems: 'flex-end' }
});
