import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServices } from '../../context/ServicesContext';

// Dummy Data
const RECENT_VEHICLES = [
  { id: 'v1', code: 'AP101', name: '2016 Ford F-150', image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
  { id: 'v2', code: 'AC106CON', name: '2022 Toyota Sienna', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
  { id: 'v3', code: 'AC109CON', name: '2015 Toyota Sienna', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { services } = useServices();
  const pendingROs = services.filter(s => s.status === 'Pending Approval');
  const { width } = useWindowDimensions();
  const isLarge = width >= 1024;
  const hasSidebar = width >= 768;
  const mainWidth = hasSidebar ? width - 280 : width;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isLarge && { padding: 40 }]}>
      
      {/* Quick Actions */}
      <View style={[styles.section, isLarge && styles.largeSection]}>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/vehicles/scan')}>
            <Ionicons name="barcode-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>Scan Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/inspections')}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>Inspections</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/issues')}>
            <Ionicons name="warning-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>Issues</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/vehicles/add')}>
            <Ionicons name="add-circle-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ROs Needing Approval */}
      <View style={[styles.section, isLarge && styles.largeSection]}>
        <Text style={styles.sectionTitle}>ROs Needing Approval</Text>
        {pendingROs.length > 0 ? (
          pendingROs.map((ro) => (
            <TouchableOpacity 
              key={ro.id} 
              style={[styles.roCard, { marginBottom: 10 }]} 
              onPress={() => router.push(`/(manager)/services/${ro.id}`)}
            >
              <View style={styles.roHeader}>
                <View style={styles.roIconBox}>
                  <Ionicons name="car-sport" size={16} color="#6B7280" />
                </View>
                <Text style={styles.roCode}>{ro.vehicle} ({ro.id})</Text>
              </View>
              <View style={styles.roBodyRow}>
                <View style={styles.roInfo}>
                  <Text style={styles.roPrice}>{ro.cost} - <Text style={styles.roVendor}>{ro.vendor}</Text></Text>
                  <Text style={styles.roDate}>{ro.date} • {ro.tasks}</Text>
                </View>
                <View style={styles.viewBadge}>
                  <Text style={styles.viewBadgeText}>View</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>No ROs currently pending approval.</Text>
        )}
      </View>

      {/* Recent Vehicles */}
      <View style={[styles.section, isLarge && styles.largeSection]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Vehicles</Text>
          <TouchableOpacity onPress={() => router.push('/(manager)/vehicles')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listCard}>
          {RECENT_VEHICLES.map((vehicle, index) => (
            <TouchableOpacity key={vehicle.id} style={[styles.listItem, index === RECENT_VEHICLES.length - 1 && styles.lastListItem]} onPress={() => router.push(`/(manager)/vehicles/${vehicle.id}`)}>
              <Image source={{ uri: vehicle.image }} style={styles.vehicleImg} />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleCode}>{vehicle.code}</Text>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 30,
  },
  largeSection: {
    maxWidth: 800,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gridText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  roCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roIconBox: {
    width: 24,
    height: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  roCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  roBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roInfo: {
    flex: 1,
    paddingRight: 15,
  },
  roPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roVendor: {
    fontWeight: '400',
    color: '#4B5563',
  },
  roDate: {
    fontSize: 13,
    color: '#EF4444',
  },
  viewBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastListItem: {
    borderBottomWidth: 0,
  },
  vehicleImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 15,
    backgroundColor: '#F3F4F6',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 13,
    color: '#6B7280',
  },
});


