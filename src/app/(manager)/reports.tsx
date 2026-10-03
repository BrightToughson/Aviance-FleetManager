import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useReports } from '../../context/ReportsContext';

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const router = useRouter();

  const { reports } = useReports();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const lowerQuery = searchQuery.toLowerCase();
    return reports.filter(r => 
      r.name.toLowerCase().includes(lowerQuery) || 
      (r.category && r.category.toLowerCase().includes(lowerQuery))
    );
  }, [reports, searchQuery]);

  const handleAction = (id: string) => {
    router.push(`/(manager)/reports/${id}` as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Reports & Analytics</Text>
          <Text style={styles.pageSubtitle}>Generate high-level fleet performance and cost reports</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/reports/new' as any)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Custom Report</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Cost/Mile (YTD)', count: 'GH₵1.42', icon: 'cash', color: '#10B981' },
        { label: 'Avg MPG', count: '18.4', icon: 'water', color: '#F59E0B' },
        { label: 'Total Miles', count: '245,901', icon: 'speedometer', color: '#3B82F6' },
        { label: 'Total Reports', count: reports.length, icon: 'document-text', color: '#ffffff' }
      ]} />

      <View style={[styles.searchBox, { marginBottom: 16, maxWidth: '100%' }]}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search reports by name or type..." 
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Report Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Category</Text>
            <Text style={[styles.th, { flex: 1 }]}>Schedule</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Last Run</Text>
            <View style={{ width: 80 }} />
          </View>
        )}

        {filteredReports.map((rpt, index) => (
          <TouchableOpacity 
            key={rpt.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredReports.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => handleAction(rpt.id)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={styles.infoGroup}>
                <View style={styles.iconBox}>
                  <Ionicons name="document-text" size={18} color="#043094" />
                </View>
                <View style={{ paddingRight: 20 }}>
                  <Text style={styles.itemName}>{rpt.name}</Text>
                  <Text style={styles.itemSku}>{rpt.id}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Category</Text>}
              <Text style={styles.cellText}>{rpt.category}</Text>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Schedule</Text>}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{rpt.schedule}</Text>
              </View>
            </View>
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Last Run</Text>}
              <Text style={styles.cellText}>{rpt.lastRun}</Text>
            </View>

            <View style={[styles.td, { width: isMobile ? '100%' : 80, flexDirection: 'row', justifyContent: isMobile ? 'flex-end' : 'flex-end', paddingTop: isMobile ? 10 : 0 }]}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  if (Platform.OS === 'web') window.alert(`Generating preview for ${rpt.name}...`);
                  else Alert.alert('Preview', `Generating preview for ${rpt.name}...`);
                }}
              >
                <Ionicons name="play" size={16} color="#043094" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  if (Platform.OS === 'web') window.alert(`Downloading ${rpt.name} as ${rpt.format}...`);
                  else Alert.alert('Download Started', `Downloading ${rpt.name} as ${rpt.format}...`);
                }}
              >
                <Ionicons name="download-outline" size={16} color="#4B5563" />
              </TouchableOpacity>
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
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  statCardMobile: { width: '100%' },
  statIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827', outlineStyle: 'none' } as any,
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 },
  td: { justifyContent: 'center' },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  mobileLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  infoGroup: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSku: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  cellText: { fontSize: 14, color: '#374151' },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  actionBtn: { padding: 8, marginLeft: 8, backgroundColor: '#F9FAFB', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
});


