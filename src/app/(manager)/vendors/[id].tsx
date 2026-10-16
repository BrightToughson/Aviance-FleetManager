import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, useWindowDimensions, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVendors } from '../../../context/VendorsContext';
import { useParts } from '../../../context/PartsContext';
import { useDocuments, Document } from '../../../context/DocumentsContext';

export default function VendorDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { vendors, deleteVendor } = useVendors();
  const { parts } = useParts();
  const { documents } = useDocuments();

  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<Document | null>(null);

  const vendor = useMemo(() => vendors.find(v => v.id === id), [vendors, id]);
  
  // Find all parts associated with this vendor
  const vendorParts = useMemo(() => parts.filter(p => p.vendorId === id), [parts, id]);

  // Find all contracts & documents associated with this vendor
  const vendorDocs = useMemo(() => {
    if (!vendor) return [];
    return documents.filter(d => 
      (d.entityId && d.entityId === vendor.id) ||
      (d.linkedTo && d.linkedTo.toLowerCase() === 'vendor' && d.name.toLowerCase().includes(vendor.name.toLowerCase())) ||
      (d.name.toLowerCase().includes(vendor.name.toLowerCase()))
    );
  }, [documents, vendor]);

  const handleOpenDoc = (doc: Document) => {
    if (doc.id) {
      router.push(`/(manager)/documents/${doc.id}` as any);
      return;
    }
    if (!doc.url) {
      if (Platform.OS === 'web') window.alert('No file URL available for this document.');
      else Alert.alert('Unavailable', 'No file URL available for this document.');
      return;
    }
    const isImageFile = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(doc.url) || doc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    if (isImageFile) {
      setSelectedPreviewDoc(doc);
      return;
    }
    if (doc.id) {
      router.push(`/(manager)/documents/${doc.id}` as any);
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const viewerUrl = `${origin}/public/viewer?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(doc.name)}&category=Vendor`;
    if (Platform.OS === 'web') {
      window.open(viewerUrl, '_blank');
    } else {
      Linking.openURL(viewerUrl).catch(err => {
        console.warn('Could not open document:', err);
        Alert.alert('Error', 'Unable to open document.');
      });
    }
  };

  const handleDownloadDoc = async (url: string, name: string) => {
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = blobUrl;
        a.download = name || 'document';
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        const a = window.document.createElement('a');
        a.href = url;
        a.download = name || 'document';
        a.target = '_blank';
        a.click();
      }
    } else {
      Linking.openURL(url);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/vendors' as any);
    }
  };

  if (!vendor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    const confirmDelete = () => {
      deleteVendor(vendor.id);
      if (Platform.OS === 'web') window.alert('Vendor deleted');
      router.replace('/(manager)/vendors' as any);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this vendor?')) confirmDelete();
    } else {
      Alert.alert('Delete Vendor', 'Are you sure you want to delete this vendor?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{vendor.name}</Text>
            <Text style={styles.subtitle}>{vendor.category}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => router.push(`/(manager)/vendors/new?editId=${vendor.id}` as any)}
          >
            <Ionicons name="pencil" size={18} color="#4B5563" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.mainGrid, isMobile && styles.mainGridMobile]}>
        
        {/* Left Column: Vendor Profile & Contact */}
        <View style={[styles.leftCol, isMobile ? styles.colMobile : styles.colDesktop]}>
          <View style={styles.profileCard}>
            {vendor.logo ? (
              <Image source={{ uri: vendor.logo }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <View style={styles.noLogo}>
                <Ionicons name="business-outline" size={50} color="#9CA3AF" />
              </View>
            )}
            
            <View style={styles.profileInfo}>
              <View style={styles.ratingRow}>
                {vendor.rating && vendor.rating > 0 ? (
                  <>
                    <Ionicons name="star" size={18} color="#F59E0B" />
                    <Text style={styles.ratingText}>{vendor.rating}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="star-outline" size={16} color="#9CA3AF" />
                    <Text style={[styles.ratingText, { color: '#9CA3AF', fontWeight: '500', fontSize: 13 }]}>Not rated</Text>
                  </>
                )}
              </View>
              <View style={[styles.badge, vendor.status === 'Active' ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, vendor.status === 'Active' ? styles.badgeTextActive : styles.badgeTextInactive]}>{vendor.status}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={{ width: 24 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Primary Contact</Text>
                <Text style={styles.value}>{vendor.contact}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={20} color="#6B7280" style={{ width: 24 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Phone Number</Text>
                <Text style={styles.value}>{vendor.phone}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={{ width: 24 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.value}>{vendor.email}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#6B7280" style={{ width: 24 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value}>{vendor.address || 'No address provided'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Billing, Documents & Supplied Parts */}
        <View style={[styles.rightCol, isMobile ? styles.colMobile : styles.colDesktop]}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Billing & Accounts</Text>
            
            <View style={styles.billingGrid}>
              <View style={styles.billingItem}>
                <Text style={styles.label}>Account Number</Text>
                <Text style={styles.value}>{vendor.accountNumber || 'N/A'}</Text>
              </View>
              <View style={styles.billingItem}>
                <Text style={styles.label}>Tax ID</Text>
                <Text style={styles.value}>{vendor.taxId || 'N/A'}</Text>
              </View>
              <View style={styles.billingItem}>
                <Text style={styles.label}>Payment Terms</Text>
                <Text style={styles.value}>{vendor.paymentTerms || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Contracts & Documents Card */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-attach-outline" size={20} color="#043094" />
                <Text style={styles.sectionTitle}>Contracts & Documents ({vendorDocs.length})</Text>
              </View>
              <TouchableOpacity onPress={() => router.push(`/(manager)/vendors/new?editId=${vendor.id}` as any)}>
                <Text style={styles.linkText}>+ Attach / Edit</Text>
              </TouchableOpacity>
            </View>

            {vendorDocs.length > 0 ? (
              <View style={styles.docsList}>
                {vendorDocs.map(doc => {
                  const isImage = doc.url && (/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(doc.url) || doc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                  return (
                    <View key={doc.id} style={styles.docItemCard}>
                      <View style={styles.docIconBox}>
                        {isImage ? (
                          <TouchableOpacity onPress={() => handleOpenDoc(doc)}>
                            <Image source={{ uri: doc.url }} style={styles.docThumbImage} resizeMode="cover" />
                          </TouchableOpacity>
                        ) : (
                          <Ionicons name="document-text" size={24} color="#043094" />
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.docNameText} numberOfLines={1}>{doc.name}</Text>
                        <Text style={styles.docSubText}>
                          {doc.category || 'Agreement'} • {doc.size || 'Attached'} • {doc.date}
                        </Text>
                      </View>
                      <View style={styles.docActionBtns}>
                        <TouchableOpacity 
                          style={styles.viewDocBadge} 
                          onPress={() => handleOpenDoc(doc)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#043094" />
                          <Text style={styles.viewDocBadgeText}>View</Text>
                        </TouchableOpacity>
                        {doc.url ? (
                          <TouchableOpacity 
                            style={styles.downloadDocBadge}
                            onPress={() => handleDownloadDoc(doc.url!, doc.name)}
                          >
                            <Ionicons name="arrow-down-circle-outline" size={14} color="#4B5563" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyDocState}>
                <View style={styles.emptyDocIconCircle}>
                  <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyDocTitle}>No contracts or W-9 attached yet</Text>
                <Text style={styles.emptyDocSub}>You can attach contracts or W-9 forms by editing this vendor.</Text>
                <TouchableOpacity 
                  style={styles.uploadDocPromptBtn}
                  onPress={() => router.push(`/(manager)/vendors/new?editId=${vendor.id}` as any)}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#043094" />
                  <Text style={styles.uploadDocPromptText}>Upload Agreement / W-9</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Supplied Parts ({vendorParts.length})</Text>
              <TouchableOpacity onPress={() => router.push('/(manager)/parts/new' as any)}>
                <Text style={styles.linkText}>+ Add Part</Text>
              </TouchableOpacity>
            </View>
            
            {vendorParts.length > 0 ? (
              <View style={styles.partsList}>
                {vendorParts.map(part => (
                  <TouchableOpacity key={part.id} style={styles.partItem} onPress={() => router.push(`/(manager)/parts/${part.id}` as any)}>
                    <View style={styles.partIcon}>
                      <Ionicons name="construct" size={20} color="#4338CA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partName}>{part.name}</Text>
                      <Text style={styles.partSku}>{part.sku} • {part.qty} in stock</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No parts supplied by this vendor yet.</Text>
              </View>
            )}
          </View>
          
        </View>

      </View>

      {/* Document Image Preview Modal */}
      <Modal
        visible={!!selectedPreviewDoc}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPreviewDoc(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="document-text-outline" size={20} color="#111827" />
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedPreviewDoc?.name || 'Document Preview'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity 
                  style={styles.modalActionBtn}
                  onPress={() => {
                    if (selectedPreviewDoc?.url) {
                      if (Platform.OS === 'web') {
                        const viewerUrl = `/public/viewer?url=${encodeURIComponent(selectedPreviewDoc.url)}&name=${encodeURIComponent(selectedPreviewDoc.name || 'Document')}&category=Vendor Agreement`;
                        window.open(viewerUrl, '_blank');
                      } else {
                        Linking.openURL(selectedPreviewDoc.url);
                      }
                    }
                  }}
                >
                  <Ionicons name="open-outline" size={16} color="#043094" />
                  <Text style={styles.modalActionText}>Open in New Tab</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedPreviewDoc(null)}
                >
                  <Ionicons name="close" size={22} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalBody}>
              {selectedPreviewDoc?.url ? (
                <Image 
                  source={{ uri: selectedPreviewDoc.url }} 
                  style={styles.modalImage} 
                  resizeMode="contain" 
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
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
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  editBtnText: { marginLeft: 6, color: '#374151', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  deleteBtnText: { marginLeft: 6, color: '#DC2626', fontWeight: '600' },
  
  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  mainGridMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  leftCol: { gap: 24 },
  rightCol: { gap: 24 },
  colDesktop: { flex: 1 },
  colMobile: { width: '100%' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  logoImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  noLogo: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 6 },
  
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#FEE2E2' },
  badgeText: { fontWeight: '600', fontSize: 12 },
  badgeTextActive: { color: '#059669' },
  badgeTextInactive: { color: '#DC2626' },
  
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 2 },
  value: { fontSize: 15, color: '#111827', fontWeight: '500' },
  
  billingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  billingItem: { flexBasis: '45%', marginBottom: 8 },
  
  linkText: { color: '#1D4ED8', fontWeight: '600', fontSize: 14 },
  partsList: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  partItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  partIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  partName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  partSku: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { marginTop: 12, color: '#6B7280' },

  docsList: { gap: 10 },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  docIconBox: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  docThumbImage: {
    width: 46,
    height: 46,
    borderRadius: 8,
  },
  docNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  docSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  docActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  viewDocBadge: {
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
  viewDocBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#043094',
  },
  downloadDocBadge: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyDocState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyDocIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyDocTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  emptyDocSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
    marginBottom: 14,
  },
  uploadDocPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadDocPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#043094',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
