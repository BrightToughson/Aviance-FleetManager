import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForms } from '../../../context/FormsContext';

export default function FormDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { forms, submissions, toggleFormStatus, deleteForm } = useForms();

  const form = forms.find(f => f.id === id);
  const formSubmissions = submissions.filter(s => s.formId === id);

  if (!form) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Form not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(manager)/forms');
          }
        }}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get base URL for the link
  let baseUrl = 'https://aviance-fleet.com';
  if (Platform.OS === 'web') {
    baseUrl = window.location.origin;
  }
  const publicLink = `${baseUrl}/public/form/${form.id}`;

  const exportToCSV = async () => {
    if (formSubmissions.length === 0) {
      if (Platform.OS === 'web') {
        // @ts-ignore
        window.alert('No submissions to export.');
      } else {
        Alert.alert('No Data', 'No submissions to export.');
      }
      return;
    }

    const headers = ['Submission ID', 'Date', ...form.fields.map(f => `"${f.label.replace(/"/g, '""')}"`)];
    
    const rows = formSubmissions.map(sub => {
      const row = [
        `"${sub.id}"`,
        `"${new Date(sub.submittedAt).toLocaleString()}"`,
        ...form.fields.map(f => `"${(sub.data[f.name] || '').replace(/"/g, '""')}"`)
      ];
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const fileName = `${form.title.replace(/\s+/g, '_')}_Responses.csv`;

    if (Platform.OS === 'web') {
      // @ts-ignore
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      // @ts-ignore
      const link = document.createElement('a');
      // @ts-ignore
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      // @ts-ignore
      document.body.appendChild(link);
      link.click();
      // @ts-ignore
      document.body.removeChild(link);
    } else {
      try {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to export CSV');
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backNav} onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(manager)/forms');
        }
      }}>
        <Ionicons name="arrow-back" size={20} color="#4B5563" />
        <Text style={styles.backNavText}>Back to Forms</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={[styles.statusIndicator, form.active ? styles.statusActive : styles.statusInactive]} />
              <Text style={styles.idText}>{form.active ? 'Active Form' : 'Archived Form'}</Text>
            </View>
            <Text style={styles.title}>{form.title}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.toggleBtn, form.active ? styles.toggleBtnActive : styles.toggleBtnInactive]}
              onPress={() => toggleFormStatus(form.id)}
            >
              <Text style={[form.active ? styles.toggleTextActive : styles.toggleTextInactive]}>
                {form.active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => {
                if (Platform.OS === 'web') {
                  // @ts-ignore
                  if (window.confirm('Are you sure you want to delete this form?')) {
                    deleteForm(form.id);
                    router.replace('/(manager)/forms');
                  }
                } else {
                  Alert.alert('Delete Form', 'Are you sure you want to delete this form?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => {
                      deleteForm(form.id);
                      router.replace('/(manager)/forms');
                    }}
                  ]);
                }
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.description}>{form.description}</Text>

        <View style={styles.divider} />

        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Share Form</Text>
          <Text style={styles.helpText}>Share this link or QR code with anyone to let them fill out the form without an account.</Text>
          
          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={1}>{publicLink}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => {
              if (Platform.OS === 'web') {
                // @ts-ignore
                navigator.clipboard.writeText(publicLink);
                // @ts-ignore
                window.alert('Copied to clipboard!');
              }
            }}>
              <Ionicons name="copy-outline" size={20} color="#043094" />
            </TouchableOpacity>
          </View>

          {/* Simple mock QR Code visualization for MVP using an image API */}
          <View style={styles.qrContainer}>
            <View style={styles.qrMock}>
              <Ionicons name="qr-code" size={100} color="#111827" />
              <Text style={styles.qrText}>Scan to open form</Text>
            </View>
            <TouchableOpacity style={styles.openBtn} onPress={() => router.push(`/public/form/${form.id}` as any)}>
              <Text style={styles.openBtnText}>Open Form Formally</Text>
              <Ionicons name="open-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldsSection}>
          <Text style={styles.sectionTitle}>Form Fields ({form.fields.length})</Text>
          {form.fields.map((f, idx) => (
            <View key={idx} style={styles.fieldRow}>
              <View>
                <Text style={styles.fieldLabel}>{f.label} {f.required && <Text style={{color:'#EF4444'}}>*</Text>}</Text>
                <Text style={styles.fieldType}>Type: {f.type}</Text>
              </View>
            </View>
          ))}
        </View>
        
      </View>

      <View style={styles.submissionsHeader}>
        <Text style={styles.sectionTitle}>Recent Submissions ({formSubmissions.length})</Text>
        {formSubmissions.length > 0 && (
          <TouchableOpacity style={styles.exportBtn} onPress={exportToCSV}>
            <Ionicons name="download-outline" size={16} color="#043094" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {formSubmissions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No submissions yet.</Text>
        </View>
      ) : (
        formSubmissions.map(sub => (
          <View key={sub.id} style={styles.submissionCard}>
            <View style={styles.subHeader}>
              <Text style={styles.subId}>Response Entry</Text>
              <Text style={styles.subDate}>{new Date(sub.submittedAt).toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            {Object.keys(sub.data).map(key => (
              <View key={key} style={styles.subField}>
                <Text style={styles.subFieldLabel}>{form.fields.find(f => f.name === key)?.label || key}</Text>
                <Text style={styles.subFieldValue}>{sub.data[key]}</Text>
              </View>
            ))}
          </View>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%', paddingBottom: 60 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  backNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backNavText: { marginLeft: 8, color: '#4B5563', fontSize: 16, fontWeight: '500' },
  
  card: { backgroundColor: '#fff', padding: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  headerLeft: { flex: 1, minWidth: 200, paddingRight: 16 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusActive: { backgroundColor: '#10B981' },
  statusInactive: { backgroundColor: '#9CA3AF' },
  idText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  description: { fontSize: 16, color: '#4B5563', marginTop: 12, lineHeight: 24 },
  
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  toggleBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  toggleBtnInactive: { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' },
  toggleTextActive: { color: '#059669', fontWeight: '600' },
  toggleTextInactive: { color: '#4B5563', fontWeight: '600' },
  deleteBtn: { padding: 8, backgroundColor: 'transparent', borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' },
  
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  helpText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  
  shareSection: { },
  linkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  linkText: { flex: 1, fontSize: 15, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyBtn: { padding: 8, marginLeft: 12, backgroundColor: '#E0E7FF', borderRadius: 6 },
  
  qrContainer: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 32, flexWrap: 'wrap' },
  qrMock: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  qrText: { marginTop: 12, fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' },
  
  openBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043094', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  
  fieldsSection: { },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  fieldType: { fontSize: 13, color: '#6B7280', textTransform: 'capitalize' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  emptyText: { marginTop: 12, fontSize: 15, color: '#6B7280' },
  
  submissionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subId: { fontSize: 14, fontWeight: '700', color: '#111827' },
  subDate: { fontSize: 13, color: '#6B7280' },
  subField: { marginBottom: 12 },
  subFieldLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4, fontWeight: '600' },
  subFieldValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  submissionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 6 },
  exportBtnText: { color: '#043094', fontWeight: '600', fontSize: 14 },
});
