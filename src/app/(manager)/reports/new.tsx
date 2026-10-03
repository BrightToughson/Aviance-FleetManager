import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReports } from '../../../context/ReportsContext';

export default function CreateReportScreen() {
  const router = useRouter();
  const { addReport } = useReports();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [form, setForm] = useState({
    name: '',
    category: 'Financial',
    schedule: 'Ad-Hoc',
    format: 'PDF',
    description: '',
    dateRange: 'Last 30 Days',
    vehicles: 'All Vehicles',
    metrics: 'Total Cost, Maintenance Cost'
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleSave = () => {
    if (!form.name) {
      Alert.alert('Validation Error', 'Report Name is required.');
      return;
    }

    addReport({
      name: form.name,
      category: form.category,
      schedule: form.schedule,
      lastRun: 'Never',
      format: form.format,
      description: form.description,
      filters: {
        dateRange: form.dateRange,
        vehicles: form.vehicles.split(',').map(s => s.trim()),
        metrics: form.metrics.split(',').map(s => s.trim())
      }
    });

    if (Platform.OS === 'web') {
      window.alert('Report created successfully!');
    } else {
      Alert.alert('Success', 'Report created successfully!');
    }
    router.back();
  };

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>Preview: {form.name || 'Untitled Report'}</Text>
      <Text style={styles.previewSubtitle}>Category: {form.category} • Date: {form.dateRange}</Text>
      
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewTh, { flex: 2 }]}>Vehicle / Group</Text>
          <Text style={[styles.previewTh, { flex: 1 }]}>Metric 1</Text>
          <Text style={[styles.previewTh, { flex: 1 }]}>Metric 2</Text>
        </View>
        
        {/* Mock Data Rows */}
        {[1, 2, 3].map((_, i) => (
          <View key={i} style={styles.previewRow}>
            <Text style={[styles.previewTd, { flex: 2, fontWeight: '600' }]}>Vehicle 00{i + 1}</Text>
            <Text style={[styles.previewTd, { flex: 1 }]}>$1,200</Text>
            <Text style={[styles.previewTd, { flex: 1 }]}>$450</Text>
          </View>
        ))}
        
        <View style={styles.previewFooter}>
          <Text style={styles.previewFooterText}>End of Report Data. This is a mockup preview of how columns will render.</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Build Custom Report</Text>
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Configuration Column */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Report Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Report Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. Monthly Maintenance Cost" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={form.description} onChangeText={t => setForm({ ...form, description: t })} placeholder="What does this report show?" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Category</Text>
                <TextInput style={styles.input} value={form.category} onChangeText={t => setForm({ ...form, category: t })} placeholder="Financial, Safety..." />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Schedule</Text>
                <TextInput style={styles.input} value={form.schedule} onChangeText={t => setForm({ ...form, schedule: t })} placeholder="Weekly, Monthly..." />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Data Filters & Columns</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date Range</Text>
              <TextInput style={styles.input} value={form.dateRange} onChangeText={t => setForm({ ...form, dateRange: t })} placeholder="e.g. Last 30 Days" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicles / Groups to Include</Text>
              <TextInput style={styles.input} value={form.vehicles} onChangeText={t => setForm({ ...form, vehicles: t })} placeholder="e.g. All Vehicles" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Metrics (Comma Separated)</Text>
              <TextInput style={styles.input} value={form.metrics} onChangeText={t => setForm({ ...form, metrics: t })} placeholder="e.g. Total Cost, Fuel Cost" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Output & Export</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Output Format</Text>
              <TextInput style={styles.input} value={form.format} onChangeText={t => setForm({ ...form, format: t })} placeholder="PDF, CSV, Excel" />
            </View>
          </View>
        </View>

        {/* Preview Column */}
        <View style={styles.column}>
          <View style={[styles.card, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Report Preview</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => setIsPreviewMode(true)}>
                <Ionicons name="refresh" size={16} color="#043094" />
                <Text style={styles.refreshBtnText}>Generate Preview</Text>
              </TouchableOpacity>
            </View>

            {isPreviewMode ? renderPreview() : (
              <View style={styles.emptyPreview}>
                <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyPreviewText}>Configure your report and click Generate Preview to see how it will look.</Text>
              </View>
            )}
          </View>
        </View>

      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Report Configuration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  
  formGrid: { flexDirection: 'row', gap: 24 },
  formGridMobile: { flexDirection: 'column' },
  column: { flex: 1, gap: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnText: { color: '#fff', fontWeight: '600' },

  // Preview Styles
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  refreshBtnText: { color: '#043094', fontWeight: '600', fontSize: 13, marginLeft: 4 },
  emptyPreview: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyPreviewText: { color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 20 },
  
  previewContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', flex: 1 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  previewSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  
  previewCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  previewTh: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  previewRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  previewTd: { fontSize: 14, color: '#111827' },
  previewFooter: { backgroundColor: '#F9FAFB', padding: 12, alignItems: 'center' },
  previewFooterText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
});
