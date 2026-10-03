import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';

const DUMMY_INSPECTIONS = [
  { id: 'INS-1042', vehicle: 'AP101', driver: 'John Smith', date: '2024-05-14 06:30 AM', status: 'Passed', defects: 0 },
  { id: 'INS-1043', vehicle: 'AC106CON', driver: 'Sarah Connor', date: '2024-05-14 07:15 AM', status: 'Failed', defects: 3 },
  { id: 'INS-1044', vehicle: 'TRK-99', driver: 'Emily Davis', date: '2024-05-13 08:00 AM', status: 'Pass w/ Defects', defects: 1 },
  { id: 'INS-1045', vehicle: 'AP105', driver: 'Mike Johnson', date: '2024-05-13 06:45 AM', status: 'Passed', defects: 0 },
];

export default function InspectionsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [inspections, setInspections] = useState(DUMMY_INSPECTIONS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInspections = useMemo(() => {
    if (!searchQuery) return inspections;
    const lowerQuery = searchQuery.toLowerCase();
    return inspections.filter(i => 
      i.vehicle.toLowerCase().includes(lowerQuery) || 
      i.driver.toLowerCase().includes(lowerQuery) ||
      i.id.toLowerCase().includes(lowerQuery)
    );
  }, [inspections, searchQuery]);

  const handleAction = (id: string) => {
    router.push(`/(manager)/inspections/${id}` as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Inspections (DVIR)</Text>
          <Text style={styles.pageSubtitle}>Daily vehicle inspection reports and compliance logs</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/inspections/all' as any)}>
          <Ionicons name="list-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>All Inspections</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Today', count: 12, icon: 'calendar', color: '#ffffff' },
        { label: 'Passed', count: 10, icon: 'checkmark-circle', color: '#34D399' },
        { label: 'Failed', count: 2, icon: 'close-circle', color: '#F87171' }
      ]} />

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

      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Recent Inspections</Text>
      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>ID</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Vehicle</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Driver</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Date & Time</Text>
            <Text style={[styles.th, { flex: 1 }]}>Defects</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredInspections.slice(0, 3).map((inspection, index) => (
          <TouchableOpacity 
            key={inspection.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredInspections.slice(0, 3).length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => handleAction(inspection.id)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>ID</Text>}
              <Text style={[styles.cellText, { fontWeight: '600', color: '#043094' }]}>{inspection.id}</Text>
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
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },
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
  statusPassed: { backgroundColor: '#D1FAE5' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusWarning: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusPassedText: { color: '#059669' },
  statusFailedText: { color: '#DC2626' },
  statusWarningText: { color: '#D97706' },
  defectBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' },
  defectBadgeActive: { backgroundColor: '#FEE2E2' },
  defectText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  defectTextActive: { color: '#DC2626' },
});
