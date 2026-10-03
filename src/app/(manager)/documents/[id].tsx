import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, useWindowDimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDocuments } from '../../../context/DocumentsContext';

export default function DocumentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { documents, deleteDocument } = useDocuments();
  const document = useMemo(() => documents.find(d => d.id === id), [documents, id]);

  if (!document) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Document not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    const confirmDelete = () => {
      deleteDocument(document.id);
      if (Platform.OS === 'web') window.alert('Document deleted');
      router.replace('/(manager)/documents' as any);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this document?')) confirmDelete();
    } else {
      Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const handleDownload = () => {
    const msg = `Downloading ${document.name}...`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Download Started', msg);
  };

  const isImage = document.url && (document.url.endsWith('.png') || document.url.endsWith('.jpg') || document.url.endsWith('.jpeg'));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{document.name}</Text>
            <Text style={styles.subtitle}>ID: {document.id} • {document.category}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={styles.downloadBtnText}>Download</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.mainGrid, isMobile && styles.mainGridMobile]}>
        
        {/* Left Column: File Metadata */}
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Document Properties</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Uploaded Date</Text>
              <Text style={styles.value}>{document.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>File Size</Text>
              <Text style={styles.value}>{document.size}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Linked Entity</Text>
              <Text style={styles.value}>{document.linkedTo}</Text>
            </View>

            {document.expDate && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Expiration Date</Text>
                <Text style={[styles.value, { color: '#DC2626' }]}>{document.expDate}</Text>
              </View>
            )}

          </View>

          <View style={styles.card}>
             <View style={styles.infoBox}>
               <Ionicons name="information-circle-outline" size={24} color="#043094" />
               <View style={{ marginLeft: 12, flex: 1 }}>
                 <Text style={styles.infoTitle}>Secure Storage</Text>
                 <Text style={styles.infoText}>This document is stored securely and encrypted at rest. Only users with Manager or Admin permissions can delete this file.</Text>
               </View>
             </View>
          </View>
        </View>

        {/* Right Column: Document Preview */}
        <View style={[styles.rightCol, { flex: 2 }]}>
          <View style={[styles.card, { flex: 1, padding: 0, overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
              <Text style={styles.sectionTitle}>File Preview</Text>
              <TouchableOpacity onPress={handleDownload}>
                <Ionicons name="open-outline" size={20} color="#043094" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewContainer}>
              {isImage ? (
                <Image source={{ uri: document.url }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <View style={styles.genericPreview}>
                  <Ionicons name="document-text" size={80} color="#D1D5DB" />
                  <Text style={styles.genericPreviewText}>Preview not available for this file type</Text>
                  <Text style={styles.genericPreviewSubtext}>Please download the file to view its contents.</Text>
                  
                  <TouchableOpacity style={styles.downloadActionBtn} onPress={handleDownload}>
                    <Text style={styles.downloadActionBtnText}>Download {document.size}</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 0 },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  value: { fontSize: 15, color: '#111827', fontWeight: '600' },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#EEF2FF', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  infoTitle: { fontWeight: '600', color: '#1E3A8A', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#4F46E5', lineHeight: 20 },

  previewContainer: { minHeight: 400, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  genericPreview: { alignItems: 'center', padding: 40 },
  genericPreviewText: { fontSize: 16, fontWeight: '600', color: '#4B5563', marginTop: 16 },
  genericPreviewSubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  downloadActionBtn: { marginTop: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  downloadActionBtnText: { color: '#374151', fontWeight: '600' },
});
