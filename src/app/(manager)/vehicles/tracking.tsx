import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function TrackingScreen() {
  const router = useRouter();
  const [activeTrackers, setActiveTrackers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accra, Ghana default coordinates
  const initialRegion = {
    latitude: 5.6037,
    longitude: -0.1870,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    async function fetchTrackingData() {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select(`
            id, make, model, license_plate,
            profiles:current_driver_id (
              id, full_name, avatar_url, status, role
            )
          `)
          .not('current_driver_id', 'is', null);

        if (error) throw error;
        
        // Only get active drivers
        const active = data?.filter((v: any) => v.profiles?.status === 'Active') || [];
        setActiveTrackers(active);
      } catch (err) {
        console.error("Error fetching tracking data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrackingData();
  }, []);

  const activeDriver = activeTrackers.length > 0 ? activeTrackers[0] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(manager)/vehicles')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Live Tracking</Text>
      </View>

      {/* Main Tracking Area */}
      <View style={styles.mapArea}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, backgroundColor: '#E2E8F0' }}>
            {React.createElement('iframe', {
              src: activeDriver 
                ? `https://www.openstreetmap.org/export/embed.html?bbox=-0.2870,5.5037,-0.0870,5.7037&layer=mapnik&marker=5.6037,-0.1870`
                : `https://www.openstreetmap.org/export/embed.html?bbox=-0.2870,5.5037,-0.0870,5.7037&layer=mapnik`,
              style: { width: '100%', height: '100%', border: 'none' },
              title: "Live Tracking Map"
            })}
          </View>
        ) : (
          <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
            {activeDriver && (
              <Marker 
                coordinate={{ latitude: 5.6037, longitude: -0.1870 }} 
                title={activeDriver.profiles.full_name} 
                description={`${activeDriver.make} ${activeDriver.model}`}
              >
                <View style={styles.vehicleMarker}>
                  <Ionicons name="car" size={16} color="#fff" />
                </View>
              </Marker>
            )}
          </MapView>
        )}

        {/* Driver Profile Card */}
        <View style={styles.driverCard}>
          {loading ? (
            <Text style={{ textAlign: 'center', padding: 20 }}>Loading live tracking data...</Text>
          ) : activeDriver ? (
            <>
              <View style={styles.driverHeader}>
                {activeDriver.profiles.avatar_url ? (
                  <Image source={{ uri: activeDriver.profiles.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{activeDriver.profiles.full_name?.charAt(0) || 'D'}</Text>
                  </View>
                )}
                
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{activeDriver.profiles.full_name}</Text>
                  <Text style={styles.driverRole}>Assigned Driver</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.statusText, { color: '#10B981' }]}>Active</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>{activeDriver.make} {activeDriver.model}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Plate Number</Text>
                  <Text style={styles.detailValue}>{activeDriver.license_plate || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Speed</Text>
                  <Text style={styles.detailValue}>0 mph</Text>
                </View>
              </View>

              <View style={styles.purposeBox}>
                <Text style={styles.purposeLabel}>Last Known Location</Text>
                <Text style={styles.purposeText}>GPS coordinates will sync when the driver starts their mobile app trip.</Text>
              </View>
            </>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="car-sport-outline" size={40} color="#9CA3AF" />
              <Text style={{ marginTop: 10, fontSize: 16, color: '#4B5563', fontWeight: '500' }}>No active vehicles on the road.</Text>
              <Text style={{ marginTop: 5, fontSize: 14, color: '#6B7280', textAlign: 'center' }}>Assign a driver to a vehicle to start tracking their live location.</Text>
            </View>
          )}
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
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
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
