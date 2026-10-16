import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useVendors } from '../../context/VendorsContext';
import { useTranslation } from 'react-i18next';

export default function VendorsScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
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
          <Text style={styles.pageTitle}>{t('m_vendors_title', 'Vendors')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_vendors_subtitle', 'Manage service shops, parts suppliers, and fuel providers')}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/vendors/new' as any)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{t('m_vendors_add_btn', 'Add Vendor')}</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: t('m_vendors_total', 'Total Vendors'), count: vendors.length, icon: 'business', color: '#ffffff' },
        { label: t('m_vendors_preferred', 'Preferred Shops'), count: vendors.filter(v => v.rating >= 4.5).length, icon: 'star', color: '#10B981' },
        { label: t('m_vendors_avg_rating', 'Avg Rating'), count: '4.6', icon: 'star-half', color: '#F59E0B' }
      ]} />

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('m_vendors_search_ph', 'Search by vendor name, type, or contact...')}
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
            <Text style={[styles.th, { flex: 2 }]}>{t('m_vendors_name_th', 'Vendor Name')}</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>{t('m_vendors_category_th', 'Category')}</Text>
            <Text style={[styles.th, { flex: 2 }]}>{t('m_vendors_contact_th', 'Contact Info')}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{t('m_vendors_rating_th', 'Rating')}</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {vendor.logo ? (
                  <Image source={{ uri: vendor.logo }} style={styles.vendorLogo} resizeMode="cover" />
                ) : (
                  <View style={styles.vendorLogoPlaceholder}>
                    <Text style={styles.vendorLogoInitial}>{vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V'}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0, paddingRight: isMobile ? 0 : 16 }}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{vendor.name}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>{t('m_vendors_category_th', 'Category')}</Text>}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{vendor.category}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && styles.mobileDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-end' }]}>
              {isMobile && <Text style={[styles.mobileLabel, { alignSelf: 'flex-start' }]}>{t('m_vendors_contact_th', 'Contact Info')}</Text>}
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
              {isMobile && <Text style={styles.mobileLabel}>{t('m_vendors_rating_th', 'Rating')}</Text>}
              <View style={styles.ratingRow}>
                {vendor.rating && vendor.rating > 0 ? (
                  <>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{vendor.rating}</Text>
                  </>
                ) : (
                  <Text style={[styles.ratingText, { color: '#9CA3AF' }]}>—</Text>
                )}
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
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', minWidth: 0 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 },
  td: { justifyContent: 'center', minWidth: 0 },
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
  vendorLogo: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  vendorLogoPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center' },
  vendorLogoInitial: { fontSize: 14, fontWeight: '700', color: '#043094' },
});
