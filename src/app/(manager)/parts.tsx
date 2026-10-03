import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useParts } from '../../context/PartsContext';

export default function PartsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const router = useRouter();

  const { parts } = useParts();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParts = useMemo(() => {
    if (!searchQuery) return parts;
    const lowerQuery = searchQuery.toLowerCase();
    return parts.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.sku.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    );
  }, [parts, searchQuery]);

  const handleAction = (id: string) => {
    router.push(`/(manager)/parts/${id}` as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Parts & Inventory</Text>
          <Text style={styles.pageSubtitle}>Manage stock levels, locations, and reorder alerts</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/parts/new' as any)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Add Part</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Total Items', count: parts.length, icon: 'list', color: '#ffffff' },
        { label: 'Low Stock', count: parts.filter(p => p.qty <= p.reorder).length, icon: 'warning', color: '#EF4444' },
        { label: 'Inventory Value', count: 'GH₵12,450', icon: 'cash', color: '#10B981' }
      ]} />

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search by part name or SKU..." 
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
        <View style={styles.filterGroup}>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Category</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Part Details</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Category</Text>
            <Text style={[styles.th, { flex: 1 }]}>Quantity</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Location</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredParts.map((part, index) => {
          const isLowStock = part.qty <= part.reorder;
          return (
            <TouchableOpacity 
              key={part.id} 
              style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredParts.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => handleAction(part.id)}
            >
              
              <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
                <View style={!isMobile && { paddingRight: 20 }}>
                  <Text style={styles.itemName}>{part.name}</Text>
                  <Text style={styles.itemSku}>{part.sku}</Text>
                </View>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Category</Text>}
                <Text style={styles.cellText}>{part.category}</Text>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Quantity</Text>}
                <Text style={[styles.cellText, { fontWeight: '700' }, isLowStock && { color: '#EF4444' }]}>{part.qty}</Text>
              </View>
              
              <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Status</Text>}
                <View style={[
                  styles.statusBadge, 
                  isLowStock ? styles.statusDanger : styles.statusSuccess
                ]}>
                  <Text style={[
                    styles.statusText,
                    isLowStock ? styles.statusDangerText : styles.statusSuccessText
                  ]}>{isLowStock ? 'Low Stock' : 'In Stock'}</Text>
                </View>
              </View>

              <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
                {isMobile && <Text style={styles.mobileLabel}>Location</Text>}
                <Text style={styles.cellText}>{part.location}</Text>
              </View>

              {!isMobile && (
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              )}
              
            </TouchableOpacity>
          );
        })}
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
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSku: { fontSize: 13, color: '#6B7280', marginTop: 4, fontFamily: 'monospace' },
  cellText: { fontSize: 14, color: '#374151' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusDanger: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusSuccessText: { color: '#059669' },
  statusDangerText: { color: '#DC2626' },
});


