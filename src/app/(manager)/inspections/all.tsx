import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FormModal, { FormField } from '../../../components/FormModal';

import { useInspections } from '../../../context/InspectionContext';

export default function AllInspectionsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { inspections, addInspection } = useInspections();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const inspectionsWithDefects = useMemo(() => inspections.map(i => ({
    ...i,
    defects: i.checklist ? Object.values(i.checklist).filter(passed => !passed).length : 0
  })), [inspections]);

  const filteredInspections = useMemo(() => {
    if (!searchQuery) return inspectionsWithDefects;
    const lowerQuery = searchQuery.toLowerCase();
    return inspectionsWithDefects.filter(i => 
      (i.vehicle || '').toLowerCase().includes(lowerQuery) || 
      (i.driver || '').toLowerCase().includes(lowerQuery) ||
      (i.id || '').toLowerCase().includes(lowerQuery)
    );
  }, [inspectionsWithDefects, searchQuery]);

  const handleAddInspection = async (data: any) => {
    await addInspection({
      status: data.status === 'Defect Found' ? 'Flagged' : data.status === 'Fail' ? 'Failed' : 'Passed',
      notes: `Vehicle: ${data.vehicle}, Driver: ${data.driver}`,
      vehicle: data.vehicle,
      type: 'Manual',
    });
    setIsModalVisible(false);
  };

  const handleAction = (id: string) => {
    router.push(`/(manager)/inspections/${id}` as any);
  };

  const modalFields: FormField[] = [
    { name: 'vehicle', label: 'Vehicle ID', type: 'text', required: true, placeholder: 'e.g. TRK-99' },
    { name: 'driver', label: 'Driver Name', type: 'text', required: true, placeholder: 'e.g. John Smith' },
    { name: 'status', label: 'Inspection Result', type: 'select', options: ['Pass', 'Defect Found', 'Fail'] },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#4B5563" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.pageTitle}>All Inspections</Text>
            <Text style={styles.pageSubtitle}>Complete history of vehicle inspections</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="clipboard-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Log Inspection</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        
        <View style={styles.actionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search by vehicle or driver..." 
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
              <Text style={[styles.th, { flex: 1.2 }]}>Type</Text>
              <Text style={[styles.th, { flex: 1.8 }]}>Vehicle</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Driver</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Date & Time</Text>
              <Text style={[styles.th, { flex: 1 }]}>Defects</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>
              <View style={{ width: 40 }} />
            </View>
          )}

          {filteredInspections.map((inspection, index) => (
            <TouchableOpacity 
              key={inspection.id} 
              style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredInspections.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => handleAction(inspection.id)}
            >
              
              <View style={[styles.td, { flex: isMobile ? undefined : 1.2 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Type</Text>}
                <Text style={[styles.cellText, { fontWeight: '600', color: '#043094' }]} numberOfLines={1}>{inspection.type || 'Daily DVIR'}</Text>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Vehicle</Text>}
                <Text style={[styles.cellText, { fontWeight: '600' }]}>{inspection.vehicle}</Text>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Driver</Text>}
                <Text style={styles.cellText}>{inspection.driver}</Text>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Date</Text>}
                <Text style={styles.cellText}>{inspection.date}</Text>
              </View>
              
              <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Defects</Text>}
                <View style={[styles.defectBadge, inspection.defects > 0 && styles.defectBadgeActive]}>
                   <Text style={[styles.defectText, inspection.defects > 0 && styles.defectTextActive]}>{inspection.defects}</Text>
                </View>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Status</Text>}
                <View style={[
                  styles.statusBadge, 
                  inspection.status === 'Passed' ? styles.statusPassed : 
                  inspection.status === 'Failed' ? styles.statusFailed : 
                  styles.statusWarning
                ]}>
                  <Text style={[
                    styles.statusText,
                    inspection.status === 'Passed' ? styles.statusPassedText : 
                    inspection.status === 'Failed' ? styles.statusFailedText : 
                    styles.statusWarningText
                  ]}>{inspection.status}</Text>
                </View>
              </View>

              {!isMobile && (
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              )}
              
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <FormModal 
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Log DVIR Inspection"
        fields={modalFields}
        onSubmit={handleAddInspection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#4B5563', fontSize: 14, fontWeight: '500', marginLeft: 4 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  primaryBtn: { backgroundColor: '#043094', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  
  contentScroll: { flex: 1 },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', minWidth: 0 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  td: { justifyContent: 'center', minWidth: 0 },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8, alignItems: 'center' },
  mobileLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', width: 100 },
  cellText: { fontSize: 14, color: '#111827' },
  
  defectBadge: { backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  defectBadgeActive: { backgroundColor: '#FEE2E2' },
  defectText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  defectTextActive: { color: '#EF4444' },
  
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPassed: { backgroundColor: '#D1FAE5' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusWarning: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusPassedText: { color: '#065F46' },
  statusFailedText: { color: '#991B1B' },
  statusWarningText: { color: '#92400E' },
});
