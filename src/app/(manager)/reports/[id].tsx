import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReports } from '../../../context/ReportsContext';

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { reports, deleteReport } = useReports();
  const report = useMemo(() => reports.find(r => r.id === id), [reports, id]);

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Report not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    const confirmDelete = () => {
      deleteReport(report.id);
      if (Platform.OS === 'web') window.alert('Report deleted');
      router.replace('/(manager)/reports' as any);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this report configuration?')) confirmDelete();
    } else {
      Alert.alert('Delete Report', 'Are you sure you want to delete this report configuration?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const handleDownload = () => {
    const msg = `Downloading ${report.name} as ${report.format}...`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Download Started', msg);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{report.name}</Text>
            <Text style={styles.subtitle}>ID: {report.id} • {report.category}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete Config</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={styles.downloadBtnText}>Export {report.format}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.mainGrid, isMobile && styles.mainGridMobile]}>
        
        {/* Left Column: Config */}
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Report Configuration</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Schedule</Text>
              <Text style={styles.value}>{report.schedule}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Last Run</Text>
              <Text style={styles.value}>{report.lastRun}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Format</Text>
              <Text style={styles.value}>{report.format}</Text>
            </View>

            {report.description && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.notesText}>{report.description}</Text>
              </View>
            )}

            {report.filters && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Filters</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Date Range</Text>
                  <Text style={styles.value}>{report.filters.dateRange || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.label}>Vehicles Included</Text>
                  <Text style={styles.value}>{report.filters.vehicles?.join(', ') || 'All'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.label}>Metrics</Text>
                  <Text style={styles.value}>{report.filters.metrics?.join(', ') || 'Standard'}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Right Column: Preview/Data View */}
        <View style={[styles.rightCol, { flex: 2 }]}>
          <View style={[styles.card, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Latest Data View</Text>
              <TouchableOpacity style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color="#043094" />
                <Text style={styles.refreshBtnText}>Run Now</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={[styles.previewTh, { flex: 2 }]}>Entity</Text>
                <Text style={[styles.previewTh, { flex: 1 }]}>Data Point 1</Text>
                <Text style={[styles.previewTh, { flex: 1 }]}>Data Point 2</Text>
              </View>
              
              {/* Mock Data Rows based on generic report */}
              {[1, 2, 3, 4, 5].map((_, i) => (
                <View key={i} style={styles.previewRow}>
                  <Text style={[styles.previewTd, { flex: 2, fontWeight: '600' }]}>Item {i + 1}</Text>
                  <Text style={[styles.previewTd, { flex: 1 }]}>{Math.floor(Math.random() * 5000)}</Text>
                  <Text style={[styles.previewTd, { flex: 1 }]}>{Math.floor(Math.random() * 100)}%</Text>
                </View>
              ))}
              
              <View style={styles.previewFooter}>
                <Text style={styles.previewFooterText}>Showing top 5 rows. Export report to view all data.</Text>
              </View>
            </View>

          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#EF4444', marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: '#E5E7EB', borderRadius: 8 },
  backBtnText: { color: '#374151', fontWeight: '600' },
  
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerBackBtn: { marginRight: 16, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  
  headerActions: { flexDirection: 'row', gap: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  deleteBtnText: { marginLeft: 6, color: '#DC2626', fontWeight: '600' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#043094', borderRadius: 8 },
  downloadBtnText: { marginLeft: 6, color: '#fff', fontWeight: '600' },
  
  mainGrid: { flexDirection: 'row', gap: 24 },
  mainGridMobile: { flexDirection: 'column' },
  leftCol: { flex: 1, gap: 24 },
  rightCol: { flex: 1, gap: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  value: { fontSize: 15, color: '#111827', fontWeight: '600' },
  notesText: { color: '#4B5563', lineHeight: 22, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },

  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  refreshBtnText: { color: '#043094', fontWeight: '600', fontSize: 13, marginLeft: 4 },
  
  previewCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  previewTh: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  previewRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  previewTd: { fontSize: 14, color: '#111827' },
  previewFooter: { backgroundColor: '#F9FAFB', padding: 12, alignItems: 'center' },
  previewFooterText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
});
