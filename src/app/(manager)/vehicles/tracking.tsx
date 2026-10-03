import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TrackingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Live Tracking</Text>
      </View>

      {/* Main Tracking Area */}
      <View style={styles.mapArea}>
        <View style={styles.mockMapContainer}>
          <Text style={styles.mockMapText}>Interactive Map Viewer</Text>
          <Text style={styles.mockMapSubtext}>Live GPS locations will render here via react-native-maps</Text>
          
          <View style={styles.vehicleMarker}>
            <Ionicons name="car" size={16} color="#fff" />
          </View>
        </View>

        {/* Driver Profile Card */}
        <View style={styles.driverCard}>
          <View style={styles.driverHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>JD</Text></View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>John Doe</Text>
              <Text style={styles.driverRole}>Senior Operator</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.statusText, { color: '#10B981' }]}>Active</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>AB104 (Bobcat)</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Speed</Text>
              <Text style={styles.detailValue}>24 mph</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>Atlanta Site B</Text>
            </View>
          </View>

          <View style={styles.purposeBox}>
            <Text style={styles.purposeLabel}>Stated Purpose</Text>
            <Text style={styles.purposeText}>Transporting heavy equipment to Site B for ground clearing operations. Expected return 16:00.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  mapArea: { flex: 1, position: 'relative' },
  mockMapContainer: { flex: 1, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  mockMapText: { fontSize: 24, fontWeight: 'bold', color: '#94A3B8' },
  mockMapSubtext: { fontSize: 14, color: '#94A3B8', marginTop: 10 },
  vehicleMarker: { position: 'absolute', top: '45%', left: '48%', backgroundColor: '#0EA5E9', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  driverCard: { position: 'absolute', bottom: 30, left: '50%', transform: [{ translateX: -300 }], width: 600, backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, maxWidth: '90%' },
  driverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#2563EB', fontWeight: 'bold', fontSize: 18 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  driverRole: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 15, marginBottom: 15 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  purposeBox: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 8 },
  purposeLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  purposeText: { fontSize: 14, color: '#374151', lineHeight: 20 },
});
