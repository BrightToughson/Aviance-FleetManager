import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import { usePersonnel } from '../../../../context/PersonnelContext';

export default function AssignDriverScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768 && width < 1024;
  const isSmallScreen = width < 768;

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<any>(null);
  const [currentDriver, setCurrentDriver] = useState<any>(null);
  const [unassignedDrivers, setUnassignedDrivers] = useState<any[]>([]);
  const [assigningDriverId, setAssigningDriverId] = useState<string | null>(null);

  const { personnel } = usePersonnel();

  useEffect(() => {
    fetchData();
  }, [id, personnel]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Vehicle
      const { data: vData, error: vError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (vError) throw vError;
      setVehicle(vData);

      // 2. Fetch Current Driver (if any)
      if (vData.current_driver_id) {
        const cDriver = personnel.find(p => p.id === vData.current_driver_id);
        if (cDriver) {
          // Fetch assignments done count
          const { count } = await supabase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', cDriver.id)
            .eq('status', 'completed');
            
          setCurrentDriver({
            ...cDriver,
            full_name: cDriver.name,
            avatar_url: cDriver.avatar,
            assignmentsCompleted: count || 0,
            joinedDate: cDriver.joinedDate
          });
        }
      }

      // 3. Fetch all drivers who do NOT have a vehicle assigned
      // Get fleet drivers from context
      const fleetDrivers = personnel.filter(p => p.role === 'Driver' && p.isProfile);
        
      // Get all vehicle current driver ids
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('current_driver_id')
        .not('current_driver_id', 'is', null);
        
      const assignedIds = new Set(allVehicles?.map(v => v.current_driver_id) || []);
      
      const available = fleetDrivers.filter(d => !assignedIds.has(d.id)).map(d => ({
        id: d.id,
        full_name: d.name,
        email: d.email,
        avatar_url: d.avatar
      }));
      
      setUnassignedDrivers(available);

    } catch (err) {
      console.error(err);
      if (Platform.OS === 'web') window.alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (driverId: string) => {
    try {
      setAssigningDriverId(driverId);
      
      // Update vehicle's current driver
      const { error } = await supabase
        .from('vehicles')
        .update({ current_driver_id: driverId })
        .eq('id', id);
        
      if (error) throw error;

      // Send alert to new driver
      await supabase.from('alerts').insert({
        title: 'Vehicle Assigned',
        body: `You have been assigned to ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}).`,
        type: 'assignment'
        // Wait, alerts doesn't have a user_id or profile_id column. It's global in this schema.
        // If it's global, we will just add it, but usually alerts belong to someone.
        // Assuming global table for now as per schema.
      });

      if (Platform.OS === 'web') {
        window.alert("Driver successfully assigned!");
      } else {
        Alert.alert("Success", "Driver assigned to vehicle");
      }
      
      // Go back to vehicles list or vehicle details
      router.back();
    } catch (err) {
      console.error(err);
      if (Platform.OS === 'web') window.alert("Error assigning driver");
    } finally {
      setAssigningDriverId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#043094" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentDriver ? 'Reassign Vehicle' : 'Assign Driver to Vehicle'}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { padding: isSmallScreen ? 16 : 32 }]}>
        <View style={[styles.grid, { flexDirection: isLargeScreen ? 'row' : 'column', gap: isSmallScreen ? 20 : 32 }]}>
          {/* Left Column: Vehicle & Current Driver Info */}
          <View style={[styles.leftColumn, { width: isLargeScreen ? '35%' : '100%', maxWidth: isLargeScreen ? 450 : '100%' }]}>
            {/* Vehicle Details */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="car-outline" size={20} color="#043094" />
                </View>
                <Text style={styles.cardTitle}>Vehicle Details</Text>
              </View>
              {vehicle?.image_url && (vehicle.image_url.includes('supabase') || vehicle.image_url.startsWith('file')) ? (
                <Image source={{ uri: vehicle.image_url }} style={styles.vehicleImage} />
              ) : (
                <View style={styles.vehiclePlaceholderPremium}>
                  <Ionicons name="car-sport" size={72} color="#818CF8" />
                  <View style={styles.vehiclePlaceholderBadge}>
                    <Text style={styles.vehiclePlaceholderBadgeText}>{vehicle?.make || 'Fleet'}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.vehicleName}>{vehicle?.make} {vehicle?.model}</Text>
              <Text style={styles.vehiclePlate}>{vehicle?.license_plate}</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Year:</Text>
                <Text style={styles.infoValue}>{vehicle?.year}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>VIN:</Text>
                <Text style={styles.infoValue}>{vehicle?.vin || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={styles.infoValue}>{vehicle?.status}</Text>
              </View>
            </View>

            {/* Current Driver Details (if any) */}
            {currentDriver && (
              <View style={[styles.card, { marginTop: 24 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="person-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.cardTitle}>Current Driver</Text>
                </View>
                <View style={styles.driverProfile}>
                  {currentDriver.avatar_url ? (
                    <Image source={{ uri: currentDriver.avatar_url }} style={styles.driverAvatarLarge} />
                  ) : (
                    <View style={styles.driverAvatarLargePlaceholder}>
                      <Text style={{ color: '#fff', fontSize: 24 }}>{currentDriver.full_name?.charAt(0) || 'D'}</Text>
                    </View>
                  )}
                  <View style={{ marginLeft: 16 }}>
                    <Text style={styles.driverNameLarge}>{currentDriver.full_name}</Text>
                    <Text style={styles.driverEmail}>{currentDriver.email}</Text>
                  </View>
                </View>
                
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{currentDriver.assignmentsCompleted}</Text>
                    <Text style={styles.statLabel}>Assignments Done</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{currentDriver.joinedDate}</Text>
                    <Text style={styles.statLabel}>Joined Date</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Right Column: Available Drivers */}
          <View style={[styles.rightColumn, { width: isLargeScreen ? '65%' : '100%' }]}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="people-outline" size={20} color="#059669" />
                </View>
                <Text style={styles.cardTitle}>Available Unassigned Drivers</Text>
              </View>
              
              {unassignedDrivers.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconWrapper}>
                    <Ionicons name="people" size={40} color="#818CF8" />
                  </View>
                  <Text style={styles.emptyStateTitle}>No Available Drivers</Text>
                  <Text style={styles.emptyStateText}>Every driver in your fleet is currently assigned to a vehicle.</Text>
                  
                  <TouchableOpacity style={styles.inviteBtn} onPress={() => router.push('/(manager)/drivers/new')}>
                    <Ionicons name="person-add" size={18} color="#043094" style={{marginRight: 8}} />
                    <Text style={styles.inviteBtnText}>Invite a New Driver</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.driverList}>
                  {unassignedDrivers.map(driver => (
                    <View key={driver.id} style={styles.driverRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {driver.avatar_url ? (
                          <Image source={{ uri: driver.avatar_url }} style={styles.driverAvatarSmall} />
                        ) : (
                          <View style={styles.driverAvatarSmallPlaceholder}>
                            <Text style={{ color: '#fff', fontSize: 16 }}>{driver.full_name?.charAt(0) || 'D'}</Text>
                          </View>
                        )}
                        <View style={{ marginLeft: 12 }}>
                          <Text style={styles.driverRowName}>{driver.full_name}</Text>
                          <Text style={styles.driverRowEmail}>{driver.email || 'No email'}</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.assignBtn}
                        onPress={() => handleAssign(driver.id)}
                        disabled={assigningDriverId === driver.id}
                      >
                        {assigningDriverId === driver.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.assignBtnText}>Assign</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 32,
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  grid: {
    gap: 32,
  },
  leftColumn: {
    // Flex controlled via inline styles for responsiveness
  },
  rightColumn: {
    // Flex controlled via inline styles for responsiveness
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  vehicleImage: {
    width: '100%',
    maxWidth: 340,
    height: 160,
    alignSelf: 'center',
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  vehiclePlaceholderPremium: {
    width: '100%',
    maxWidth: 340,
    height: 160,
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#E0E7FF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  vehiclePlaceholderBadge: {
    marginTop: 12,
    backgroundColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vehiclePlaceholderBadgeText: {
    color: '#3730A3',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverAvatarLargePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  driverEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#043094',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyStateIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  inviteBtnText: {
    color: '#043094',
    fontWeight: '700',
    fontSize: 15,
  },
  driverList: {
    flexDirection: 'column',
    gap: 16,
  },
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  driverAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  driverAvatarSmallPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  driverRowEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  assignBtn: {
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  assignBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
