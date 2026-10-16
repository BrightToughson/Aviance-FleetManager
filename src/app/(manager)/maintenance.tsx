import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import SummaryBox from '../../components/SummaryBox';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

import { useVehicles } from '../../context/VehicleContext';

export default function MaintenanceScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();
  const { user } = useUser();
  const { vehicles } = useVehicles();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (vehicles && vehicles.length > 0 && !newVehicleId) {
      setNewVehicleId(vehicles[0].id);
    }
  }, [vehicles]);

  const fetchRequests = async () => {
    if (!user?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const myVehicleIds = (vehicles || []).map((v: any) => v.id);

      if (myVehicleIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          vehicles ( name, make, model, license_plate )
        `)
        .in('vehicle_id', myVehicleIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching maintenance requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [vehicles]);

  const updateStatus = async (id: string, newStatus: string, vehicleId: string) => {
    try {
      const { error: updError } = await supabase
        .from('maintenance_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (updError) throw updError;

      // If resolved, put vehicle back to active
      if (newStatus === 'resolved') {
        await supabase.from('vehicles').update({ status: 'active' }).eq('id', vehicleId);
        
        const req = requests.find(r => r.id === id);
        if (req && req.description.startsWith('Flagged from Issue #')) {
          const issueIdPrefix = req.description.substring(20, 28);
          // Fetch in-progress issues for this vehicle
          const { data: vehicleIssues } = await supabase.from('issues')
            .select('id')
            .eq('vehicle_id', vehicleId)
            .eq('status', 'in_progress');
            
          const targetIssue = vehicleIssues?.find(i => i.id.startsWith(issueIdPrefix));
          if (targetIssue) {
            await supabase.from('issues').update({ status: 'resolved' }).eq('id', targetIssue.id);
          }
        }
      } else if (newStatus === 'in_progress') {
        // Just in case, ensure it's in maintenance
        await supabase.from('vehicles').update({ status: 'maintenance' }).eq('id', vehicleId);

        // Also move it to the services table!
        const req = requests.find(r => r.id === id);
        if (req) {
          const { error: srvError } = await supabase.from('services').insert([{
            vehicle_id: vehicleId,
            status: 'scheduled', // Matches "Needs Service" in Services tab
            tasks: `From Maintenance Request: ${req.description}`,
            service_date: new Date().toISOString().split('T')[0]
          }]);
          if (srvError) {
            console.error('Error inserting into services:', srvError);
            throw srvError;
          }
        }
      }

      fetchRequests();
      if (Platform.OS === 'web') window.alert('Status updated successfully');
      else Alert.alert('Success', 'Status updated successfully');
    } catch (err) {
      console.error('Error updating status:', err);
      if (Platform.OS === 'web') window.alert('Failed to update status');
      else Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleAddMaintenance = async () => {
    if (!newVehicleId || !newDescription.trim()) {
      if (Platform.OS === 'web') window.alert('Please select a vehicle and enter a description');
      else Alert.alert('Error', 'Please select a vehicle and enter a description');
      return;
    }
    
    try {
      const { error } = await supabase.from('maintenance_requests').insert([{
        vehicle_id: newVehicleId,
        driver_id: user?.id || 'system',
        description: newDescription.trim(),
        status: 'pending'
      }]);
      
      if (error) throw error;
      
      setIsModalVisible(false);
      setNewDescription('');
      fetchRequests();
      
      if (Platform.OS === 'web') window.alert('Maintenance request created');
      else Alert.alert('Success', 'Maintenance request created');
    } catch (err) {
      console.error('Error creating maintenance request:', err);
      if (Platform.OS === 'web') window.alert('Failed to create request');
      else Alert.alert('Error', 'Failed to create request');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!searchQuery) return true;
    const v = r.vehicles?.name || r.vehicles?.license_plate || '';
    return v.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>{t('m_maintenance_title', 'Maintenance')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_maintenance_subtitle', 'Manage grounded vehicles and repair workflows')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>New Maintenance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#4B5563' }]} onPress={fetchRequests}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('m_refresh', 'Refresh')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SummaryBox items={[
        { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, icon: 'time', color: '#F59E0B' },
        { label: 'In Progress', count: requests.filter(r => r.status === 'in_progress').length, icon: 'build', color: '#3B82F6' },
        { label: 'Resolved', count: requests.filter(r => r.status === 'resolved').length, icon: 'checkmark-circle', color: '#10B981' }
      ]} />

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search vehicles or issues..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.listContainer}>
          {loading && <Text style={{ padding: 20 }}>Loading requests...</Text>}
          {!loading && filteredRequests.length === 0 && <Text style={{ padding: 20 }}>No maintenance requests found.</Text>}
          {!loading && filteredRequests.map((req) => (
            <TouchableOpacity 
              key={req.id} 
              style={styles.issueCard}
              onPress={() => router.push(`/(manager)/maintenance-details?id=${req.id}`)}
            >
              <View style={[styles.priorityStrip, { 
                backgroundColor: req.status === 'pending' ? '#EF4444' : req.status === 'in_progress' ? '#F59E0B' : '#10B981' 
              }]} />
              
              <View style={styles.issueCardContent}>
                <View style={styles.issueHeader}>
                  <View style={styles.issueIdBadge}>
                    <Text style={styles.issueIdText}>{req.id.slice(0, 8)}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    req.status === 'resolved' ? styles.statusSuccess : 
                    req.status === 'in_progress' ? styles.statusWarning : 
                    styles.statusDanger
                  ]}>
                    <Text style={[
                      styles.statusText,
                      req.status === 'resolved' ? styles.statusSuccessText : 
                      req.status === 'in_progress' ? styles.statusWarningText : 
                      styles.statusDangerText
                    ]}>{req.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.issueTitle} numberOfLines={2}>{req.description}</Text>
                
                <View style={styles.issueDetailsRow}>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="car-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{req.vehicles?.name || req.vehicles?.license_plate || 'Unknown Vehicle'}</Text>
                  </View>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{new Date(req.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>

                {req.status !== 'resolved' && (
                  <View style={styles.actionRow}>
                    {req.status === 'pending' && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(req.id, 'in_progress', req.vehicle_id)}>
                        <Text style={styles.actionBtnText}>Send to Shop (In Progress)</Text>
                      </TouchableOpacity>
                    )}
                    {req.status === 'in_progress' && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => updateStatus(req.id, 'resolved', req.vehicle_id)}>
                        <Text style={styles.actionBtnText}>Mark Resolved & Reactivate Vehicle</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && { width: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Maintenance Request</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Vehicle</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newVehicleId}
                    onValueChange={(val) => setNewVehicleId(val)}
                    style={styles.picker}
                  >
                    {vehicles.map((v: any) => (
                      <Picker.Item key={v.id} label={`${v.name} (${v.license_plate})`} value={v.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Maintenance Description</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Describe the maintenance required..."
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                  // @ts-ignore
                  outlineStyle="none"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddMaintenance}>
                <Text style={styles.saveBtnText}>Create Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  primaryBtn: { backgroundColor: '#043094', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  issueCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  priorityStrip: { width: 6 },
  issueCardContent: { flex: 1, padding: 16 },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueIdBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  issueIdText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  issueTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  issueDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  issueDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  issueDetailText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  actionRow: { flexDirection: 'row', marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusWarning: { backgroundColor: '#DBEAFE' },
  statusDanger: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusSuccessText: { color: '#059669' },
  statusWarningText: { color: '#1D4ED8' },
  statusDangerText: { color: '#DC2626' },
  actionBtn: { backgroundColor: '#043094', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: 500, maxHeight: '80%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  picker: { height: 48, width: '100%', borderWidth: 0, backgroundColor: 'transparent' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', color: '#111827' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
