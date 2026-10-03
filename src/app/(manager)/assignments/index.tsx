import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const MOCK_ASSIGNMENTS = [
  { id: '1', driverName: 'John Doe', driverImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150', vehicle: 'Toyota Sienna (ABC-9876)', route: 'Accra Central to Osu', time: '03:00 PM - 07:00 PM', status: 'Pending' },
  { id: '2', driverName: 'Jane Smith', driverImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150', vehicle: 'Ford Transit (XYZ-1234)', route: 'Tema Port to Ashaiman', time: '09:00 AM - 02:00 PM', status: 'In Progress' },
  { id: '3', driverName: 'Michael Johnson', driverImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150', vehicle: 'Freightliner Cascadia (BL102)', route: 'Kumasi Highway Express', time: '06:00 AM - 06:00 PM', status: 'Completed' },
];

export default function AssignmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');

  const filteredAssignments = MOCK_ASSIGNMENTS.filter(a => {
    if (activeTab === 'In Progress') return a.status === 'In Progress';
    if (activeTab === 'Pending') return a.status === 'Pending';
    if (activeTab === 'Completed') return a.status === 'Completed';
    return true; // 'All'
  });

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
          <Text style={styles.title}>Driver Assigned</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(manager)/assignments/new')}>
            <Ionicons name="add" size={18} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.addBtnText}>New Assignment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {['All', 'Pending', 'In Progress', 'Completed'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput placeholder="Search drivers or routes" style={styles.searchInput} placeholderTextColor="#9CA3AF" />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="filter" size={14} color="#6B7280" style={{marginRight: 4}} />
          <Text style={styles.filterBtnText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Assignment List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredAssignments.map((assignment) => (
          <TouchableOpacity 
            key={assignment.id} 
            style={styles.card}
            onPress={() => router.push({ pathname: '/(manager)/assignments/[id]', params: { id: assignment.id } })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.driverInfo}>
                <Image source={{uri: assignment.driverImage}} style={styles.driverImg} />
                <Text style={styles.driverName}>{assignment.driverName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status).bg }]}>
                <Text style={[styles.statusText, { color: getStatusColor(assignment.status).text }]}>{assignment.status}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#043094' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  activeTabText: { color: '#043094', fontWeight: '700' },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingHorizontal: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 10, height: 36, flex: 1, marginRight: 10 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827', outlineStyle: 'none' } as any,
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
  filterBtnText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  listContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverImg: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E5E7EB' },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { marginRight: 8, width: 20, textAlign: 'center' },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1 }
});
