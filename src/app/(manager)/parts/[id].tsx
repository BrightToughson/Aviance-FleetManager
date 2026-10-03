import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useParts } from '../../../context/PartsContext';
import { useVendors } from '../../../context/VendorsContext';

export default function PartDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { parts, deletePart } = useParts();
  const { vendors } = useVendors();

  const part = useMemo(() => parts.find(p => p.id === id), [parts, id]);
  const vendor = useMemo(() => vendors.find(v => v.id === part?.vendorId), [vendors, part]);

  if (!part) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Part not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    const confirmDelete = () => {
      deletePart(part.id);
      if (Platform.OS === 'web') window.alert('Part deleted');
      router.replace('/(manager)/parts' as any);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this part?')) confirmDelete();
    } else {
      Alert.alert('Delete Part', 'Are you sure you want to delete this part?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{part.name}</Text>
            <Text style={styles.subtitle}>SKU: {part.sku}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editBtn}>
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
        
        {/* Left Column: Image and Inventory Status */}
        <View style={styles.leftCol}>
          <View style={styles.imageCard}>
            {part.imageUrl ? (
              <Image source={{ uri: part.imageUrl }} style={styles.partImage} resizeMode="cover" />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="construct-outline" size={60} color="#9CA3AF" />
                <Text style={styles.noImageText}>No Image Available</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Inventory Status</Text>
            
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.label}>Current Quantity</Text>
                <Text style={[styles.valueLarge, part.qty <= part.reorder && { color: '#EF4444' }]}>{part.qty}</Text>
              </View>
              <View>
                <Text style={styles.label}>Reorder Point</Text>
                <Text style={styles.valueLarge}>{part.reorder}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Storage Location</Text>
              <Text style={styles.value}>{part.location || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{part.category}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Purchasing, Vendor, Compatibility */}
        <View style={styles.rightCol}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Purchasing Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Unit Cost</Text>
              <Text style={styles.value}>GH₵{part.unitCost?.toFixed(2) || '0.00'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Total Value</Text>
              <Text style={styles.value}>GH₵{((part.unitCost || 0) * part.qty).toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />
            
            <Text style={styles.subHeading}>Vendor</Text>
            {vendor ? (
              <TouchableOpacity style={styles.vendorCard} onPress={() => router.push(`/(manager)/vendors/${vendor.id}` as any)}>
                <Ionicons name="business" size={24} color="#043094" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <Text style={styles.vendorContact}>{vendor.contact} • {vendor.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.noDataText}>No vendor associated</Text>
            )}

            {part.receiptUrl && (
              <TouchableOpacity style={styles.receiptBtn}>
                <Ionicons name="document-text" size={20} color="#1D4ED8" />
                <Text style={styles.receiptBtnText}>View Purchase Receipt</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Compatibility & Notes</Text>
            
            <Text style={styles.label}>Compatible Vehicles</Text>
            <View style={styles.tagsContainer}>
              {part.compatibleVehicles?.map((v, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{v}</Text>
                </View>
              )) || <Text style={styles.noDataText}>All / General</Text>}
            </View>

            <View style={styles.divider} />
            
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesText}>{part.notes || 'No notes available.'}</Text>
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
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  editBtnText: { marginLeft: 6, color: '#374151', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  deleteBtnText: { marginLeft: 6, color: '#DC2626', fontWeight: '600' },
  
  mainGrid: { flexDirection: 'row', gap: 24 },
  mainGridMobile: { flexDirection: 'column' },
  leftCol: { flex: 1, gap: 24 },
  rightCol: { flex: 1, gap: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  imageCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', height: 250 },
  partImage: { width: '100%', height: '100%' },
  noImage: { width: '100%', height: '100%', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  noImageText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 4 },
  valueLarge: { fontSize: 24, fontWeight: '700', color: '#111827' },
  value: { fontSize: 15, color: '#111827', fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  
  badge: { backgroundColor: '#E0E7FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#4338CA', fontWeight: '600', fontSize: 12 },
  
  subHeading: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  vendorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  vendorName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  vendorContact: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginTop: 16 },
  receiptBtnText: { marginLeft: 8, color: '#1D4ED8', fontWeight: '600' },
  
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  tagText: { color: '#374151', fontSize: 13 },
  
  noDataText: { color: '#9CA3AF', fontStyle: 'italic' },
  notesText: { color: '#4B5563', lineHeight: 22 },
});
