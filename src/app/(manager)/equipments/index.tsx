import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEquipments } from '../../../context/EquipmentContext';

export default function EquipmentListScreen() {
  const router = useRouter();
  const { equipments } = useEquipments();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Modals
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterMake, setFilterMake] = useState('All');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Out of Service': return '#EF4444';
      case 'In Shop': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const filteredEquipments = equipments.filter((v: any) => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = v.name.toLowerCase().includes(q) || 
                            v.make.toLowerCase().includes(q) || 
                            v.model.toLowerCase().includes(q) || 
                            v.serialNumber.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    
    // 2. Filters
    if (filterMake !== 'All' && v.make !== filterMake) return false;

    // 3. Tabs
    if (activeTab === 'Assigned') return v.assignedTo !== null;
    if (activeTab === 'Unassigned') return v.assignedTo === null;
    if (activeTab === 'Archived') return v.status === 'Archived';
    return true; // 'All'
  });

  // Pagination Logic
  const totalItems = filteredEquipments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Safety check if search reduces items below current page
  if (currentPage > totalPages) setCurrentPage(totalPages);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedEquipments = filteredEquipments.slice(startIndex, endIndex);

  const nextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  const handleAction = (action: string) => {
    setActionModalVisible(false);
    if (Platform.OS === 'web') {
      window.alert(`${action} successful for ${selectedEquipment?.name}`);
    } else {
      Alert.alert("Success", `${action} completed for ${selectedEquipment?.name}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Equipments</Text>
          <TouchableOpacity style={styles.learnBadge} onPress={() => router.push('/(manager)/equipments/learn' as any)}>
            <Ionicons name="bulb-outline" size={14} color="#6B7280" style={{marginRight: 4}} />
            <Text style={styles.learnText}>Learn</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(manager)/equipments/scan' as any)}>
            <Ionicons name="qr-code-outline" size={20} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(manager)/equipments/tracking' as any)}>
            <Ionicons name="map-outline" size={20} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(manager)/equipments/add' as any)}>
            <Ionicons name="add" size={18} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.addBtnText}>Add Equipment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {['All', 'Assigned', 'Unassigned', 'Archived'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput 
            placeholder="Search by Name, VIN, Make, Model" 
            style={styles.searchInput} 
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery} 
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filtersGroup}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={14} color="#6B7280" style={{marginRight: 4}} />
            <Text style={styles.filterChipText}>{filterMake === 'All' ? 'Filters' : `Make: ${filterMake}`}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pagination}>
          <Text style={styles.paginationText}>{totalItems > 0 ? `${startIndex + 1} - ${endIndex} of ${totalItems}` : '0 - 0 of 0'}</Text>
          <TouchableOpacity style={[styles.pageBtn, currentPage === 1 && {opacity: 0.5}]} onPress={prevPage} disabled={currentPage === 1}>
            <Ionicons name="chevron-back" size={16} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pageBtn, currentPage === totalPages && {opacity: 0.5}]} onPress={nextPage} disabled={currentPage === totalPages}>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Table */}
      <ScrollView horizontal contentContainerStyle={{minWidth: 1400, paddingBottom: 20}}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Ionicons name="square-outline" size={18} color="#D1D5DB" style={{ width: 40, paddingLeft: 10 }} />
            <Text style={[styles.th, { width: 180 }]}>Name</Text>
            <Text style={[styles.th, { width: 100 }]}>Year</Text>
            <Text style={[styles.th, { width: 140 }]}>Make</Text>
            <Text style={[styles.th, { width: 140 }]}>Model</Text>
            <Text style={[styles.th, { width: 220 }]}>VIN</Text>
            <Text style={[styles.th, { width: 150 }]}>Status</Text>
            <Text style={[styles.th, { width: 120 }]}>Type</Text>
            <Text style={[styles.th, { width: 140 }]}>Group</Text>
            <Text style={[styles.th, { width: 120 }]}>Current Meter</Text>
            <Text style={[styles.th, { width: 140 }]}>License Plate</Text>
            <Text style={[styles.th, { width: 60 }]}></Text>
          </View>

          {/* Table Rows */}
          <ScrollView style={{flex: 1}}>
            {paginatedEquipments.map((equipment: any, index: number) => (
              <TouchableOpacity key={equipment.id} style={[styles.tableRow, index % 2 === 0 ? {backgroundColor: '#F9FAFB'} : {backgroundColor: '#FFFFFF'}]} onPress={() => router.push(`/(manager)/equipments/${equipment.id}` as any)}>
                <View style={{ width: 40, justifyContent: 'center', paddingLeft: 10 }}>
                  <Ionicons name="square-outline" size={18} color="#D1D5DB" />
                </View>
                <View style={{ width: 180, flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{uri: equipment.image}} style={styles.rowImg} />
                  <Text style={[styles.td, {fontWeight: '600', color: '#111827'}]}>{equipment.name}</Text>
                </View>
                <Text style={[styles.td, { width: 100 }]}>{equipment.year}</Text>
                <Text style={[styles.td, { width: 140 }]}>{equipment.make}</Text>
                <Text style={[styles.td, { width: 140 }]}>{equipment.model}</Text>
                <Text style={[styles.td, { width: 220, color: '#6B7280' }]}>{equipment.serialNumber}</Text>
                <View style={{ width: 150, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(equipment.status) }]} />
                  <Text style={[styles.td, { flex: 0 }]}>{equipment.status}</Text>
                </View>
                <Text style={[styles.td, { width: 120 }]}>{equipment.type}</Text>
                <Text style={[styles.td, { width: 140 }]}>{equipment.group}</Text>
                <Text style={[styles.td, { width: 120 }]}>{equipment.meter}</Text>
                <Text style={[styles.td, { width: 140 }]}>{equipment.plate}</Text>
                <TouchableOpacity 
                  style={{ width: 60, alignItems: 'center', padding: 10 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedEquipment(equipment);
                    setActionModalVisible(true);
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actions for {selectedEquipment?.name}</Text>
            
            <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction('Assign Driver')}>
              <Ionicons name="person-add-outline" size={20} color="#043094" />
              <Text style={styles.modalBtnText}>Assign Driver</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction('Reassign Driver')}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#F59E0B" />
              <Text style={styles.modalBtnText}>Reassign Driver</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction('Remove Driver')}>
              <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
              <Text style={[styles.modalBtnText, { color: '#EF4444' }]}>Remove Driver</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction('Archive Equipment')}>
              <Ionicons name="archive-outline" size={20} color="#6B7280" />
              <Text style={styles.modalBtnText}>Archive Equipment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalBtn, { borderBottomWidth: 0 }]} onPress={() => handleAction('Delete Equipment')}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.modalBtnText, { color: '#EF4444' }]}>Delete Equipment</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 300 }]}>
            <Text style={styles.modalTitle}>Filter Equipments</Text>
            
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>By Make:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {['All', 'Caterpillar', 'New Holland', 'Toyota', 'Freightliner'].map(make => (
                <TouchableOpacity 
                  key={make} 
                  style={[styles.filterOption, filterMake === make && styles.filterOptionActive]}
                  onPress={() => setFilterMake(make)}
                >
                  <Text style={[styles.filterOptionText, filterMake === make && styles.filterOptionTextActive]}>{make}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10, flexWrap: 'wrap', gap: 15 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  learnBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  learnText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#043094' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  activeTabText: { color: '#043094', fontWeight: '700' },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingHorizontal: 20, flexWrap: 'wrap' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 10, height: 36, width: 250, marginRight: 15 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827', outlineStyle: 'none' } as any,
  filtersGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 32, marginRight: 10 },
  filterChipText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 32 },
  pagination: { flexDirection: 'row', alignItems: 'center' },
  paginationText: { fontSize: 13, color: '#6B7280', marginRight: 15 },
  pageBtn: { padding: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, marginLeft: 5, backgroundColor: '#F9FAFB' },
  table: { flex: 1, paddingHorizontal: 20 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', paddingRight: 10 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  td: { fontSize: 14, color: '#374151', flex: 1, paddingRight: 10 },
  rowImg: { width: 32, height: 32, borderRadius: 4, marginRight: 12, backgroundColor: '#E5E7EB' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: 250, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalBtnText: { fontSize: 16, color: '#374151', marginLeft: 12 },
  filterOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  filterOptionActive: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  filterOptionText: { fontSize: 14, color: '#4B5563' },
  filterOptionTextActive: { color: '#1D4ED8', fontWeight: '500' },
  applyBtn: { backgroundColor: '#043094', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 }
});
