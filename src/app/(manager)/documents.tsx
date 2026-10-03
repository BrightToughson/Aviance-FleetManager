import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useDocuments } from '../../context/DocumentsContext';

export default function DocumentsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const router = useRouter();

  const { documents } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Documents</Text>
          <Text style={styles.pageSubtitle}>Digital repository for vehicle registrations and insurance</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/documents/new' as any)}>
          <Ionicons name="cloud-upload" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Upload File</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Total Documents', count: documents.length, icon: 'document-text', color: '#ffffff' },
        { label: 'Expiring Soon', count: 8, icon: 'time', color: '#F59E0B' },
        { label: 'Storage Used', count: '2.4 GB', icon: 'server', color: '#3B82F6' }
      ]} />

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search by file name or vehicle..." 
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
            <Text style={styles.filterBtnText}>Category</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2.5 }]}>Document Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Category</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Linked To</Text>
            <Text style={[styles.th, { flex: 1 }]}>Date Added</Text>
            <Text style={[styles.th, { flex: 1 }]}>Size</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredDocuments.map((doc, index) => (
          <TouchableOpacity 
            key={doc.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredDocuments.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => handleAction(doc.id)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 2.5 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={styles.docNameGroup}>
                <View style={styles.docIconBox}>
                  <Ionicons name="document-text" size={20} color="#043094" />
                </View>
                <View style={{ paddingRight: 20 }}>
                  <Text style={styles.itemName}>{doc.name}</Text>
                  <Text style={styles.itemSku}>{doc.id}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Category</Text>}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{doc.category}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Linked To</Text>}
              <Text style={[styles.cellText, { fontWeight: '600' }]}>{doc.linkedTo}</Text>
            </View>
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Date Added</Text>}
              <Text style={styles.cellText}>{doc.date}</Text>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Size</Text>}
              <Text style={styles.cellText}>{doc.size}</Text>
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
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 },
  td: { justifyContent: 'center' },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  mobileLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  docNameGroup: { flexDirection: 'row', alignItems: 'center' },
  docIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSku: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  cellText: { fontSize: 14, color: '#374151' },
});
