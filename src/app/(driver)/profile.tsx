import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';

export default function DriverProfileScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [locationTracking, setLocationTracking] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImagePlaceholder}>
          <Text style={styles.profileImageText}>D</Text>
        </View>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.role}>Driver</Text>
        <Text style={styles.email}>driver@aviance.com</Text>
        
        <View style={styles.badgeContainer}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active Duty</Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 20, backgroundColor: '#fff', paddingBottom: 0 }}>
        <SummaryBox items={[
          { label: 'Trips', count: 142, icon: 'map', color: '#3B82F6' },
          { label: 'Rating', count: '4.9', icon: 'star', color: '#F59E0B' },
          { label: 'Safety', count: '98%', icon: 'shield-checkmark', color: '#10B981' }
        ]} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="notifications-outline" size={20} color="#4B5563" />
            <Text style={styles.rowText}>Push Notifications</Text>
          </View>
          <Switch 
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="location-outline" size={20} color="#4B5563" />
            <Text style={styles.rowText}>Background Location</Text>
          </View>
          <Switch 
            value={locationTracking}
            onValueChange={setLocationTracking}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="document-text-outline" size={20} color="#4B5563" />
            <Text style={styles.rowText}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#4B5563" />
            <Text style={styles.rowText}>Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={() => router.replace('/(auth)/sign-in' as any)}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  role: {
    fontSize: 16,
    color: '#D97706',
    fontWeight: '500',
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  badgeContainer: {
    marginTop: 16,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
