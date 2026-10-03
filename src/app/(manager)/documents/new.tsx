import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useDocuments } from '../../../context/DocumentsContext';

export default function UploadDocumentScreen() {
  const router = useRouter();
  const { addDocument } = useDocuments();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [form, setForm] = useState({
    name: '',
    category: 'Vehicle Registration',
    linkedTo: '',
    expDate: '',
  });

  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
        // Auto-fill name if empty
        if (!form.name) {
          setForm(prev => ({ ...prev, name: result.assets[0].name }));
        }
      }
    } catch (error) {
      console.log('Error picking document', error);
    }
  };

  const handleSave = () => {
    if (!form.name || !selectedFile) {
      Alert.alert('Validation Error', 'Please select a file and provide a document name.');
      return;
    }

    // Format size
    const sizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    
    addDocument({
      name: form.name,
      category: form.category,
      linkedTo: form.linkedTo || 'Global',
      date: new Date().toISOString().split('T')[0],
      size: `${sizeInMB} MB`,
      url: selectedFile.uri,
      expDate: form.expDate || undefined,
    });

    if (Platform.OS === 'web') {
      window.alert('Document uploaded successfully!');
    } else {
      Alert.alert('Success', 'Document uploaded successfully!');
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload New Document</Text>
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Left Column: File Selection */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>File Selection</Text>
            
            <TouchableOpacity style={styles.uploadArea} onPress={handlePickDocument}>
              <Ionicons name="cloud-upload-outline" size={48} color="#043094" />
              {selectedFile ? (
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                  <Text style={styles.selectedFileSize}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                  <Text style={styles.changeFileText}>Click to change file</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.uploadTitle}>Click to browse files</Text>
                  <Text style={styles.uploadSubtitle}>PDF, PNG, JPG, DOCX up to 50MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Column: Metadata */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Document Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Document Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. 2024 Insurance Policy" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TextInput style={styles.input} value={form.category} onChangeText={t => setForm({ ...form, category: t })} placeholder="Insurance, Registration, Manual..." />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Linked Entity (Optional)</Text>
                <TextInput style={styles.input} value={form.linkedTo} onChangeText={t => setForm({ ...form, linkedTo: t })} placeholder="e.g. Vehicle AP101 or Driver Name" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Expiration Date (Optional)</Text>
                <TextInput style={styles.input} value={form.expDate} onChangeText={t => setForm({ ...form, expDate: t })} placeholder="YYYY-MM-DD" />
              </View>
            </View>
          </View>
        </View>

      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Upload Document</Text>
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
  
  uploadArea: { borderWidth: 2, borderColor: '#BFDBFE', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#EFF6FF', padding: 40, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: '#1E3A8A' },
  uploadSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  
  selectedFileName: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  selectedFileSize: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  changeFileText: { fontSize: 13, color: '#043094', fontWeight: '500', marginTop: 8 },

  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
