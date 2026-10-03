import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import FormModal, { FormField } from '../../components/FormModal';
import SummaryBox from '../../components/SummaryBox';
import { usePersonnel } from '../../context/PersonnelContext';

export default function ContactsScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;

  const { personnel, addPerson } = usePersonnel();
  const [searchQuery, setSearchQuery] = useState('');
  const [contactGroup, setContactGroup] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const filteredContacts = useMemo(() => {
    let result = personnel;
    if (contactGroup !== 'All') {
      result = result.filter(c => c.role === contactGroup);
    }
    if (departmentFilter !== 'All') {
      result = result.filter(c => c.department === departmentFilter);
    }
    if (!searchQuery) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) || 
      c.role.toLowerCase().includes(lowerQuery) ||
      c.email.toLowerCase().includes(lowerQuery)
    );
  }, [personnel, searchQuery, contactGroup, departmentFilter]);
  const handleAddContact = (data: any) => {
    addPerson({
      name: data.name || 'New Contact',
      role: data.role || 'Staff',
      department: data.department || 'Operations',
      phone: data.phone || '(555) 000-0000',
      email: data.email || 'unknown@example.com',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80'
    });
  };

  const handleAction = (name: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Message or edit contact: ${name}`);
    } else {
      Alert.alert('Contact', `Message or edit contact: ${name}`);
    }
  };

  const handleExport = () => {
    const csvData = "ID,Name,Role,Department,Email,Phone\n" + 
      filteredContacts.map(c => `${c.id},${c.name},${c.role},${c.department},${c.email},${c.phone}`).join('\n');
      
    if (Platform.OS === 'web') {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_${contactGroup.toLowerCase()}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      Alert.alert('Exported', `Contacts list has been exported to your documents.`);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/vnd.ms-excel', 'text/*'] });
      if (result.canceled) return;
      
      addPerson({
        name: 'New Imported Contact',
        role: 'Imported',
        department: 'General',
        phone: '(555) 000-0000',
        email: 'imported@example.com',
        avatar: 'https://i.pravatar.cc/150?u=' + Math.random() 
      });
      
      if (Platform.OS === 'web') {
        window.alert(`Successfully imported contacts from ${result.assets[0].name}`);
      } else {
        Alert.alert("Import Successful", `Contacts imported from ${result.assets[0].name}`);
      }
    } catch(e) {
      if (Platform.OS === 'web') {
        window.alert("Could not read the import file.");
      } else {
        Alert.alert("Import Failed", "Could not read the file.");
      }
    }
  };

  const modalFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Jane Doe' },
    { name: 'role', label: 'Job Role', type: 'select', options: ['Manager', 'Mechanic', 'Driver', 'Admin'] },
    { name: 'email', label: 'Email Address', type: 'text', placeholder: 'e.g. jane@example.com' },
    { name: 'phone', label: 'Phone Number', type: 'text', placeholder: 'e.g. (555) 123-4567' },
    { name: 'location', label: 'Location/Branch', type: 'text', placeholder: 'e.g. HQ' },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Contacts</Text>
          <Text style={styles.pageSubtitle}>Directory of all internal and external personnel</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Total Contacts', count: personnel.length, icon: 'people', color: '#ffffff' },
        { label: 'Drivers', count: personnel.filter(p => p.role === 'Driver').length, icon: 'car', color: '#34D399' },
        { label: 'Staff/Admins', count: personnel.filter(p => ['Staff', 'Admin', 'Manager'].includes(p.role)).length, icon: 'briefcase', color: '#3B82F6' },
        { label: 'Suppliers', count: personnel.filter(p => p.role === 'Supplier').length, icon: 'business', color: '#F59E0B' }
      ]} />

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {['All', 'Driver', 'Staff', 'Manager', 'Supplier'].map(group => (
            <TouchableOpacity 
              key={group} 
              style={[styles.tabBtn, contactGroup === group && styles.tabBtnActive]}
              onPress={() => setContactGroup(group)}
            >
              <Text style={[styles.tabBtnText, contactGroup === group && styles.tabBtnTextActive]}>
                {group === 'All' ? 'All Contacts' : `${group}s`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={`Search ${contactGroup === 'All' ? '' : contactGroup + ' '}directory...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
        <View style={styles.filterGroup}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterModalVisible(true)}>
            <Ionicons name="filter-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Department {departmentFilter !== 'All' ? `(${departmentFilter})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleImport}>
            <Ionicons name="cloud-upload-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Department</Text>
            <Text style={[styles.th, { flex: 2 }]}>Contact Info</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredContacts.map((contact, index) => (
          <TouchableOpacity 
            key={contact.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredContacts.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => router.push(`/(manager)/contacts/${contact.id}` as any)}
          >
            
            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={styles.infoGroup}>
                <Image source={{ uri: contact.avatar }} style={styles.avatar} />
                <View style={{ paddingRight: 20 }}>
                  <Text style={styles.itemName}>{contact.name}</Text>
                  <Text style={styles.itemSku}>{contact.role}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Department</Text>}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{contact.department}</Text>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && styles.mobileDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
              {isMobile && <Text style={[styles.mobileLabel, { marginBottom: 4 }]}>Contact Info</Text>}
              <View style={!isMobile && { paddingRight: 20 }}>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{contact.phone}</Text>
                </View>
                <View style={[styles.contactRow, { marginTop: 4 }]}>
                  <Ionicons name="mail-outline" size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{contact.email}</Text>
                </View>
              </View>
            </View>

            {!isMobile && (
              <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => handleAction(contact.name)}>
                <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            
          </TouchableOpacity>
        ))}
      </View>
      
      <FormModal 
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Add New Contact"
        fields={modalFields}
        onSubmit={handleAddContact}
      />

      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide">
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Contacts</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>By Department:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {['All', 'Operations', 'Maintenance', 'Admin', 'Safety'].map(dept => (
                  <TouchableOpacity 
                    key={dept} 
                    style={[
                      styles.filterOption, 
                      departmentFilter === dept && styles.filterOptionActive
                    ]}
                    onPress={() => setDepartmentFilter(dept)}
                  >
                    <Text style={[
                      styles.filterOptionText, 
                      departmentFilter === dept && styles.filterOptionTextActive
                    ]}>{dept}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsFilterModalVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  infoGroup: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 15, backgroundColor: '#E5E7EB' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSku: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { fontSize: 13, color: '#374151', marginLeft: 6 },
  tabsContainer: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabsScroll: { flexDirection: 'row', paddingBottom: 2 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 8 },
  tabBtnActive: { borderBottomColor: '#043094' },
  tabBtnText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabBtnTextActive: { color: '#043094' },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  filterOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  filterOptionActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  filterOptionText: { color: '#4B5563', fontSize: 14 },
  filterOptionTextActive: { color: '#1D4ED8', fontWeight: '600' },
  applyBtn: { backgroundColor: '#043094', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
});
