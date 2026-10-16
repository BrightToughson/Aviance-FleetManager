import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions, Image, ActivityIndicator, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useVendors } from '../../../context/VendorsContext';
import { useDocuments } from '../../../context/DocumentsContext';
import { uploadImageToSupabase } from '../../../lib/uploadImage';

export default function AddNewVendorScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const { addVendor, updateVendor, vendors } = useVendors();
  const { addDocument, canUploadFile, remainingMB, maxStorageMB } = useDocuments();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const isEditing = !!editId;

  const [form, setForm] = useState({
    name: '',
    category: 'Parts Supplier',
    status: 'Active',
    contact: '',
    phone: '',
    email: '',
    rating: '',
    accountNumber: '',
    taxId: '',
    paymentTerms: '',
    address: ''
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    name: string;
    uri: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [docTextContent, setDocTextContent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/vendors' as any);
    }
  };

  useEffect(() => {
    if (isEditing) {
      const vendorToEdit = vendors.find(v => v.id === editId);
      if (vendorToEdit) {
        setForm({
          name: vendorToEdit.name,
          category: vendorToEdit.category,
          status: vendorToEdit.status,
          contact: vendorToEdit.contact,
          phone: vendorToEdit.phone,
          email: vendorToEdit.email,
          rating: vendorToEdit.rating && vendorToEdit.rating > 0 ? vendorToEdit.rating.toString() : '',
          accountNumber: vendorToEdit.accountNumber || '',
          taxId: vendorToEdit.taxId || '',
          paymentTerms: vendorToEdit.paymentTerms || '',
          address: vendorToEdit.address || ''
        });
        setLogoUrl(vendorToEdit.logo || null);
      }
    }
  }, [isEditing, editId, vendors]);

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogoUrl(result.assets[0].uri);
        return;
      }
    } catch (error) {
      console.log('ImagePicker unavailable, using DocumentPicker fallback:', error);
      try {
        const docResult = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
        if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
          setLogoUrl(docResult.assets[0].uri);
        }
      } catch (docError) {
        console.log('Error picking logo via DocumentPicker', docError);
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedDoc({
          name: asset.name,
          uri: asset.uri,
          size: asset.size,
          mimeType: asset.mimeType,
        });
        setDocumentUrl(asset.name);

        if (asset.size && !canUploadFile(asset.size).allowed) {
          const fileMB = (asset.size / (1024 * 1024)).toFixed(2);
          const msg = `Storage Warning: This agreement file (${fileMB} MB) exceeds your remaining fleet storage (${remainingMB.toFixed(2)} MB of ${maxStorageMB} MB limit).`;
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Storage Warning', msg);
        }
      }
    } catch (error) {
      console.log('Error picking document', error);
    }
  };

  const isDocText = !!selectedDoc && /\.(md|markdown|txt|text|csv|json|log)$/i.test(selectedDoc.name);
  const isDocPdf = !!selectedDoc && /\.pdf$/i.test(selectedDoc.name);
  const isDocImage = !!selectedDoc && (selectedDoc.mimeType?.startsWith('image/') || !!selectedDoc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i));

  const handleViewDocument = async () => {
    if (!selectedDoc?.uri) return;
    if (isDocText) {
      try {
        const res = await fetch(selectedDoc.uri);
        const text = await res.text();
        setDocTextContent(text);
      } catch (e) {
        console.warn('Could not read doc text', e);
      }
    }
    setPreviewModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      if (Platform.OS === 'web') {
        window.alert('Validation Error: Vendor Name and Phone are required.');
      } else {
        Alert.alert('Validation Error', 'Vendor Name and Phone are required.');
      }
      return;
    }

    try {
      setSubmitting(true);

      let finalLogoUrl = logoUrl;
      if (logoUrl && !logoUrl.startsWith('http')) {
        try {
          finalLogoUrl = await uploadImageToSupabase(logoUrl, 'media');
        } catch (uploadErr) {
          console.warn('Could not upload logo to Supabase storage, using current URI:', uploadErr);
        }
      }

      const vendorData = {
        name: form.name,
        category: form.category,
        status: form.status,
        contact: form.contact || 'Main Desk',
        phone: form.phone,
        email: form.email,
        rating: form.rating ? parseFloat(form.rating) : 0,
        accountNumber: form.accountNumber,
        taxId: form.taxId,
        paymentTerms: form.paymentTerms,
        address: form.address,
        logo: finalLogoUrl || undefined,
      };

      let savedVendorId = editId as string | undefined;

      if (isEditing) {
        await updateVendor(editId as string, vendorData);
      } else {
        const createdVendor = await addVendor(vendorData);
        if (createdVendor && createdVendor.id) {
          savedVendorId = createdVendor.id;
        }
      }

      // If document was selected, upload and store in Documents table
      if (selectedDoc && selectedDoc.uri) {
        if (selectedDoc.size && !canUploadFile(selectedDoc.size).allowed) {
          const fileMB = (selectedDoc.size / (1024 * 1024)).toFixed(2);
          const msg = `Cannot save vendor with document: File (${fileMB} MB) exceeds remaining fleet storage (${remainingMB.toFixed(2)} MB of ${maxStorageMB} MB limit). Please remove or pick a smaller document.`;
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Storage Limit Exceeded', msg);
          return;
        }
        try {
          const { uploadFileToSupabase } = await import('../../../lib/uploadImage');
          const uploadedDocUrl = await uploadFileToSupabase(selectedDoc.uri, 'documents', true);
          await addDocument({
            name: selectedDoc.name,
            category: 'Vendor Agreement',
            linkedTo: 'Vendor',
            entityId: savedVendorId,
            date: new Date().toISOString().split('T')[0],
            size: selectedDoc.size ? `${(selectedDoc.size / (1024 * 1024)).toFixed(2)} MB` : '1.0 MB',
            url: uploadedDocUrl,
          });
        } catch (docErr) {
          console.warn('Could not upload document to Supabase:', docErr);
        }
      }

      if (isEditing) {
        if (Platform.OS === 'web') window.alert('Vendor updated successfully!');
        else Alert.alert('Success', 'Vendor updated successfully!');
        handleBack();
      } else {
        if (Platform.OS === 'web') window.alert('Vendor added successfully!');
        else Alert.alert('Success', 'Vendor added successfully!');
        handleBack();
      }
    } catch (err: any) {
      console.error('Error saving vendor:', err);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to save vendor.');
      } else {
        Alert.alert('Error', 'Failed to save vendor.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerCancelBtn} onPress={handleBack}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveBtn, submitting && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            ) : null}
            <Text style={styles.saveBtnText}>
              {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Vendor')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Left Column: Basic Info & Contact */}
        <View style={[styles.column, isMobile ? styles.columnMobile : styles.columnDesktop]}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Company Details</Text>
            
            <View style={styles.logoSectionRow}>
              {logoUrl ? (
                <View style={styles.logoPreviewWrapper}>
                  <Image source={{ uri: logoUrl }} style={styles.logoImagePreview} resizeMode="cover" />
                  <TouchableOpacity 
                    style={styles.removeLogoBadge} 
                    onPress={() => setLogoUrl(null)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.logoPicker} onPress={handlePickLogo}>
                  <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                  <Text style={styles.logoPickerText}>Upload</Text>
                </TouchableOpacity>
              )}

              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.label}>Company Logo (Optional)</Text>
                <Text style={styles.helpText}>Upload a logo or profile image.</Text>
                
                {logoUrl ? (
                  <View style={styles.logoActionsRow}>
                    <TouchableOpacity style={styles.changeLogoBtn} onPress={handlePickLogo}>
                      <Ionicons name="cloud-upload-outline" size={14} color="#043094" />
                      <Text style={styles.changeLogoBtnText}>Change Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeLogoBtn} onPress={() => setLogoUrl(null)}>
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.removeLogoBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.chooseFileBtn} onPress={handlePickLogo}>
                    <Ionicons name="cloud-upload-outline" size={14} color="#043094" />
                    <Text style={styles.chooseFileBtnText}>Choose Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vendor Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. Elite Tire & Service Inc" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Category</Text>
                <TextInput style={styles.input} value={form.category} onChangeText={t => setForm({ ...form, category: t })} placeholder="Maintenance, Parts, Fuel..." />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Status</Text>
                <TextInput style={styles.input} value={form.status} onChangeText={t => setForm({ ...form, status: t })} placeholder="Active, Inactive" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person</Text>
              <TextInput style={styles.input} value={form.contact} onChangeText={t => setForm({ ...form, contact: t })} placeholder="e.g. Mike Johnson" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput style={styles.input} value={form.phone} onChangeText={t => setForm({ ...form, phone: t })} keyboardType="phone-pad" placeholder="(555) 123-4567" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} value={form.email} onChangeText={t => setForm({ ...form, email: t })} keyboardType="email-address" placeholder="service@vendor.com" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Physical Address</Text>
              <TextInput style={styles.input} value={form.address} onChangeText={t => setForm({ ...form, address: t })} placeholder="123 Industrial Blvd, City, ST 12345" />
            </View>
          </View>
        </View>

        {/* Right Column: Billing & Documents */}
        <View style={[styles.column, isMobile ? styles.columnMobile : styles.columnDesktop]}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Billing & Account</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number (If applicable)</Text>
              <TextInput style={styles.input} value={form.accountNumber} onChangeText={t => setForm({ ...form, accountNumber: t })} placeholder="e.g. ACC-88329" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tax ID / EIN</Text>
                <TextInput style={styles.input} value={form.taxId} onChangeText={t => setForm({ ...form, taxId: t })} placeholder="XX-XXXXXXX" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Payment Terms</Text>
                <TextInput style={styles.input} value={form.paymentTerms} onChangeText={t => setForm({ ...form, paymentTerms: t })} placeholder="e.g. Net 30" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Rating (Optional)</Text>
              <View style={styles.starRatingPicker}>
                {[1, 2, 3, 4, 5].map(star => {
                  const currentRating = parseFloat(form.rating) || 0;
                  const isFilled = star <= currentRating;
                  return (
                    <TouchableOpacity 
                      key={star} 
                      onPress={() => setForm({ ...form, rating: currentRating === star ? '' : star.toString() })}
                      style={{ padding: 4 }}
                    >
                      <Ionicons 
                        name={isFilled ? 'star' : 'star-outline'} 
                        size={26} 
                        color={isFilled ? '#F59E0B' : '#D1D5DB'} 
                      />
                    </TouchableOpacity>
                  );
                })}
                {form.rating ? (
                  <TouchableOpacity 
                    onPress={() => setForm({ ...form, rating: '' })}
                    style={styles.clearRatingBtn}
                  >
                    <Text style={styles.clearRatingText}>Clear</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.notRatedText}>Not rated</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contracts & Documents</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Upload Agreement / W-9</Text>

              {selectedDoc ? (
                <View style={styles.uploadedDocCard}>
                  <View style={styles.docIconBox}>
                    {selectedDoc.mimeType?.startsWith('image/') || selectedDoc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <TouchableOpacity onPress={() => setPreviewModalVisible(true)}>
                        <Image source={{ uri: selectedDoc.uri }} style={styles.docThumbnail} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="document-text" size={32} color="#043094" />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.docFileName} numberOfLines={1}>
                      {selectedDoc.name}
                    </Text>
                    <Text style={styles.docFileSize}>
                      {selectedDoc.size ? `${(selectedDoc.size / (1024 * 1024)).toFixed(2)} MB` : 'Attached Document'}
                    </Text>

                    <View style={styles.docActionsRow}>
                      <TouchableOpacity style={styles.viewDocBtn} onPress={handleViewDocument}>
                        <Ionicons name="eye-outline" size={14} color="#043094" />
                        <Text style={styles.viewDocBtnText}>View Document</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.changeDocBtn} onPress={handlePickDocument}>
                        <Ionicons name="repeat-outline" size={14} color="#4B5563" />
                        <Text style={styles.changeDocBtnText}>Replace</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.removeDocBtn} onPress={() => { setSelectedDoc(null); setDocumentUrl(null); }}>
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={styles.removeDocBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.filePicker} onPress={handlePickDocument}>
                  <View style={styles.filePickerIconCircle}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#043094" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.filePickerTitle}>Click to upload contract or W-9</Text>
                    <Text style={styles.filePickerSubtitle}>Supports PDF, DOC, PNG, JPG, WEBP</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>

      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleBack}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveBtn, submitting && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.saveBtnText}>
            {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Vendor')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document Image Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="document-text-outline" size={20} color="#111827" />
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedDoc?.name || 'Document Preview'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity 
                  style={styles.modalActionBtn}
                  onPress={() => {
                    if (selectedDoc?.uri) {
                      if (Platform.OS === 'web') {
                        const viewerUrl = `/public/viewer?url=${encodeURIComponent(selectedDoc.uri)}&name=${encodeURIComponent(selectedDoc.name || 'Document')}&category=Vendor Agreement`;
                        window.open(viewerUrl, '_blank');
                      } else {
                        Linking.openURL(selectedDoc.uri);
                      }
                    }
                  }}
                >
                  <Ionicons name="open-outline" size={16} color="#043094" />
                  <Text style={styles.modalActionText}>Open in New Tab</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setPreviewModalVisible(false)}
                >
                  <Ionicons name="close" size={22} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalBody}>
              {isDocImage && selectedDoc?.uri ? (
                <Image 
                  source={{ uri: selectedDoc.uri }} 
                  style={styles.modalImage} 
                  resizeMode="contain" 
                />
              ) : isDocPdf && Platform.OS === 'web' && selectedDoc?.uri ? (
                <iframe 
                  src={selectedDoc.uri} 
                  style={{ width: '100%', height: '100%', border: 'none' }} 
                  title={selectedDoc.name} 
                />
              ) : isDocText && docTextContent ? (
                <ScrollView style={{ width: '100%', height: '100%', padding: 24, backgroundColor: '#fff' }}>
                  <Text style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 13, lineHeight: 22, color: '#0F172A' }} selectable>
                    {docTextContent}
                  </Text>
                </ScrollView>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <Ionicons name="document-text-outline" size={56} color="#9CA3AF" />
                  <Text style={{ marginTop: 12, color: '#fff', fontSize: 15, fontWeight: '600' }}>{selectedDoc?.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%', paddingBottom: 64 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  
  formGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  formGridMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  column: { gap: 24 },
  columnDesktop: { flex: 1 },
  columnMobile: { width: '100%' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  logoSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoPreviewWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#043094',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  removeLogoBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  logoPicker: {
    width: 84,
    height: 84,
    backgroundColor: '#F3F4F6',
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPickerText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  logoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  changeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeLogoBtnText: {
    fontSize: 12,
    color: '#043094',
    fontWeight: '600',
  },
  removeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeLogoBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  chooseFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginTop: 8,
  },
  chooseFileBtnText: {
    fontSize: 13,
    color: '#043094',
    fontWeight: '600',
  },
  helpText: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
  },
  filePickerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#043094',
  },
  filePickerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    padding: 14,
  },
  docIconBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  docThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  docFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  docFileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  docActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewDocBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#043094',
  },
  changeDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeDocBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  removeDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  removeDocBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  modalActionText: {
    fontSize: 12,
    color: '#043094',
    fontWeight: '600',
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  modalBody: {
    width: '100%',
    height: 450,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnText: { color: '#fff', fontWeight: '600' },

  starRatingPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearRatingBtn: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  clearRatingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  notRatedText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
