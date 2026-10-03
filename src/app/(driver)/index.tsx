import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAssignments } from '../../context/AssignmentsContext';
import { useInspections } from '../../context/InspectionContext';

export default function DriverDashboard() {
  const router = useRouter();
  const { assignments, acceptAssignment, rejectAssignment } = useAssignments();
  const { inspections } = useInspections();

  // Check if today's Pre-Trip inspection is done
  const todayString = new Date().toISOString().split('T')[0];
  const hasCompletedToday = inspections.some(i => i.date === todayString && i.type === 'Pre-Trip');

  // Show the first pending assignment
  const pendingAssignment = assignments.find(a => a.status === 'Pending');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>Good morning, Driver</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      {/* Active Vehicle Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Assigned Vehicle</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
        <View style={styles.vehicleInfoRow}>
          <Ionicons name="car-outline" size={40} color="#043094" />
          <View style={styles.vehicleDetails}>
            <Text style={styles.vehicleName}>2022 Ford Transit</Text>
            <Text style={styles.vehiclePlate}>Plate: XYZ-1234</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={[styles.actionButton, hasCompletedToday && { opacity: 0.7 }]} 
          onPress={() => {
            if (hasCompletedToday) {
              // Optionally route to log or show alert
              router.push('/(driver)/inspections' as any);
            } else {
              router.push('/(driver)/new-inspection' as any);
            }
          }}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: hasCompletedToday ? '#D1FAE5' : '#E0E7FF' }]}>
            <Ionicons name={hasCompletedToday ? "checkmark-circle" : "clipboard"} size={28} color={hasCompletedToday ? "#059669" : "#4338CA"} />
          </View>
          <Text style={styles.actionText}>{hasCompletedToday ? "Checklist Completed" : "Pre-Trip Inspection"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(driver)/issues' as any)}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="warning" size={28} color="#DC2626" />
          </View>
          <Text style={styles.actionText}>Report Issue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(driver)/profile' as any)}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="person" size={28} color="#D97706" />
          </View>
          <Text style={styles.actionText}>My Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="map" size={28} color="#059669" />
          </View>
          <Text style={styles.actionText}>Route Map</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Tasks */}
      <Text style={styles.sectionTitle}>Today's Schedule</Text>
      <View style={styles.card}>
        <View style={styles.taskItem}>
          <View style={styles.taskTimeContainer}>
            <Text style={styles.taskTime}>08:00 AM</Text>
          </View>
          <View style={styles.taskDetails}>
            <Text style={styles.taskTitle}>Pre-Trip Inspection</Text>
            <Text style={styles.taskDesc}>Complete before starting route</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        </View>
        <View style={[styles.taskItem, { borderBottomWidth: 0 }]}>
          <View style={styles.taskTimeContainer}>
            <Text style={styles.taskTime}>09:00 AM</Text>
          </View>
          <View style={styles.taskDetails}>
            <Text style={styles.taskTitle}>Delivery Route A</Text>
            <Text style={styles.taskDesc}>Downtown Area - 15 stops</Text>
          </View>
          <Ionicons name="radio-button-off" size={24} color="#9CA3AF" />
        </View>
      </View>

      {/* Pending Assignment Modal */}
      <Modal visible={!!pendingAssignment} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="notifications" size={28} color="#D97706" />
              </View>
              <Text style={styles.modalTitle}>New Assignment!</Text>
            </View>
            
            {pendingAssignment && (
              <View style={styles.assignmentDetails}>
                <Text style={styles.assignmentRoute}>{pendingAssignment.pickupLocation} → {pendingAssignment.dropoffLocation}</Text>
                
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {new Date(pendingAssignment.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(pendingAssignment.endTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="car-outline" size={18} color="#6B7280" />
                  <Text style={styles.detailText}>{pendingAssignment.vehicle}</Text>
                </View>
                
                {pendingAssignment.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{pendingAssignment.notes}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectAssignment(pendingAssignment?.id!)}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptAssignment(pendingAssignment?.id!)}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleDetails: {
    marginLeft: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  vehiclePlate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskTimeContainer: {
    width: 70,
  },
  taskTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  taskDetails: {
    flex: 1,
    paddingHorizontal: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  taskDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  assignmentDetails: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  assignmentRoute: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' },
  detailText: { fontSize: 15, color: '#4B5563', marginLeft: 8, fontWeight: '500' },
  notesBox: { marginTop: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8 },
  notesText: { color: '#92400E', fontSize: 14, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  rejectBtnText: { color: '#4B5563', fontSize: 16, fontWeight: 'bold' },
  acceptBtn: { flex: 1, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
