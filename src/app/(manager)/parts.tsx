import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Image, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox, { SummaryItem } from '../../components/SummaryBox';
import { useParts, Part } from '../../context/PartsContext';
import { useTranslation } from 'react-i18next';
import StockAdjustmentModal from '../../components/StockAdjustmentModal';

export default function PartsScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();

  const { parts, loading, refreshParts } = useParts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'in_stock' | 'low_stock' | 'out_of_stock'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Stock Adjustment Modal State
  const [selectedPartForAdjustment, setSelectedPartForAdjustment] = useState<Part | null>(null);
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [adjustmentModalMode, setAdjustmentModalMode] = useState<'use' | 'restock' | 'set'>('use');

  const handleQuickAdjust = (p: Part, mode: 'use' | 'restock' | 'set' = 'use') => {
    setSelectedPartForAdjustment(p);
    setAdjustmentModalMode(mode);
    setAdjustmentModalVisible(true);
  };

  // Extract unique categories from current parts
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(p => {
      if (p.category) set.add(p.category.trim());
    });
    return ['All', ...Array.from(set)];
  }, [parts]);

  // Inventory value and summary calculation
  const { totalValue, lowStockCount, outOfStockCount, inStockCount } = useMemo(() => {
    let value = 0;
    let low = 0;
    let out = 0;
    let inStock = 0;

    parts.forEach(p => {
      const qty = p.qty || 0;
      const cost = p.unitCost || 0;
      value += qty * cost;

      if (qty === 0) {
        out++;
      } else if (qty <= (p.reorder || 0)) {
        low++;
      } else {
        inStock++;
      }
    });

    return {
      totalValue: value,
      lowStockCount: low,
      outOfStockCount: out,
      inStockCount: inStock,
    };
  }, [parts]);

  // Filtered parts
  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        const matchesCat = p.category?.toLowerCase().includes(q);
        const matchesLoc = p.location?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat && !matchesLoc) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Stock Filter
      if (stockFilter === 'out_of_stock' && (p.qty || 0) !== 0) return false;
      if (stockFilter === 'low_stock' && ((p.qty || 0) === 0 || (p.qty || 0) > (p.reorder || 0))) return false;
      if (stockFilter === 'in_stock' && (p.qty || 0) <= (p.reorder || 0)) return false;

      return true;
    });
  }, [parts, searchQuery, selectedCategory, stockFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshParts();
    setIsRefreshing(false);
  };

  const handleAction = (id: string) => {
    router.push(`/(manager)/parts/${id}` as any);
  };

  // Helper for Category Icons
  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    const c = category?.toLowerCase() || '';
    if (c.includes('fluid') || c.includes('oil')) return 'water';
    if (c.includes('brake')) return 'disc';
    if (c.includes('tire') || c.includes('wheel')) return 'ellipse-outline';
    if (c.includes('engine') || c.includes('transmission')) return 'settings';
    if (c.includes('electric') || c.includes('battery')) return 'flash';
    if (c.includes('filter')) return 'funnel';
    if (c.includes('tool')) return 'hammer';
    return 'construct';
  };

  const summaryItems: SummaryItem[] = [
    { label: t('m_parts_total_items', 'Total Items'), count: parts.length, icon: 'layers', color: '#ffffff' },
    { label: t('m_parts_in_stock', 'In Stock'), count: inStockCount, icon: 'checkmark-circle', color: '#10B981' },
    { label: t('m_parts_low_stock', 'Low Stock'), count: lowStockCount, icon: 'warning', color: '#F59E0B' },
    { label: t('m_parts_out_of_stock', 'Out of Stock'), count: outOfStockCount, icon: 'alert-circle', color: '#EF4444' },
    { 
      label: t('m_parts_inventory_value', 'Inventory Value'), 
      count: `GH₵${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: 'cash', 
      color: '#3B82F6' 
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Header */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>{t('m_parts_title', 'Parts & Inventory')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_parts_subtitle', 'Manage stock levels, locations, unit costs, and reorder alerts')}</Text>
        </View>
        <View style={styles.headerBtnGroup}>
          <TouchableOpacity 
            style={styles.refreshBtn} 
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Ionicons name="refresh" size={18} color="#4B5563" style={isRefreshing && { transform: [{ rotate: '45deg' }] }} />
            <Text style={styles.refreshBtnText}>{isRefreshing ? 'Updating...' : 'Refresh'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/parts/new' as any)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('m_parts_add_btn', 'Add Part')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Metrics */}
      <SummaryBox items={summaryItems} />

      {/* Search & Filter Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('m_parts_search_ph', 'Search by part name, SKU, or location...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Dropdown */}
        <View style={styles.categoryPickerWrapper}>
          <Ionicons name="funnel-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
          {Platform.OS === 'web' ? (
            <select
              style={styles.categorySelectWeb}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          ) : (
            <TouchableOpacity style={styles.categorySelectBtn}>
              <Text style={styles.categorySelectBtnText}>{selectedCategory}</Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stock Filter Chips */}
      <View style={styles.stockFilterTabs}>
        <TouchableOpacity
          style={[styles.stockTab, stockFilter === 'All' && styles.stockTabActive]}
          onPress={() => setStockFilter('All')}
        >
          <Text style={[styles.stockTabText, stockFilter === 'All' && styles.stockTabTextActive]}>
            All ({parts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stockTab, stockFilter === 'in_stock' && styles.stockTabActive]}
          onPress={() => setStockFilter('in_stock')}
        >
          <View style={[styles.tabDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.stockTabText, stockFilter === 'in_stock' && styles.stockTabTextActive]}>
            In Stock ({inStockCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stockTab, stockFilter === 'low_stock' && styles.stockTabActive]}
          onPress={() => setStockFilter('low_stock')}
        >
          <View style={[styles.tabDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.stockTabText, stockFilter === 'low_stock' && styles.stockTabTextActive]}>
            Low Stock ({lowStockCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stockTab, stockFilter === 'out_of_stock' && styles.stockTabActive]}
          onPress={() => setStockFilter('out_of_stock')}
        >
          <View style={[styles.tabDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.stockTabText, stockFilter === 'out_of_stock' && styles.stockTabTextActive]}>
            Out of Stock ({outOfStockCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Parts List / Table Container */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#043094" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : filteredParts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery || selectedCategory !== 'All' || stockFilter !== 'All' 
              ? 'No matching parts found' 
              : 'No inventory parts yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedCategory !== 'All' || stockFilter !== 'All'
              ? 'Try adjusting your search query or filters to find what you need.'
              : 'Keep track of spare parts, lubricants, tools, and maintenance stock.'}
          </Text>
          <TouchableOpacity 
            style={styles.emptyBtn} 
            onPress={() => router.push('/(manager)/parts/new' as any)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add New Part</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cardContainer}>
          {/* Desktop Table Header */}
          {!isMobile && (
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2.5 }]}>{t('m_parts_details_th', 'Part Details')}</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>{t('m_parts_category_th', 'Category')}</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>{t('m_parts_quantity_th', 'Stock Level')}</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Unit Cost</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Total Value</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>{t('m_parts_status_th', 'Status')}</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>{t('m_parts_location_th', 'Location')}</Text>
              <View style={{ width: 110 }} />
            </View>
          )}

          {/* Part Items (Responsive) */}
          {filteredParts.map((part, index) => {
            const qty = part.qty || 0;
            const reorder = part.reorder || 0;
            const isOutOfStock = qty === 0;
            const isLowStock = !isOutOfStock && qty <= reorder;

            const unitCostFormatted = (part.unitCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const totalItemValue = ((part.unitCost || 0) * qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            if (isMobile) {
              // Mobile / Split-Screen Card View (< 1024px)
              return (
                <TouchableOpacity 
                  key={part.id} 
                  style={[styles.mobileCard, index === filteredParts.length - 1 && { marginBottom: 0 }]}
                  onPress={() => handleAction(part.id)}
                  activeOpacity={0.7}
                >
                  {/* Card Header */}
                  <View style={styles.mobileCardHeader}>
                    <View style={styles.thumbnailWrapper}>
                      {part.imageUrl ? (
                        <Image source={{ uri: part.imageUrl }} style={styles.thumbnailImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.thumbnailPlaceholder}>
                          <Ionicons name={getCategoryIcon(part.category)} size={24} color="#043094" />
                        </View>
                      )}
                    </View>

                    <View style={styles.mobileTitleBlock}>
                      <Text style={styles.mobilePartName} numberOfLines={1}>{part.name}</Text>
                      <View style={styles.mobileSkuRow}>
                        <View style={styles.skuPill}>
                          <Text style={styles.skuPillText}>SKU: {part.sku}</Text>
                        </View>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>{part.category}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[
                      styles.statusBadge,
                      isOutOfStock ? styles.statusOutOfStock : (isLowStock ? styles.statusWarning : styles.statusSuccess)
                    ]}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: isOutOfStock ? '#DC2626' : (isLowStock ? '#D97706' : '#059669') }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        isOutOfStock ? styles.statusOutOfStockText : (isLowStock ? styles.statusWarningText : styles.statusSuccessText)
                      ]}>
                        {isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock')}
                      </Text>
                    </View>
                  </View>

                  {/* Card Stats Grid */}
                  <View style={styles.mobileStatsGrid}>
                    <View style={styles.mobileStatItem}>
                      <Text style={styles.mobileStatLabel}>In Stock</Text>
                      <Text style={[styles.mobileStatValue, (isOutOfStock || isLowStock) && { color: isOutOfStock ? '#DC2626' : '#D97706' }]}>
                        {qty} <Text style={styles.mobileStatSub}>/ min {reorder}</Text>
                      </Text>
                    </View>

                    <View style={styles.mobileStatItem}>
                      <Text style={styles.mobileStatLabel}>Unit Cost</Text>
                      <Text style={styles.mobileStatValue}>GH₵{unitCostFormatted}</Text>
                    </View>

                    <View style={styles.mobileStatItem}>
                      <Text style={styles.mobileStatLabel}>Total Value</Text>
                      <Text style={[styles.mobileStatValue, { color: '#043094' }]}>GH₵{totalItemValue}</Text>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.mobileCardFooter}>
                    <View style={styles.locationWrapper}>
                      <Ionicons name="location-outline" size={15} color="#6B7280" />
                      <Text style={styles.locationText}>{part.location || 'Warehouse'}</Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity 
                        style={styles.quickUseBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleQuickAdjust(part, 'use');
                        }}
                      >
                        <Ionicons name="arrow-down-circle" size={14} color="#DC2626" />
                        <Text style={styles.quickUseBtnText}>Use Part</Text>
                      </TouchableOpacity>

                      <View style={styles.viewDetailLink}>
                        <Text style={styles.viewDetailText}>Details</Text>
                        <Ionicons name="chevron-forward" size={16} color="#043094" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            // Desktop Table Row (>= 1024px)
            return (
              <TouchableOpacity 
                key={part.id} 
                style={[styles.tableRow, index === filteredParts.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleAction(part.id)}
                activeOpacity={0.7}
              >
                {/* Part Name & Thumbnail */}
                <View style={[styles.td, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={styles.tableThumbnail}>
                    {part.imageUrl ? (
                      <Image source={{ uri: part.imageUrl }} style={styles.thumbnailImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Ionicons name={getCategoryIcon(part.category)} size={20} color="#043094" />
                      </View>
                    )}
                  </View>
                  <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{part.name}</Text>
                    <Text style={styles.itemSku}>{part.sku}</Text>
                  </View>
                </View>

                {/* Category */}
                <View style={[styles.td, { flex: 1.5 }]}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{part.category}</Text>
                  </View>
                </View>

                {/* Quantity */}
                <View style={[styles.td, { flex: 1.2 }]}>
                  <Text style={[styles.cellText, { fontWeight: '700' }, (isOutOfStock || isLowStock) && { color: isOutOfStock ? '#DC2626' : '#D97706' }]}>
                    {qty} units
                  </Text>
                  <Text style={styles.minStockText}>Min: {reorder}</Text>
                </View>

                {/* Unit Cost */}
                <View style={[styles.td, { flex: 1.2 }]}>
                  <Text style={styles.cellText}>GH₵{unitCostFormatted}</Text>
                </View>

                {/* Total Value */}
                <View style={[styles.td, { flex: 1.4 }]}>
                  <Text style={[styles.cellText, { fontWeight: '600', color: '#043094' }]}>
                    GH₵{totalItemValue}
                  </Text>
                </View>

                {/* Status */}
                <View style={[styles.td, { flex: 1.2 }]}>
                  <View style={[
                    styles.statusBadge, 
                    isOutOfStock ? styles.statusOutOfStock : (isLowStock ? styles.statusWarning : styles.statusSuccess)
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: isOutOfStock ? '#DC2626' : (isLowStock ? '#D97706' : '#059669') }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      isOutOfStock ? styles.statusOutOfStockText : (isLowStock ? styles.statusWarningText : styles.statusSuccessText)
                    ]}>
                      {isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock')}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={[styles.td, { flex: 1.5, flexDirection: 'row', alignItems: 'center' }]}>
                  <Ionicons name="location-outline" size={15} color="#9CA3AF" style={{ marginRight: 4 }} />
                  <Text style={styles.cellText} numberOfLines={1}>{part.location || 'Warehouse'}</Text>
                </View>

                {/* Actions */}
                <View style={{ width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity 
                    style={styles.quickUseBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleQuickAdjust(part, 'use');
                    }}
                  >
                    <Ionicons name="arrow-down-circle" size={13} color="#DC2626" />
                    <Text style={styles.quickUseBtnText}>Use</Text>
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Quick Stock Adjustment Modal */}
      <StockAdjustmentModal
        visible={adjustmentModalVisible}
        onClose={() => setAdjustmentModalVisible(false)}
        part={selectedPartForAdjustment}
        initialMode={adjustmentModalMode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  headerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  refreshBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  refreshBtnText: { color: '#4B5563', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  primaryBtn: { 
    backgroundColor: '#043094', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 8,
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6, fontSize: 14 },

  // Action Bar
  actionBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14, 
    flexWrap: 'wrap', 
    gap: 12 
  },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    height: 42, 
    flex: 1, 
    minWidth: 260 
  },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827', fontSize: 14 },
  categoryPickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  categorySelectWeb: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
    cursor: 'pointer',
    outlineStyle: 'none',
  } as any,
  categorySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categorySelectBtnText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },

  // Stock Filter Tabs
  stockFilterTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  stockTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stockTabActive: {
    backgroundColor: '#043094',
    borderColor: '#043094',
  },
  stockTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  stockTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  // Cards & Table
  cardContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  tableHeader: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    backgroundColor: '#F9FAFB', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  th: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 0 },
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  td: { justifyContent: 'center', minWidth: 0 },
  tableThumbnail: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },

  // Mobile Card View
  mobileCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnailWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  mobileTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  mobilePartName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mobileSkuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  skuPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skuPillText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontSize: 11,
    color: '#043094',
    fontWeight: '600',
  },
  mobileStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  mobileStatItem: {
    flex: 1,
  },
  mobileStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  mobileStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  mobileStatSub: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 13,
    color: '#043094',
    fontWeight: '600',
  },
  quickUseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  quickUseBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 12,
  },

  // Desktop Elements
  itemName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemSku: { fontSize: 12, color: '#6B7280', marginTop: 2, fontFamily: 'monospace' },
  cellText: { fontSize: 14, color: '#374151' },
  minStockText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Badges
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    alignSelf: 'flex-start' 
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusWarning: { backgroundColor: '#FEF3C7' },
  statusOutOfStock: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusSuccessText: { color: '#059669' },
  statusWarningText: { color: '#D97706' },
  statusOutOfStockText: { color: '#DC2626' },

  // Empty & Loading States
  loadingContainer: { padding: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  emptyContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 48, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  emptyIconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 400, marginBottom: 20 },
  emptyBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#043094', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 8, 
    gap: 6 
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
