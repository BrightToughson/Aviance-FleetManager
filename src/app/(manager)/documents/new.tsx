import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useDocuments } from '../../../context/DocumentsContext';
import { useTranslation } from 'react-i18next';

export default function UploadDocumentScreen() {
  const router = useRouter();
  const { 
    addDocument, 
    totalUsedMB, 
    remainingMB, 
    maxStorageMB, 
    storageUsagePercentage, 
    isStorageFull, 
    canUploadFile 
  } = useDocuments();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [form, setForm] = useState({
    name: '',
    category: 'Vehicle Registration',
    linkedTo: '',
    expDate: '',
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/documents' as any);
    }
  };

  const [selectedFile, setSelectedFile] = useState<any>(null);

  const selectedFileMB = selectedFile?.size ? (selectedFile.size / (1024 * 1024)) : 0;
  const willExceedStorage = selectedFile ? (totalUsedMB + selectedFileMB > maxStorageMB) : false;

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        // Auto-fill name if empty
        if (!form.name) {
          setForm(prev => ({ ...prev, name: file.name }));
        }

        // Check quota immediately upon pick
        if (file.size && !canUploadFile(file.size).allowed) {
          const fileMB = (file.size / (1024 * 1024)).toFixed(2);
          if (Platform.OS === 'web') {
            window.alert(`Warning: This file (${fileMB} MB) exceeds your remaining storage (${remainingMB.toFixed(2)} MB of ${maxStorageMB} MB). Please choose a smaller file.`);
          } else {
            Alert.alert('Storage Limit Warning', `This file (${fileMB} MB) exceeds your remaining storage (${remainingMB.toFixed(2)} MB of ${maxStorageMB} MB).`);
          }
        }
      }
    } catch (error) {
      console.log('Error picking document', error);
    }
  };

  const handleSave = async () => {
    if (!form.name || !selectedFile) {
      Alert.alert(t('common_validation_error', 'Validation Error'), t('doc_new_error_fill', 'Please select a file and provide a document name.'));
      return;
    }

    if (willExceedStorage || isStorageFull) {
      const msg = `Cannot upload: This file (${selectedFileMB.toFixed(2)} MB) exceeds your remaining storage quota (${remainingMB.toFixed(2)} MB of ${maxStorageMB} MB limit).`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Storage Limit Exceeded', msg);
      }
      return;
    }

    // Format size
    const sizeInMB = selectedFileMB.toFixed(2);
    
    try {
      await addDocument({
        name: form.name,
        category: form.category,
        linkedTo: form.linkedTo || 'Global',
        date: new Date().toISOString().split('T')[0],
        size: `${sizeInMB} MB`,
        url: selectedFile.uri,
        expDate: form.expDate || undefined,
      });

      if (Platform.OS === 'web') {
        window.alert(t('doc_upload_success', 'Document uploaded successfully!'));
      } else {
        Alert.alert(t('common_success', 'Success'), t('doc_upload_success', 'Document uploaded successfully!'));
      }
      handleBack();
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to upload document.';
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert('Upload Error', errMsg);
    }
  };

  const isImageFile = selectedFile && (selectedFile.mimeType?.startsWith('image/') || selectedFile.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i));

  const handleViewSelectedFile = () => {
    if (!selectedFile?.uri) return;
    if (Platform.OS === 'web') {
      const viewerUrl = `/public/viewer?url=${encodeURIComponent(selectedFile.uri)}&name=${encodeURIComponent(selectedFile.name || form.name || 'Document')}&category=${encodeURIComponent(form.category || 'General')}`;
      window.open(viewerUrl, '_blank');
    } else {
      Linking.openURL(selectedFile.uri).catch(err => {
        console.warn('Could not open file:', err);
        Alert.alert('Preview', 'Unable to preview file format.');
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('doc_new_title', 'Upload New Document')}</Text>
      </View>

      {/* Storage Quota Status Banner */}
      <View style={styles.quotaBanner}>
        <View style={styles.quotaHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="server" size={16} color="#043094" />
            <Text style={styles.quotaTitle}>
              Storage Quota: {totalUsedMB.toFixed(2)} MB / {maxStorageMB} MB
            </Text>
          </View>
          <Text style={[styles.quotaRemaining, willExceedStorage && { color: '#DC2626' }]}>
            {remainingMB.toFixed(2)} MB Remaining
          </Text>
        </View>
        <View style={styles.quotaTrack}>
          <View style={[styles.quotaFill, { width: `${storageUsagePercentage}%` }]} />
          {selectedFile && !willExceedStorage && (
            <View 
              style={[
                styles.quotaProjectedFill, 
                { 
                  left: `${storageUsagePercentage}%`, 
                  width: `${Math.min(100 - storageUsagePercentage, (selectedFileMB / maxStorageMB) * 100)}%` 
                }
              ]} 
            />
          )}
        </View>
        {willExceedStorage && (
          <View style={styles.quotaAlertBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.quotaAlertText}>
              Upload Blocked: File ({selectedFileMB.toFixed(2)} MB) exceeds remaining space ({remainingMB.toFixed(2)} MB).
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Left Column: File Selection */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('doc_new_file_sel', 'File Selection')}</Text>
            
            <TouchableOpacity style={styles.uploadArea} onPress={handlePickDocument}>
              {selectedFile ? (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  {isImageFile ? (
                    <Image source={{ uri: selectedFile.uri }} style={styles.previewImageThumb} resizeMode="contain" />
                  ) : (
                    <Ionicons name="document-text" size={48} color="#043094" />
                  )}
                  <Text style={styles.selectedFileName} numberOfLines={1}>{selectedFile.name}</Text>
                  <Text style={styles.selectedFileSize}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                  
                  <View style={styles.fileActionRow}>
                    <TouchableOpacity style={styles.viewFileBtn} onPress={handleViewSelectedFile}>
                      <Ionicons name="eye-outline" size={14} color="#043094" />
                      <Text style={styles.viewFileBtnText}>View File</Text>
                    </TouchableOpacity>
                    <Text style={styles.changeFileText}>{t('doc_new_change_file', 'Click to change file')}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="cloud-upload-outline" size={48} color="#043094" />
                  <Text style={styles.uploadTitle}>{t('doc_new_click_browse', 'Click to browse files')}</Text>
                  <Text style={styles.uploadSubtitle}>{t('doc_new_formats', 'PDF, PNG, JPG, DOCX up to 50MB')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Column: Metadata */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('doc_new_details', 'Document Details')}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('doc_new_lbl_name', 'Document Name *')}</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder={t('doc_new_ph_name', 'e.g. 2024 Insurance Policy')} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('doc_new_lbl_cat', 'Category')}</Text>
              <TextInput style={styles.input} value={form.category} onChangeText={t => setForm({ ...form, category: t })} placeholder={t('doc_new_ph_cat', 'Insurance, Registration, Manual...')} />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>{t('doc_new_lbl_entity', 'Linked Entity (Optional)')}</Text>
                <TextInput style={styles.input} value={form.linkedTo} onChangeText={t => setForm({ ...form, linkedTo: t })} placeholder={t('doc_new_ph_entity', 'e.g. Vehicle AP101 or Driver Name')} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('doc_new_lbl_exp', 'Expiration Date (Optional)')}</Text>
                <TextInput style={styles.input} value={form.expDate} onChangeText={t => setForm({ ...form, expDate: t })} placeholder="YYYY-MM-DD" />
              </View>
            </View>
          </View>
        </View>

      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleBack}>
          <Text style={styles.cancelBtnText}>{t('common_cancel', 'Cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveBtn, (willExceedStorage || isStorageFull) && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={willExceedStorage || isStorageFull}
        >
          <Text style={styles.saveBtnText}>
            {willExceedStorage ? 'Storage Limit Exceeded' : isStorageFull ? 'Quota Full' : t('doc_new_upload_btn', 'Upload Document')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  
  quotaBanner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  quotaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  quotaRemaining: {
    fontSize: 13,
    fontWeight: '600',
    color: '#043094',
  },
  quotaTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  quotaFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#043094',
    borderRadius: 4,
  },
  quotaProjectedFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#60A5FA',
    borderRadius: 4,
  },
  quotaAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  quotaAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },

  formGrid: { flexDirection: 'row', gap: 24 },
  formGridMobile: { flexDirection: 'column' },
  column: { flex: 1, gap: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  uploadArea: { borderWidth: 2, borderColor: '#BFDBFE', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#EFF6FF', padding: 40, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: '#1E3A8A' },
  uploadSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  
  selectedFileName: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center', marginTop: 8 },
  selectedFileSize: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  changeFileText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  previewImageThumb: { width: 120, height: 120, borderRadius: 8, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#BFDBFE' },
  fileActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  viewFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#043094', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  viewFileBtnText: { fontSize: 12, fontWeight: '600', color: '#043094' },

  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnDisabled: { backgroundColor: '#9CA3AF' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
