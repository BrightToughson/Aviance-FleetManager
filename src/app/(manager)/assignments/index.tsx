import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAssignments } from '../../../context/AssignmentsContext';
import { useTranslation } from 'react-i18next';

export default function AssignmentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState('All Time');
  const [filterDriver, setFilterDriver] = useState('');

  const { assignments, deleteAssignment } = useAssignments();

  const filteredAssignments = assignments.filter(a => {
    // 1. Tab Status Filter
    if (activeTab === 'In Progress' && a.status !== 'In Progress') return false;
    if (activeTab === 'Pending' && a.status !== 'Pending') return false;
    if (activeTab === 'Completed' && a.status !== 'Completed') return false;
    
    // 2. Search Text Filter (Driver Name, Route, Vehicle)
    const s = searchQuery.toLowerCase();
    if (s && !(
      (a.driverName?.toLowerCase().includes(s)) ||
      (a.vehicle?.toLowerCase().includes(s)) ||
      (a.pickupLocation?.toLowerCase().includes(s)) ||
      (a.dropoffLocation?.toLowerCase().includes(s))
    )) {
      return false;
    }

    // 3. Modal Filters: Driver Name
    if (filterDriver && a.driverName && !a.driverName.toLowerCase().includes(filterDriver.toLowerCase())) {
      return false;
    }

    // 4. Modal Filters: Date Range
    if (filterDateRange !== 'All Time' && a.date) {
      const aDate = new Date(a.date);
      const today = new Date();
      if (filterDateRange === 'Today') {
        if (aDate.toDateString() !== today.toDateString()) return false;
      } else if (filterDateRange === 'This Week') {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        if (aDate < weekAgo) return false;
      }
    }

    return true;
  }).map(a => ({
    id: a.id,
    driverName: a.driverName || t('dash_status_unassigned', 'Unassigned'),
    driverImage: a.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150', // Fallback image
    vehicle: a.vehicle,
    route: `${a.pickupLocation} to ${a.dropoffLocation}`,
    time: `${a.startTime} - ${a.endTime}`,
    status: a.status
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'Pending': return { bg: '#FEF3C7', text: '#D97706' };
      case 'Completed': return { bg: '#D1FAE5', text: '#059669' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t('assign_title', 'Driver Assigned')}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(manager)/assignments/new')}>
            <Ionicons name="add" size={18} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.addBtnText}>{t('assign_new', 'New Assignment')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {['All', 'In Progress', 'Completed'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{t(`assign_tab_${tab.toLowerCase().replace(' ', '_')}`, tab)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput 
            placeholder={t('assign_search', 'Search drivers or routes')} 
            style={styles.searchInput} 
            placeholderTextColor="#9CA3AF" 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, (filterDateRange !== 'All Time' || filterDriver) && styles.filterBtnActive]} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={14} color={(filterDateRange !== 'All Time' || filterDriver) ? "#043094" : "#6B7280"} style={{marginRight: 4}} />
          <Text style={[styles.filterBtnText, (filterDateRange !== 'All Time' || filterDriver) && {color: '#043094'}]}>{t('veh_filters', 'Filters')}</Text>
        </TouchableOpacity>
      </View>

      {/* Assignment List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredAssignments.map((assignment) => (
          <TouchableOpacity 
            key={assignment.id} 
            style={styles.card}
            onPress={() => router.push({ pathname: '/(manager)/assignments/task/[taskId]', params: { taskId: assignment.id } })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.driverInfo}>
                <Image source={{uri: assignment.driverImage}} style={styles.driverImg} />
                <Text style={styles.driverName}>{assignment.driverName}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status).bg }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(assignment.status).text }]}>{t(`assign_status_${assignment.status.toLowerCase().replace(' ', '_')}`, assignment.status)}</Text>
                </View>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('assign_delete_confirm', 'Are you sure you want to delete this assignment?'))) {
                      deleteAssignment(assignment.id);
                    }
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Ionicons name="map-outline" size={16} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText}>{assignment.route}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText}>{assignment.time}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="car-outline" size={16} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText}>{assignment.vehicle}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent={true} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date Range</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['All Time', 'Today', 'This Week'].map(range => (
                  <TouchableOpacity 
                    key={range}
                    style={[styles.filterChip, filterDateRange === range && styles.filterChipActive]}
                    onPress={() => setFilterDateRange(range)}
                  >
                    <Text style={[styles.filterChipText, filterDateRange === range && styles.filterChipTextActive]}>{range}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Specific Driver Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#9CA3AF" style={{marginRight: 10}} />
                <TextInput 
                  style={styles.searchInput} 
                  placeholder="e.g. Bright Osai"
                  value={filterDriver}
                  onChangeText={setFilterDriver}
                />
              </View>
            </View>

            <View style={styles.footerBtns}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setFilterDateRange('All Time'); setFilterDriver(''); }}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043094', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, shadowColor: '#043094', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 8 },
  tab: { paddingVertical: 14, marginRight: 28, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#043094' },
  tabText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  activeTabText: { color: '#043094', fontWeight: '800' },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingHorizontal: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 44, flex: 1, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111827', outlineStyle: 'none' } as any,
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  filterBtnActive: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  filterBtnText: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  listContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverImg: { width: 44, height: 44, borderRadius: 22, marginRight: 14, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#F9FAFB' },
  driverName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBody: { gap: 10, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { marginRight: 10, width: 22, textAlign: 'center' },
  infoText: { fontSize: 15, color: '#4B5563', flex: 1, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderRadius: Platform.OS === 'web' ? 28 : 0, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, width: Platform.OS === 'web' ? 400 : '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 50 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#043094', borderColor: '#043094' },
  filterChipText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  footerBtns: { flexDirection: 'row', marginTop: 10, gap: 12 },
  clearBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12 },
  clearBtnText: { color: '#4B5563', fontWeight: '700', fontSize: 15 },
  applyBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', backgroundColor: '#043094', borderRadius: 12 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});
