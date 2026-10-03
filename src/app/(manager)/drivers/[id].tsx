import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FormModal, { FormField } from '../../../components/FormModal';
import { usePersonnel } from '../../../context/PersonnelContext';

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { personnel, updatePerson } = usePersonnel();
  const driver = personnel.find(p => p.id === id) || {
    id: id as string,
    name: 'Unknown Driver',
    status: 'Inactive',
    vehicle: 'Unassigned',
    licenseExp: '-',
    licenseNumber: '-',
    score: 0,
    phone: '-',
    email: '-',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
    joinedDate: '-',
  };

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('Activity');

  const editFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. John Smith', required: true, defaultValue: driver.name },
    { name: 'email', label: 'Email Address', type: 'text', placeholder: 'e.g. email@company.com', defaultValue: driver.email },
    { name: 'phone', label: 'Phone Number', type: 'text', placeholder: '(555) 000-0000', defaultValue: driver.phone },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'], defaultValue: driver.status },
    { name: 'licenseExp', label: 'License Expiry', type: 'text', placeholder: 'YYYY-MM-DD', defaultValue: driver.licenseExp },
    { name: 'vehicle', label: 'Assigned Vehicle', type: 'text', placeholder: 'e.g. AP101', defaultValue: driver.vehicle },
  ];

  const handleSaveEdit = (data: any) => {
    updatePerson(driver.id, data);
    setIsEditModalVisible(false);
    if (Platform.OS === 'web') window.alert("Profile updated successfully!");
    else Alert.alert("Success", "Profile updated successfully!");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backBtnText}>Back to Drivers</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={18} color="#4B5563" />
            <Text style={styles.secondaryBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Profile Section */}
      <View style={styles.profileCard}>
        <View style={[styles.profileHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Image source={{ uri: driver.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileTitleContainer}>
            <Text style={styles.profileName}>{driver.name}</Text>
            <View style={styles.badgesRow}>
              <Text style={styles.idBadge}>{driver.id}</Text>
              <View style={[styles.statusBadge, driver.status === 'Active' ? styles.statusActive : styles.statusInactive]}>
                <Text style={[styles.statusText, driver.status === 'Active' ? styles.statusActiveText : styles.statusInactiveText]}>
                  {driver.status}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.scoreBadge, isMobile && { marginTop: 15 }]}>
            <Text style={styles.scoreLabel}>Safety Score</Text>
            <Text style={styles.scoreValue}>{driver.score}</Text>
          </View>
        </View>
        
        <View style={[styles.infoGrid, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.infoColumn, isMobile && { borderRightWidth: 0, borderBottomWidth: 1 }]}>
            <Text style={styles.columnTitle}>Contact Information</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{driver.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{driver.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>Joined {driver.joinedDate}</Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.columnTitle}>Assignment & License</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="car-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>Vehicle: {driver.vehicle}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>License: {driver.licenseNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="warning-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>Expires: {driver.licenseExp}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs / Sub-Sections */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity onPress={() => setActiveTab('Activity')}>
          <Text style={activeTab === 'Activity' ? styles.tabActive : styles.tabInactive}>Recent Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('Inspections')}>
          <Text style={activeTab === 'Inspections' ? styles.tabActive : styles.tabInactive}>Inspections</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('Documents')}>
          <Text style={activeTab === 'Documents' ? styles.tabActive : styles.tabInactive}>Documents</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityCard}>
        {activeTab === 'Activity' && [
          { id: 'INS-1042', title: 'Completed pre-trip inspection', time: 'Today, 8:00 AM', icon: 'checkmark-circle', route: '/(manager)/inspections/INS-1042' },
          { id: 2, title: 'Assigned to Vehicle AP101', time: 'Yesterday, 2:30 PM', icon: 'swap-horizontal', route: '/(manager)/assignments/1' },
          { id: 3, title: 'Speeding alert triggered', time: 'Oct 14, 2024, 11:15 AM', icon: 'alert-circle', color: '#EF4444', route: '/(manager)/alerts' },
        ].map((act, index) => (
          <TouchableOpacity 
            key={act.id} 
            style={[styles.activityRow, index !== 0 && { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}
            onPress={() => act.route ? router.push(act.route as any) : null}
            disabled={!act.route}
          >
            <Ionicons name={act.icon as any} size={24} color={act.color || '#3B82F6'} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{act.title}</Text>
              <Text style={styles.activityTime}>{act.time}</Text>
            </View>
            {act.route && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
          </TouchableOpacity>
        ))}

        {activeTab === 'Inspections' && [
          { id: 'INS-1042', vehicle: driver.vehicle, date: 'Today, 8:00 AM', status: 'Passed', defects: 0 },
          { id: 'INS-1020', vehicle: driver.vehicle, date: 'Oct 12, 2024, 6:30 AM', status: 'Failed', defects: 2 },
          { id: 'INS-0995', vehicle: driver.vehicle, date: 'Oct 10, 2024, 7:00 AM', status: 'Passed', defects: 0 },
        ].map((ins, index) => (
          <TouchableOpacity 
            key={ins.id} 
            style={[styles.activityRow, index !== 0 && { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}
            onPress={() => router.push(`/(manager)/inspections/${ins.id}` as any)}
          >
            <View style={{ width: 40, alignItems: 'center' }}>
              <Ionicons name={ins.status === 'Passed' ? 'checkmark-circle' : 'close-circle'} size={24} color={ins.status === 'Passed' ? '#10B981' : '#EF4444'} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Inspection {ins.id} • {ins.vehicle}</Text>
              <Text style={styles.activityTime}>{ins.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: ins.status === 'Passed' ? '#10B981' : '#EF4444' }}>{ins.status}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{ins.defects} defects</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}

        {activeTab === 'Documents' && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text style={{ color: '#6B7280', marginTop: 12 }}>No documents found for this driver.</Text>
          </View>
        )}
      </View>


      <FormModal 
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        title="Edit Driver Profile"
        fields={editFields}
        onSubmit={handleSaveEdit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1000, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  secondaryBtnText: { color: '#4B5563', fontWeight: '500', fontSize: 14 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 24 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, marginRight: 20 },
  profileTitleContainer: { flex: 1 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  idBadge: { backgroundColor: '#F3F4F6', color: '#4B5563', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#DEF7EC' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusActiveText: { color: '#03543F' },
  statusInactiveText: { color: '#4B5563' },
  
  scoreBadge: { alignItems: 'center', backgroundColor: '#F0FDF4', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  scoreLabel: { fontSize: 12, color: '#166534', fontWeight: '600', marginBottom: 4 },
  scoreValue: { fontSize: 28, fontWeight: '800', color: '#15803D' },
  
  infoGrid: { flexDirection: 'row' },
  infoColumn: { flex: 1, padding: 24, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  columnTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoText: { fontSize: 14, color: '#374151' },
  
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 20, gap: 24 },
  tabActive: { fontSize: 16, fontWeight: '600', color: '#043094', paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#043094' },
  tabInactive: { fontSize: 16, fontWeight: '500', color: '#6B7280', paddingBottom: 12 },
  
  activityCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 20 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, gap: 16 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 4 },
  activityTime: { fontSize: 13, color: '#6B7280' },
});
