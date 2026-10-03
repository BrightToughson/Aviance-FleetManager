import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAssignments } from '../../../../context/AssignmentsContext';
let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { assignments } = useAssignments();

  // Try to find the assignment in the context first
  const contextTask = assignments.find(a => a.id === taskId);

  // Mock task detail fallback
  const task = contextTask ? {
    id: contextTask.id,
    date: new Date(contextTask.date).toLocaleDateString(),
    pickup: contextTask.pickupLocation,
    dropoff: contextTask.dropoffLocation,
    pickupCoords: contextTask.pickupCoords || { latitude: 5.556, longitude: -0.2012 },
    dropoffCoords: contextTask.dropoffCoords || { latitude: 5.560, longitude: -0.1810 },
    time: `${new Date(contextTask.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(contextTask.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    status: contextTask.status,
    stops: 2,
    completedStops: contextTask.status === 'Completed' ? 2 : 0,
    vehicle: contextTask.vehicle,
    driverName: contextTask.driverName,
    notes: contextTask.notes || 'No special instructions provided.',
  } : {
    id: taskId,
    date: 'Oct 26, 2024',
    pickup: 'Accra Central',
    dropoff: 'Osu',
    pickupCoords: { latitude: 5.556, longitude: -0.2012 },
    dropoffCoords: { latitude: 5.560, longitude: -0.1810 },
    time: '03:00 PM - 07:00 PM',
    status: taskId === 'curr1' ? 'In Progress' : 'Completed',
    stops: 12,
    completedStops: taskId === 'curr1' ? 4 : 12,
    vehicle: 'Toyota Sienna (ABC-9876)',
    driverName: 'John Doe',
    notes: 'Handle with care for stops 3 and 4. Deliveries must be completed before 7 PM.',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'Completed': return { bg: '#D1FAE5', text: '#059669' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusColor(task.status).text }]}>{task.status}</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>Task Details</Text>

      <View style={styles.card}>
          <MapView 
          style={styles.mapPreview}
          initialRegion={{
            latitude: (task.pickupCoords.latitude + task.dropoffCoords.latitude) / 2,
            longitude: (task.pickupCoords.longitude + task.dropoffCoords.longitude) / 2,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          <Marker coordinate={task.pickupCoords} title="Pickup" description={task.pickup} pinColor="green" />
          <Marker coordinate={task.dropoffCoords} title="Drop-off" description={task.dropoff} pinColor="red" />
          <Polyline 
            coordinates={[task.pickupCoords, task.dropoffCoords]} 
            strokeColor="#059669" 
            strokeWidth={3} 
          />
        </MapView>
        <View style={styles.cardContent}>
          <View style={styles.routeHeader}>
            <Ionicons name="map" size={24} color="#059669" />
            <Text style={styles.routeTitle}>{task.pickup} to {task.dropoff}</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{task.date}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Time Window</Text>
                <Text style={styles.infoValue}>{task.time}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="car-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Assigned Vehicle</Text>
                <Text style={styles.infoValue}>{task.vehicle}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Driver</Text>
                <Text style={styles.infoValue}>{task.driverName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Route Progress</Text>
              <Text style={styles.progressValue}>{task.completedStops} of {task.stops} Stops</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(task.completedStops / task.stops) * 100}%`, backgroundColor: task.status === 'Completed' ? '#059669' : '#1D4ED8' }]} />
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Notes & Instructions</Text>
      <View style={styles.notesCard}>
        <Ionicons name="document-text-outline" size={24} color="#D97706" />
        <Text style={styles.notesText}>{task.notes}</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerRowMobile: { paddingBottom: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 32 },
  mapPreview: { width: '100%', height: 200, backgroundColor: '#E5E7EB' },
  cardContent: { padding: 24 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  routeTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginBottom: 32 },
  infoItem: { flexDirection: 'row', width: 200, alignItems: 'flex-start' },
  infoIcon: { marginTop: 2, marginRight: 12 },
  infoLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  
  progressContainer: { marginTop: 10 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 15, color: '#4B5563', fontWeight: '500' },
  progressValue: { fontSize: 15, color: '#111827', fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  notesCard: { backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7', padding: 20, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  notesText: { fontSize: 15, color: '#92400E', lineHeight: 24, flex: 1, fontWeight: '500' }
});
