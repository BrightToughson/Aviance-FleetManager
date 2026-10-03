import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVendors } from '../../../context/VendorsContext';
import { useParts } from '../../../context/PartsContext';

export default function VendorDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { vendors, deleteVendor } = useVendors();
  const { parts } = useParts();

  const vendor = useMemo(() => vendors.find(v => v.id === id), [vendors, id]);
  
  // Find all parts associated with this vendor
  const vendorParts = useMemo(() => parts.filter(p => p.vendorId === id), [parts, id]);

  if (!vendor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
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
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{vendor.name}</Text>
            <Text style={styles.subtitle}>ID: {vendor.id} • {vendor.category}</Text>
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
        <View style={styles.leftCol}>
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
                <Ionicons name="star" size={18} color="#F59E0B" />
                <Text style={styles.ratingText}>{vendor.rating}</Text>
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

        {/* Right Column: Billing & Supplied Parts */}
        <View style={styles.rightCol}>
          
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
});
