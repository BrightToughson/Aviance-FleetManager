import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useDocuments } from '../../context/DocumentsContext';
import { useTranslation } from 'react-i18next';

export default function DocumentsScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();

  const { 
    documents, 
    totalUsedMB, 
    remainingMB, 
    maxStorageMB, 
    storageUsagePercentage, 
    isStorageFull 
  } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');

  const expiringSoonCount = useMemo(() => {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    return documents.filter(d => {
      if (!d.expDate) return false;
      const exp = new Date(d.expDate);
      return exp >= now && exp <= in30Days;
    }).length;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    const lowerQuery = searchQuery.toLowerCase();
    return documents.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) || 
      (d.category && d.category.toLowerCase().includes(lowerQuery)) ||
      (d.linkedTo && d.linkedTo.toLowerCase().includes(lowerQuery))
    );
  }, [documents, searchQuery]);

  const handleAction = (id: string) => {
    router.push(`/(manager)/documents/${id}` as any);
  };

  const handleUploadClick = () => {
    if (isStorageFull) {
      if (Platform.OS === 'web') {
        window.alert(`Storage limit reached (${maxStorageMB} MB). Please delete unused documents to free up space.`);
      } else {
        Alert.alert('Storage Limit Reached', `You have reached the maximum fleet storage of ${maxStorageMB} MB. Please delete existing documents to upload new ones.`);
      }
      return;
    }
    router.push('/(manager)/documents/new' as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>{t('m_documents_title', 'Documents')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_documents_subtitle', 'Digital repository for vehicle registrations and insurance')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.primaryBtn, isStorageFull && styles.primaryBtnDisabled]} 
          onPress={handleUploadClick}
        >
          <Ionicons name={isStorageFull ? "alert-circle" : "cloud-upload"} size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {isStorageFull ? 'Storage Full' : t('m_documents_upload_btn', 'Upload File')}
          </Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: t('m_documents_total', 'Total Documents'), count: documents.length, icon: 'document-text', color: '#ffffff' },
        { label: t('m_documents_expiring', 'Expiring Soon'), count: expiringSoonCount, icon: 'time', color: '#F59E0B' },
        { label: `Used (of ${maxStorageMB} MB)`, count: `${totalUsedMB.toFixed(2)} MB`, icon: 'server', color: isStorageFull ? '#EF4444' : '#3B82F6' }
      ]} />

      {/* Storage Quota Progress Card */}
      <View style={styles.storageCard}>
        <View style={styles.storageCardHeader}>
          <View style={styles.storageHeaderLeft}>
            <View style={[styles.storageIconCircle, isStorageFull && styles.storageIconCircleFull]}>
              <Ionicons 
                name={isStorageFull ? "alert-circle" : "cloud-done-outline"} 
                size={18} 
                color={isStorageFull ? "#DC2626" : "#043094"} 
              />
            </View>
            <View>
              <Text style={styles.storageTitle}>Fleet Cloud Storage</Text>
              <Text style={styles.storageSubtitle}>
                {totalUsedMB.toFixed(2)} MB of {maxStorageMB} MB used ({storageUsagePercentage}% capacity)
              </Text>
            </View>
          </View>
          <View style={[styles.storagePill, isStorageFull ? styles.storagePillFull : storageUsagePercentage > 80 ? styles.storagePillWarn : styles.storagePillOk]}>
            <Text style={[styles.storagePillText, isStorageFull ? styles.storagePillTextFull : storageUsagePercentage > 80 ? styles.storagePillTextWarn : styles.storagePillTextOk]}>
              {isStorageFull ? 'Quota Full' : `${remainingMB.toFixed(2)} MB Free`}
            </Text>
          </View>
        </View>

        <View style={styles.storageTrack}>
          <View 
            style={[
              styles.storageFill, 
              { 
                width: `${Math.max(1.5, storageUsagePercentage)}%`,
                backgroundColor: isStorageFull ? '#DC2626' : storageUsagePercentage > 80 ? '#F59E0B' : '#043094',
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('m_documents_search_ph', 'Search by file name or vehicle...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
        <View style={styles.filterGroup}>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="folder-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>{t('m_documents_category', 'Category')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3.2 }]}>{t('m_documents_name_th', 'Document Name')}</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>{t('m_documents_category_th', 'Category')}</Text>
            <Text style={[styles.th, { flex: 1.3 }]}>{t('m_documents_linked_th', 'Linked To')}</Text>
            <Text style={[styles.th, { flex: 1.1 }]}>{t('m_documents_date_th', 'Date Added')}</Text>
            <Text style={[styles.th, { flex: 0.9 }]}>{t('m_documents_size_th', 'Size')}</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredDocuments.map((doc, index) => (
          <TouchableOpacity 
            key={doc.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredDocuments.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => handleAction(doc.id)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 3.2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={styles.docNameGroup}>
                <View style={styles.docIconBox}>
                  <Ionicons name="document-text" size={20} color="#043094" />
                </View>
                <View style={styles.docTextContainer}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                    {doc.name}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Category</Text>}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1} ellipsizeMode="tail">{doc.category}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.3 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Linked To</Text>}
              <Text style={[styles.cellText, { fontWeight: '600' }]} numberOfLines={1} ellipsizeMode="tail">{doc.linkedTo}</Text>
            </View>
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1.1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Date Added</Text>}
              <Text style={styles.cellText} numberOfLines={1}>{doc.date}</Text>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 0.9 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Size</Text>}
              <Text style={styles.cellText} numberOfLines={1}>{doc.size}</Text>
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
  primaryBtnDisabled: { backgroundColor: '#9CA3AF' },
  storageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  storageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  storageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storageIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageIconCircleFull: {
    backgroundColor: '#FEE2E2',
  },
  storageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  storageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  storagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storagePillOk: {
    backgroundColor: '#EFF6FF',
  },
  storagePillWarn: {
    backgroundColor: '#FEF3C7',
  },
  storagePillFull: {
    backgroundColor: '#FEE2E2',
  },
  storagePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  storagePillTextOk: {
    color: '#043094',
  },
  storagePillTextWarn: {
    color: '#D97706',
  },
  storagePillTextFull: {
    color: '#DC2626',
  },
  storageTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statsGridMobile: { flexDirection: 'column' },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statCardMobile: { width: '100%' },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#111827' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827', outlineStyle: 'none' } as any,
  filterGroup: { flexDirection: 'row', gap: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 40, borderRadius: 8 },
  filterBtnText: { color: '#4B5563', fontWeight: '500', marginLeft: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', minWidth: 0 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 },
  td: { justifyContent: 'center', minWidth: 0 },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  mobileLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  docNameGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  docIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  docTextContainer: { flex: 1, minWidth: 0, paddingRight: 16 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', maxWidth: '100%' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  cellText: { fontSize: 14, color: '#374151' },
});
