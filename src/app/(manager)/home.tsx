import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, Clipboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServices } from '../../context/ServicesContext';
import { useVehicles } from '../../context/VehicleContext';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/expo';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { services } = useServices();
  const { vehicles } = useVehicles();
  const { user } = useUser();
  const pendingROs = services.filter(s => s.status === 'Pending Approval');
  const { width } = useWindowDimensions();
  const isLarge = width >= 1024;
  const hasSidebar = width >= 768;
  const mainWidth = hasSidebar ? width - 280 : width;

  const [fleetCode, setFleetCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrCreateFleetCode() {
      if (!user) return;
      
      // 1. Fetch profile
      const { data, error } = await supabase
        .from('profiles')
        .select('fleet_code')
        .eq('id', user.id)
        .single();
        
      if (data?.fleet_code) {
        setFleetCode(data.fleet_code);
      } else {
        // 2. Generate new code if missing
        // Using a custom character set to avoid confusing characters like 0, O, 1, I, and L
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let randomPart = '';
        for (let i = 0; i < 6; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const newCode = 'AV-' + randomPart;
        
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            is_manager: true,
            role: 'manager',
            full_name: user.fullName || 'Manager',
            email: user.primaryEmailAddress?.emailAddress,
            fleet_code: newCode
          }, { onConflict: 'id' });
          
        setFleetCode(newCode);
      }
    }
    
    loadOrCreateFleetCode();
  }, [user]);

  const copyCode = () => {
    if (fleetCode) {
      if (Platform.OS === 'web') {
        navigator.clipboard.writeText(fleetCode);
        window.alert('Code copied to clipboard!');
      } else {
        Clipboard.setString(fleetCode);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isLarge && { padding: 40 }]}>
      
      {/* Fleet Code Banner */}
      <View style={[styles.section, isLarge && styles.largeSection, { 
        backgroundColor: '#EEF2FF', 
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E7FF',
      }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ backgroundColor: '#E0E7FF', padding: 4, borderRadius: 6, marginRight: 8 }}>
                <Ionicons name="key" size={16} color="#4F46E5" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#312E81' }}>Your Fleet Invite Code</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#4338CA', lineHeight: 18 }}>
              Share this unique code with your drivers to instantly link their accounts to your fleet.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={copyCode}
            style={{ 
              backgroundColor: '#FFFFFF', 
              paddingHorizontal: 16, 
              paddingVertical: 10, 
              borderRadius: 10, 
              flexDirection: 'row', 
              alignItems: 'center', 
              shadowColor: '#4F46E5', 
              shadowOffset: {width: 0, height: 2}, 
              shadowOpacity: 0.1, 
              shadowRadius: 4, 
              elevation: 2,
              borderWidth: 1,
              borderColor: '#E0E7FF'
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#4F46E5', marginRight: 8, letterSpacing: 1 }}>{fleetCode || '...'}</Text>
            <Ionicons name="copy" size={18} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, isLarge && styles.largeSection]}>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/vehicles/scan')}>
            <Ionicons name="car-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>{t('m_home_plate_lookup', 'Plate Lookup')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/inspections')}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>{t('m_home_inspections', 'Inspections')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/issues')}>
            <Ionicons name="warning-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>{t('m_home_issues', 'Issues')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(manager)/vehicles/add')}>
            <Ionicons name="add-circle-outline" size={28} color="#10B981" />
            <Text style={styles.gridText}>{t('m_home_add_vehicle', 'Add Vehicle')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ROs Needing Approval */}
      <View style={[styles.section, isLarge && styles.largeSection]}>
        <Text style={styles.sectionTitle}>{t('m_home_ros_approval', 'ROs Needing Approval')}</Text>
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
                  <Text style={styles.viewBadgeText}>{t('m_home_view', 'View')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>{t('m_home_no_ros', 'No ROs currently pending approval.')}</Text>
        )}
      </View>

      {/* Recent Vehicles */}
      <View style={[styles.section, isLarge && styles.largeSection]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('m_home_recent_vehicles', 'Recent Vehicles')}</Text>
          <TouchableOpacity onPress={() => router.push('/(manager)/vehicles')}>
            <Text style={styles.viewAllText}>{t('m_home_view_all', 'View All')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listCard}>
          {vehicles.slice(0, 3).map((vehicle: any, index: number) => (
            <TouchableOpacity key={vehicle.id} style={[styles.listItem, index === 2 && styles.lastListItem]} onPress={() => router.push(`/(manager)/vehicles/${vehicle.id}` as any)}>
              {vehicle.image ? (
                <Image source={{ uri: vehicle.image }} style={styles.vehicleImg} />
              ) : (
                <View style={[styles.vehicleImg, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="car" size={24} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleCode}>{vehicle.name || vehicle.plate}</Text>
                <Text style={styles.vehicleName}>{vehicle.year} {vehicle.make}</Text>
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


