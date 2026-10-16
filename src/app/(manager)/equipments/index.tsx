import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEquipments } from '../../../context/EquipmentContext';
import { usePersonnel } from '../../../context/PersonnelContext';
import { useTranslation } from 'react-i18next';

export default function EquipmentListScreen() {
  const router = useRouter();
  const { equipments, updateEquipmentData, deleteEquipment } = useEquipments();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Modals
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterMake, setFilterMake] = useState('All');
  
  // Checkout Modal
  const { personnel } = usePersonnel();
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [isManualCheckout, setIsManualCheckout] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const users = personnel.filter((p: any) => p.name.toLowerCase().includes(userSearchQuery.toLowerCase()));
  
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
    if (activeTab === t('equip_tab_checked_out', 'Checked Out')) return v.assignedTo !== null;
    if (activeTab === t('equip_tab_available', 'Available')) return v.assignedTo === null;
    if (activeTab === t('equip_tab_archived', 'Archived')) return v.status === 'Archived';
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

  const handleAction = async (action: string) => {
    setActionModalVisible(false);
    
    if (action === t('equip_action_checkout', 'Check Out') || action === t('equip_action_change_user', 'Change User')) {
      setTimeout(() => setCheckoutModalVisible(true), 300);
      return;
    }

    if (action === t('equip_action_return', 'Return Equipment') || action === 'Confirm Return') {
      if (selectedEquipment) {
        // We'll pass assignedTo: 'Unassigned' to clear it
        await updateEquipmentData(selectedEquipment.id, { 
          assignedTo: 'Unassigned',
          manualPhone: null,
          checked_out_at: null,
          status: 'available'
        });
        if (Platform.OS === 'web') {
          window.alert(t('equip_action_success', '{{name}} has been returned', { name: selectedEquipment?.name }));
        } else {
          Alert.alert(t('common_success', 'Success'), t('equip_action_success', '{{name}} has been returned', { name: selectedEquipment?.name }));
        }
      }
      return;
    }

    if (action === t('equip_action_delete', 'Delete Equipment')) {
      if (selectedEquipment) {
        if (Platform.OS === 'web') {
          if (window.confirm(`Are you sure you want to delete ${selectedEquipment.name}?`)) {
            await deleteEquipment(selectedEquipment.id);
          }
        } else {
          Alert.alert(
            'Delete Equipment',
            `Are you sure you want to delete ${selectedEquipment.name}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => await deleteEquipment(selectedEquipment.id) }
            ]
          );
        }
      }
      return;
    }

    if (Platform.OS === 'web') {
      window.alert(t('equip_action_success', '{{action}} successful for {{name}}', { action, name: selectedEquipment?.name }));
    } else {
      Alert.alert(t('common_success', 'Success'), t('equip_action_success', '{{action}} successful for {{name}}', { action, name: selectedEquipment?.name }));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t('equip_title', 'Equipments')}</Text>
          <TouchableOpacity style={styles.learnBadge} onPress={() => router.push('/(manager)/equipments/learn' as any)}>
            <Ionicons name="bulb-outline" size={14} color="#6B7280" style={{marginRight: 4}} />
            <Text style={styles.learnText}>{t('common_learn', 'Learn')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(manager)/equipments/scan' as any)}>
            <Ionicons name="qr-code-outline" size={20} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(manager)/equipments/add' as any)}>
            <Ionicons name="add" size={18} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.addBtnText}>{t('equip_add_btn', 'Add Equipment')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[t('common_all', 'All'), t('equip_tab_checked_out', 'Checked Out'), t('equip_tab_available', 'Available'), t('equip_tab_archived', 'Archived')].map(tab => (
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
            placeholder={t('equip_search_ph', 'Search by Name, VIN, Make, Model')}
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
            <Text style={styles.filterChipText}>{filterMake === 'All' ? t('common_filters', 'Filters') : `${t('equip_filter_make', 'Make')}: ${filterMake}`}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pagination}>
          <Text style={styles.paginationText}>{totalItems > 0 ? `${startIndex + 1} - ${endIndex} ${t('common_of', 'of')} ${totalItems}` : `0 - 0 ${t('common_of', 'of')} 0`}</Text>
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
            <Text style={[styles.th, { width: 180 }]}>{t('equip_col_name', 'Name')}</Text>
            <Text style={[styles.th, { width: 100 }]}>{t('equip_col_year', 'Year')}</Text>
            <Text style={[styles.th, { width: 140 }]}>{t('equip_col_make', 'Make')}</Text>
            <Text style={[styles.th, { width: 140 }]}>{t('equip_col_model', 'Model')}</Text>
            <Text style={[styles.th, { width: 220 }]}>{t('equip_col_vin', 'VIN')}</Text>
            <Text style={[styles.th, { width: 150 }]}>{t('equip_col_status', 'Status')}</Text>
            <Text style={[styles.th, { width: 120 }]}>{t('equip_col_type', 'Type')}</Text>
            <Text style={[styles.th, { width: 140 }]}>{t('equip_col_group', 'Group')}</Text>
            <Text style={[styles.th, { width: 120 }]}>{t('equip_col_meter', 'Current Meter')}</Text>
            <Text style={[styles.th, { width: 140 }]}>{t('equip_col_plate', 'License Plate')}</Text>
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
            <Text style={styles.modalTitle}>{t('equip_actions_for', 'Actions for {{name}}', { name: selectedEquipment?.name })}</Text>
            
            {(!selectedEquipment?.assignedTo || selectedEquipment?.assignedTo === 'Unassigned') ? (
              <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction(t('equip_action_checkout', 'Check Out'))}>
                <Ionicons name="log-out-outline" size={20} color="#043094" />
                <Text style={styles.modalBtnText}>{t('equip_action_checkout', 'Check Out')}</Text>
              </TouchableOpacity>
            ) : selectedEquipment?.status === 'pending_return' ? (
              <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction('Confirm Return')}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                <Text style={[styles.modalBtnText, { color: '#10B981' }]}>Confirm Return</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction(t('equip_action_change_user', 'Change User'))}>
                  <Ionicons name="swap-horizontal-outline" size={20} color="#F59E0B" />
                  <Text style={styles.modalBtnText}>{t('equip_action_change_user', 'Change User')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction(t('equip_action_return', 'Return Equipment'))}>
                  <Ionicons name="log-in-outline" size={20} color="#10B981" />
                  <Text style={[styles.modalBtnText, { color: '#10B981' }]}>{t('equip_action_return', 'Return Equipment')}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={() => handleAction(t('equip_action_archive', 'Archive Equipment'))}>
              <Ionicons name="archive-outline" size={20} color="#6B7280" />
              <Text style={styles.modalBtnText}>{t('equip_action_archive', 'Archive Equipment')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalBtn, { borderBottomWidth: 0 }]} onPress={() => handleAction(t('equip_action_delete', 'Delete Equipment'))}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.modalBtnText, { color: '#EF4444' }]}>{t('equip_action_delete', 'Delete Equipment')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 300 }]}>
            <Text style={styles.modalTitle}>{t('equip_filter_title', 'Filter Equipments')}</Text>
            
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>{t('equip_filter_by_make', 'By Make:')}</Text>
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
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('common_apply_filters', 'Apply Filters')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={checkoutModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxWidth: 450, maxHeight: '85%', padding: 0, overflow: 'hidden' }]}>
            
            {/* Header */}
            <View style={{ backgroundColor: '#F8FAFC', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                  <Ionicons name="log-out-outline" size={24} color="#043094" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A' }}>Check Out Equipment</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{selectedEquipment?.name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <View style={{ padding: 20 }}>
              {/* Segmented Control */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: !isManualCheckout ? '#fff' : 'transparent', borderRadius: 8, shadowColor: !isManualCheckout ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: !isManualCheckout ? 2 : 0 }}
                  onPress={() => setIsManualCheckout(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: !isManualCheckout ? '#0F172A' : '#64748B' }}>System User</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: isManualCheckout ? '#fff' : 'transparent', borderRadius: 8, shadowColor: isManualCheckout ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: isManualCheckout ? 2 : 0 }}
                  onPress={() => setIsManualCheckout(true)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isManualCheckout ? '#0F172A' : '#64748B' }}>Manual Entry</Text>
                </TouchableOpacity>
              </View>

              {isManualCheckout ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 }}>External Worker / Contractor Name</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 }}>
                    <Ionicons name="person-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput 
                      style={{ flex: 1, paddingVertical: 15, fontSize: 15, color: '#0F172A' }} 
                      placeholder="e.g. Bob Smith (Plumbing Co)"
                      placeholderTextColor="#94A3B8"
                      value={manualName}
                      onChangeText={setManualName}
                    />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 }}>Phone Number</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 15, marginBottom: 25 }}>
                    <Ionicons name="call-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput 
                      style={{ flex: 1, paddingVertical: 15, fontSize: 15, color: '#0F172A' }} 
                      placeholder="e.g. +1 234 567 8900"
                      placeholderTextColor="#94A3B8"
                      value={manualPhone}
                      onChangeText={setManualPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#043094', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 10 }}
                    onPress={async () => {
                      if (!manualName.trim()) {
                        if (Platform.OS === 'web') window.alert("Please enter a name");
                        else Alert.alert("Error", "Please enter a name");
                        return;
                      }
                      setCheckoutModalVisible(false);
                      await updateEquipmentData(selectedEquipment.id, { 
                        assignedTo: manualName,
                        assignedToId: 'manual',
                        manualPhone: manualPhone,
                        checked_out_at: new Date().toISOString()
                      });
                      setManualName('');
                      setManualPhone('');
                      if (Platform.OS === 'web') window.alert(`Successfully checked out ${selectedEquipment?.name} to ${manualName}`);
                      else Alert.alert('Success', `Successfully checked out ${selectedEquipment?.name} to ${manualName}`);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Confirm Checkout</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flex: 1, maxHeight: 400 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 }}>
                    <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput 
                      style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: '#0F172A' }} 
                      placeholder="Search personnel..."
                      placeholderTextColor="#94A3B8"
                      value={userSearchQuery}
                      onChangeText={setUserSearchQuery}
                    />
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {users.length === 0 ? (
                      <View style={{ alignItems: 'center', padding: 30 }}>
                        <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                        <Text style={{ textAlign: 'center', marginTop: 15, color: '#64748B', fontSize: 15 }}>No personnel found matching "{userSearchQuery}".</Text>
                      </View>
                    ) : (
                      users.map((user: any) => (
                        <TouchableOpacity 
                          key={user.id} 
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginBottom: 10 }}
                          onPress={async () => {
                            setCheckoutModalVisible(false);
                            await updateEquipmentData(selectedEquipment.id, { 
                              assignedTo: user.name,
                              assignedToId: user.id,
                              manualPhone: null,
                              checked_out_at: new Date().toISOString()
                            });
                            setUserSearchQuery('');
                            if (Platform.OS === 'web') {
                              window.alert(`Successfully checked out ${selectedEquipment?.name} to ${user.name}`);
                            } else {
                              Alert.alert('Success', `Successfully checked out ${selectedEquipment?.name} to ${user.name}`);
                            }
                          }}
                        >
                          {user.avatar ? (
                            <Image source={{ uri: user.avatar }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 15 }} />
                          ) : (
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                              <Ionicons name="person" size={20} color="#94A3B8" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>{user.name}</Text>
                            <Text style={{ fontSize: 13, color: '#64748B' }}>{user.role} • {user.phone || user.email}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
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
