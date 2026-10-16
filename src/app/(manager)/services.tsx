import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormModal, { FormField } from '../../components/FormModal';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';

import { useServices } from '../../context/ServicesContext';
import { useTranslation } from 'react-i18next';

export default function ServicesScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();

  const { services, addService, updateService } = useServices();
  const [activeTab, setActiveTab] = useState<'RO' | 'Requests'>('RO');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [roModalVisible, setRoModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const filteredServices = useMemo(() => {
    let list = services;
    if (activeTab === 'Requests') {
      list = services.filter(s => s.status === 'Needs Service');
    } else {
      list = services.filter(s => s.status !== 'Needs Service');
    }

    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(s => 
      s.vehicle.toLowerCase().includes(lowerQuery) || 
      (s.vendor && s.vendor.toLowerCase().includes(lowerQuery)) ||
      (s.tasks && s.tasks.toLowerCase().includes(lowerQuery))
    );
  }, [services, searchQuery, activeTab]);

  const handleAddService = (data: any) => {
    if (data.vehicle === 'No pending requests') {
      if (Platform.OS === 'web') window.alert('Please create a request first.');
      else Alert.alert('Error', 'Please create a request first.');
      return;
    }
    const existingReq = services.find(s => s.status === 'Needs Service' && s.vehicle === data.vehicle);
    if (existingReq) {
      updateService(existingReq.id, {
        vendor: data.vendor || 'In-House',
        tasks: data.task || existingReq.tasks,
        cost: data.cost ? `GH₵${data.cost}` : 'GH₵0.00',
        status: 'Approved',
        id: `RO-90${Math.floor(Math.random() * 100)}`
      });
    } else {
      addService({
        vehicle: data.vehicle || 'Unknown',
        vendor: data.vendor || 'In-House',
        tasks: data.task || 'General Service',
        cost: data.cost ? `GH₵${data.cost}` : 'GH₵0.00',
        status: 'Approved'
      });
    }
    setIsModalVisible(false);
    setActiveTab('RO');
  };

  const handleMakeRO = (id: string) => {
    router.push(`/(manager)/services/new-ro?requestId=${id}`);
  };

  const handleAction = (id: string) => {
    router.push(`/(manager)/services/${id}` as any);
  };

  const pendingVehicles = Array.from(new Set(services.filter(s => s.status === 'Needs Service').map(s => s.vehicle)));

  const modalFields: FormField[] = [
    { name: 'vehicle', label: 'Vehicle ID (from requests)', type: 'select', required: true, options: pendingVehicles.length ? pendingVehicles : ['No pending requests'] },
    { name: 'vendor', label: 'Vendor/Shop', type: 'text', placeholder: 'e.g. Jiffy Lube' },
    { name: 'task', label: 'Service Task', type: 'text', required: true, placeholder: 'e.g. Oil Change' },
    { name: 'cost', label: 'Total Cost (GH₵)', type: 'number', placeholder: '150.00' },
  ];

  const requestFields: FormField[] = [
    { name: 'vehicle', label: 'Vehicle ID', type: 'text', required: true, placeholder: 'e.g. TRK-99' },
    { name: 'task', label: 'Service Details', type: 'text', required: true, placeholder: 'What needs to be serviced?' }
  ];

  const handleCreateRequest = (data: any) => {
    addService({
      vehicle: data.vehicle,
      vendor: 'Pending Assignment',
      tasks: data.task,
      cost: 'GH₵0.00',
      status: 'Needs Service'
    });
    setRequestModalVisible(false);
    setActiveTab('Requests');
  };

  const makeRoFields: FormField[] = [
    { name: 'vendor', label: 'Vendor/Shop', type: 'text', required: true, placeholder: 'e.g. Jiffy Lube' },
    { name: 'cost', label: 'Total Cost (GH₵)', type: 'number', placeholder: '150.00' },
    { name: 'status', label: 'Approval Status', type: 'select', options: ['Approved', 'Pending Approval'] },
  ];

  const handleSubmitRO = (data: any) => {
    updateService(selectedRequestId, {
      vendor: data.vendor,
      cost: data.cost ? `GH₵${data.cost}` : 'GH₵0.00',
      status: data.status || 'Pending Approval',
      id: `RO-90${Math.floor(Math.random() * 100)}`
    });
    setRoModalVisible(false);
    setActiveTab('RO');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>{t('m_services_title', 'Services & ROs')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_services_subtitle', 'Track maintenance, repair orders, and service costs')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]} onPress={() => router.push('/(manager)/services/new-request')}>
            <Ionicons name="add" size={20} color="#374151" />
            <Text style={[styles.primaryBtnText, { color: '#374151' }]}>{t('m_services_create_req', 'Create Request')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/services/new-ro')}>
            <Ionicons name="build" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('m_services_create_ro', 'Create RO')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SummaryBox items={[
        { label: t('m_services_pending', 'Pending Approvals'), count: services.filter(s => s.status === 'Pending Approval').length, icon: 'time', color: '#F59E0B' },
        { label: t('m_services_monthly_cost', 'Monthly Cost'), count: 'GH₵0.00', icon: 'cash', color: '#ffffff' },
        { label: t('m_services_cost_mile', 'Cost / Mile'), count: 'GH₵0.00', icon: 'speedometer', color: '#34D399' }
      ]} />

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'RO' && styles.tabActive]} onPress={() => setActiveTab('RO')}>
          <Text style={[styles.tabText, activeTab === 'RO' && styles.tabTextActive]}>{t('m_services_tab_ro', 'Repair Orders')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Requests' && styles.tabActive]} onPress={() => setActiveTab('Requests')}>
          <Text style={[styles.tabText, activeTab === 'Requests' && styles.tabTextActive]}>{t('m_services_tab_requests', 'Service Requests')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('m_services_search_ph', 'Search by vehicle, vendor, or task...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>{t('m_services_ro_th', 'RO #')}</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>{t('m_services_vehicle_th', 'Vehicle')}</Text>
            <Text style={[styles.th, { flex: 2 }]}>{t('m_services_vendor_tasks_th', 'Vendor / Tasks')}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{t('m_services_date_th', 'Date')}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{t('m_services_cost_th', 'Cost')}</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>{t('m_services_status_th', 'Status')}</Text>
            <View style={{ width: 100 }} />
          </View>
        )}

        {filteredServices.map((srv, index) => (
          <TouchableOpacity 
            key={srv.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredServices.length - 1 && { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => handleAction(srv.id)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>{t('m_services_ro_th', 'RO #')}</Text>}
              <Text style={[styles.cellText, { fontWeight: '600', color: '#043094' }]}>{srv.id}</Text>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>{t('m_services_vehicle_th', 'Vehicle')}</Text>}
              <Text style={[styles.cellText, { fontWeight: '600' }]}>{srv.vehicle}</Text>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && styles.mobileDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-end' }]}>
              {isMobile && <Text style={[styles.mobileLabel, { alignSelf: 'flex-start' }]}>{t('m_services_vendor_tasks_th', 'Vendor & Tasks')}</Text>}
              <View style={!isMobile && { paddingRight: 20 }}>
                <Text style={styles.cellText}>{srv.vendor}</Text>
                <Text style={[styles.cellText, { fontSize: 12, color: '#6B7280', marginTop: 2 }]}>{srv.tasks}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>{t('m_services_date_th', 'Date')}</Text>}
              <Text style={styles.cellText}>{srv.date || 'N/A'}</Text>
            </View>
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>{t('m_services_cost_th', 'Cost')}</Text>}
              <Text style={[styles.cellText, { fontWeight: '600' }]}>{srv.cost}</Text>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>{t('m_services_status_th', 'Status')}</Text>}
              <View style={[
                styles.statusBadge, 
                srv.status === 'Completed' ? styles.statusSuccess : 
                srv.status === 'Needs Service' ? styles.statusDanger : styles.statusWarning
              ]}>
                <Text style={[
                  styles.statusText,
                  srv.status === 'Completed' ? styles.statusSuccessText : 
                  srv.status === 'Needs Service' ? styles.statusDangerText : styles.statusWarningText
                ]}>{srv.status}</Text>
              </View>
            </View>

            <View style={!isMobile ? { width: 100, alignItems: 'center', justifyContent: 'center' } : { marginTop: 12, width: '100%' }}>
              {activeTab === 'Requests' ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, isMobile && { width: '100%', alignItems: 'center' }]} 
                  onPress={(e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    handleMakeRO(srv.id);
                  }}
                >
                  <Text style={styles.actionBtnText}>{t('m_services_make_ro_btn', 'Make RO')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={isMobile ? styles.mobileActionBtn : undefined}>
                  {isMobile ? (
                    <Text style={styles.mobileActionBtnText}>{t('m_services_view_details', 'View Details')}</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  )}
                </View>
              )}
            </View>
            
          </TouchableOpacity>
        ))}
      </View>
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
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statsGridMobile: { flexDirection: 'column' },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statCardMobile: { width: '100%' },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#111827' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827', outlineStyle: 'none' } as any,
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 },
  td: { justifyContent: 'center' },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  mobileLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  cellText: { fontSize: 14, color: '#374151' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusWarning: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusSuccessText: { color: '#059669' },
  statusWarningText: { color: '#D97706' },
  statusDanger: { backgroundColor: '#FEE2E2' },
  statusDangerText: { color: '#DC2626' },
  tabsContainer: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 20 },
  tab: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#043094' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#043094', fontWeight: '600' },
  actionBtn: { backgroundColor: '#043094', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  mobileActionBtn: { backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 6, alignItems: 'center', width: '100%' },
  mobileActionBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});


