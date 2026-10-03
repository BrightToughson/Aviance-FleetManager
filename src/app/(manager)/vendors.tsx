import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useVendors } from '../../context/VendorsContext';

export default function VendorsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const router = useRouter();

  const { vendors } = useVendors();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    const lowerQuery = searchQuery.toLowerCase();
    return vendors.filter(v => 
      v.name.toLowerCase().includes(lowerQuery) || 
      (v.category && v.category.toLowerCase().includes(lowerQuery))
    );
  }, [vendors, searchQuery]);

  const handleAction = (id: string) => {
    router.push(`/(manager)/vendors/${id}` as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Vendors</Text>
          <Text style={styles.pageSubtitle}>Manage service shops, parts suppliers, and fuel providers</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/vendors/new' as any)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Add Vendor</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Total Vendors', count: vendors.length, icon: 'business', color: '#ffffff' },
        { label: 'Preferred Shops', count: vendors.filter(v => v.rating >= 4.5).length, icon: 'star', color: '#10B981' },
        { label: 'Avg Rating', count: '4.6', icon: 'star-half', color: '#F59E0B' }
      ]} />

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search by vendor name, type, or contact..." 
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Vendor Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Category</Text>
            <Text style={[styles.th, { flex: 2 }]}>Contact Info</Text>
            <Text style={[styles.th, { flex: 1 }]}>Rating</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredVendors.map((vendor, index) => (
          <TouchableOpacity 
            key={vendor.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredVendors.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => handleAction(vendor.id)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={!isMobile && { paddingRight: 20 }}>
                <Text style={styles.itemName}>{vendor.name}</Text>
                <Text style={styles.itemSku}>{vendor.id}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Category</Text>}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{vendor.category}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && styles.mobileDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-end' }]}>
              {isMobile && <Text style={[styles.mobileLabel, { alignSelf: 'flex-start' }]}>Contact Info</Text>}
              <View style={!isMobile && { paddingRight: 20 }}>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{vendor.phone}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{vendor.email}</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Rating</Text>}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{vendor.rating}</Text>
              </View>
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
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 },
  td: { justifyContent: 'center' },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  mobileLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSku: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  contactText: { fontSize: 13, color: '#374151', marginLeft: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#374151', marginLeft: 6 },
});
