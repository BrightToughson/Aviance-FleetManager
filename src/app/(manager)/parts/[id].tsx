import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useParts } from '../../../context/PartsContext';
import { useVendors } from '../../../context/VendorsContext';
import StockAdjustmentModal from '../../../components/StockAdjustmentModal';

export default function PartDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { parts, deletePart } = useParts();
  const { vendors } = useVendors();

  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<'use' | 'restock' | 'set'>('use');

  const part = useMemo(() => parts.find(p => p.id === id), [parts, id]);
  const vendor = useMemo(() => vendors.find(v => v.id === part?.vendorId), [vendors, part]);

  // Parse activity history and general notes from part.notes
  const { generalNotes, logs } = useMemo(() => {
    if (!part?.notes) return { generalNotes: '', logs: [] };

    const lines = part.notes.split('\n').map(l => l.trim()).filter(Boolean);
    const activityLogs: any[] = [];
    const otherNotes: string[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) {
        const timestamp = match[1];
        const content = match[2];
        const lower = content.toLowerCase();

        let type: 'use' | 'restock' | 'audit' = 'audit';
        if (lower.includes('used')) type = 'use';
        else if (lower.includes('restocked')) type = 'restock';

        let vehicle = '';
        const vehicleMatch = content.match(/for vehicle\s+([^()]+)/i);
        if (vehicleMatch) {
          vehicle = vehicleMatch[1].trim();
        }

        let stock = '';
        const stockMatch = content.match(/new stock:\s*(\d+)/i);
        if (stockMatch) {
          stock = stockMatch[1];
        }

        activityLogs.unshift({
          id: `log-${index}`,
          timestamp,
          type,
          vehicle,
          stock,
          rawText: content,
        });
      } else {
        otherNotes.push(line);
      }
    });

    return { generalNotes: otherNotes.join('\n'), logs: activityLogs };
  }, [part?.notes]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/parts' as any);
    }
  };

  if (!part) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Part not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
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

  const handleOpenStockModal = (m: 'use' | 'restock' | 'set') => {
    setStockModalMode(m);
    setStockModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{part.name}</Text>
            <Text style={styles.subtitle}>SKU: {part.sku}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.adjustBtn} onPress={() => handleOpenStockModal('use')}>
            <Ionicons name="swap-vertical" size={16} color="#043094" />
            <Text style={styles.adjustBtnText}>Adjust Stock</Text>
          </TouchableOpacity>
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
        <View style={[styles.leftCol, isMobile ? styles.colMobile : styles.colDesktop]}>
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

            {/* Quick Usage / Restock Buttons */}
            <View style={styles.stockActionRow}>
              <TouchableOpacity style={styles.usePartActionBtn} onPress={() => handleOpenStockModal('use')}>
                <Ionicons name="arrow-down-circle" size={16} color="#DC2626" />
                <Text style={styles.usePartActionText}>Record Usage (-)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restockActionBtn} onPress={() => handleOpenStockModal('restock')}>
                <Ionicons name="arrow-up-circle" size={16} color="#059669" />
                <Text style={styles.restockActionText}>Restock (+)</Text>
              </TouchableOpacity>
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
        <View style={[styles.rightCol, isMobile ? styles.colMobile : styles.colDesktop]}>
          
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
            
            <Text style={styles.label}>General Notes</Text>
            <Text style={styles.notesText}>{generalNotes || 'No additional notes provided.'}</Text>
          </View>

          {/* Activity & Usage History Timeline Card */}
          <View style={styles.card}>
            <View style={styles.activityHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time-outline" size={20} color="#043094" />
                <Text style={styles.sectionTitle}>Stock Activity History</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{logs.length}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.recordUsageSmallBtn}
                onPress={() => handleOpenStockModal('use')}
              >
                <Ionicons name="add" size={16} color="#043094" />
                <Text style={styles.recordUsageSmallText}>Record Usage</Text>
              </TouchableOpacity>
            </View>

            {logs.length === 0 ? (
              <View style={styles.emptyActivityBox}>
                <Ionicons name="clipboard-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyActivityTitle}>No usage records yet</Text>
                <Text style={styles.emptyActivitySubtitle}>
                  When parts are used on vehicles or restocked, a timestamped audit trail will appear here.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyRecordBtn}
                  onPress={() => handleOpenStockModal('use')}
                >
                  <Text style={styles.emptyRecordBtnText}>Log First Part Usage</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timelineList}>
                {logs.map((item, i) => {
                  const isUse = item.type === 'use';
                  const isRestock = item.type === 'restock';
                  return (
                    <View key={item.id} style={styles.timelineItem}>
                      {/* Timeline icon & connecting line */}
                      <View style={styles.timelineIconCol}>
                        <View style={[
                          styles.timelineDot,
                          isUse ? styles.dotUse : isRestock ? styles.dotRestock : styles.dotAudit
                        ]}>
                          <Ionicons 
                            name={isUse ? 'arrow-down' : isRestock ? 'arrow-up' : 'create'} 
                            size={12} 
                            color="#fff" 
                          />
                        </View>
                        {i < logs.length - 1 && <View style={styles.timelineLine} />}
                      </View>

                      {/* Timeline Content Card */}
                      <View style={styles.timelineContentCard}>
                        <View style={styles.timelineTopRow}>
                          <View style={[
                            styles.activityBadge,
                            isUse ? styles.badgeUse : isRestock ? styles.badgeRestock : styles.badgeAudit
                          ]}>
                            <Text style={[
                              styles.activityBadgeText,
                              isUse ? styles.textUse : isRestock ? styles.textRestock : styles.textAudit
                            ]}>
                              {isUse ? 'Part Usage (-)' : isRestock ? 'Restocked (+)' : 'Stock Audit'}
                            </Text>
                          </View>
                          <Text style={styles.timestampText}>{item.timestamp}</Text>
                        </View>

                        <Text style={styles.activityMainText}>{item.rawText}</Text>

                        {/* Extra metadata pills if vehicle or new stock exist */}
                        {(item.vehicle || item.stock) && (
                          <View style={styles.metaPillsRow}>
                            {item.vehicle ? (
                              <View style={styles.vehiclePill}>
                                <Ionicons name="car-outline" size={13} color="#4B5563" />
                                <Text style={styles.vehiclePillText}>{item.vehicle}</Text>
                              </View>
                            ) : null}
                            {item.stock ? (
                              <View style={styles.stockBalancePill}>
                                <Ionicons name="cube-outline" size={13} color="#043094" />
                                <Text style={styles.stockBalancePillText}>Balance: {item.stock} units</Text>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          
        </View>

      </View>

      <StockAdjustmentModal
        visible={stockModalVisible}
        onClose={() => setStockModalVisible(false)}
        part={part}
        initialMode={stockModalMode}
      />
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
  
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  adjustBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8 },
  adjustBtnText: { marginLeft: 6, color: '#043094', fontWeight: '600', fontSize: 13 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  editBtnText: { marginLeft: 6, color: '#374151', fontWeight: '600', fontSize: 13 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  deleteBtnText: { marginLeft: 6, color: '#DC2626', fontWeight: '600', fontSize: 13 },

  stockActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  usePartActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  usePartActionText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  restockActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  restockActionText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 13,
  },
  
  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  mainGridMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  leftCol: { gap: 24 },
  rightCol: { gap: 24 },
  colDesktop: { flex: 1 },
  colMobile: { width: '100%' },
  
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

  // Activity & Usage Timeline Styles
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#043094',
  },
  recordUsageSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  recordUsageSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#043094',
  },
  emptyActivityBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyActivityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  emptyActivitySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  emptyRecordBtn: {
    marginTop: 8,
    backgroundColor: '#043094',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyRecordBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  timelineList: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotUse: {
    backgroundColor: '#DC2626',
  },
  dotRestock: {
    backgroundColor: '#059669',
  },
  dotAudit: {
    backgroundColor: '#4B5563',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
    minHeight: 24,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeUse: {
    backgroundColor: '#FEE2E2',
  },
  badgeRestock: {
    backgroundColor: '#ECFDF5',
  },
  badgeAudit: {
    backgroundColor: '#F3F4F6',
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textUse: {
    color: '#DC2626',
  },
  textRestock: {
    color: '#059669',
  },
  textAudit: {
    color: '#4B5563',
  },
  timestampText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  activityMainText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  vehiclePillText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  stockBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  stockBalancePillText: {
    fontSize: 11,
    color: '#043094',
    fontWeight: '600',
  },
});
