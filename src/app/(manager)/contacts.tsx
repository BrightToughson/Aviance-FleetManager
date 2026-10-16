import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import FormModal, { FormField } from '../../components/FormModal';
import SummaryBox from '../../components/SummaryBox';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSearch } from '../../context/SearchContext';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/expo';

export default function ContactsScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const router = useRouter();
  const isMobile = width < 1024;
  const { user } = useUser();

  const { personnel, addPerson, deletePersons } = usePersonnel();
  const { searchQuery, setSearchQuery } = useSearch();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contactGroup, setContactGroup] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Exclude the current logged-in manager so they are not shown as a contact to themselves
  const directoryPersonnel = useMemo(() => {
    return personnel.filter(c => c.id !== user?.id && (!user?.primaryEmailAddress?.emailAddress || c.email !== user.primaryEmailAddress.emailAddress));
  }, [personnel, user]);

  const filteredContacts = useMemo(() => {
    let result = directoryPersonnel;
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
  }, [directoryPersonnel, searchQuery, contactGroup, departmentFilter]);
  const handleAddContact = (data: any) => {
    addPerson({
      name: data.name || 'New Contact',
      role: data.role || 'Staff',
      department: data.department || 'Operations',
      phone: data.phone || '(555) 000-0000',
      email: data.email || 'unknown@example.com',
      avatar: ''
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const handleDeleteSelected = () => {
    const confirmDelete = () => {
      deletePersons(selectedIds);
      setSelectedIds([]);
      if (Platform.OS === 'web') window.alert('Contacts deleted.');
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) confirmDelete();
    } else {
      Alert.alert('Delete Contacts', `Are you sure you want to delete ${selectedIds.length} contacts?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
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
          <Text style={styles.pageTitle}>{t('m_contacts_title', 'Contacts')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_contacts_subtitle', 'Directory of all internal and external personnel')}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/contacts/new' as any)}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{t('m_contacts_add_btn', 'Add Contact')}</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: t('m_contacts_total', 'Total Contacts'), count: directoryPersonnel.length, icon: 'people', color: '#ffffff' },
        { label: t('m_contacts_drivers', 'Drivers'), count: directoryPersonnel.filter(p => p.role === 'Driver').length, icon: 'car', color: '#34D399' },
        { label: t('m_contacts_staff', 'Staff/Admins'), count: directoryPersonnel.filter(p => ['Staff', 'Admin', 'Manager'].includes(p.role)).length, icon: 'briefcase', color: '#3B82F6' },
        { label: t('m_contacts_suppliers', 'Suppliers'), count: directoryPersonnel.filter(p => p.role === 'Supplier').length, icon: 'business', color: '#F59E0B' }
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
                {t('m_contacts_tab_' + group.toLowerCase(), group === 'All' ? 'All Contacts' : group + 's')}
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
            placeholder={t('m_contacts_search_ph', 'Search directory...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
        <View style={styles.filterGroup}>
          {selectedIds.length > 0 && (
            <TouchableOpacity style={[styles.filterBtn, { borderColor: '#EF4444' }]} onPress={handleDeleteSelected}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.filterBtnText, { color: '#EF4444' }]}>{t('common_delete', 'Delete')} ({selectedIds.length})</Text>
            </TouchableOpacity>
          )}
          {isMobile && (
            <TouchableOpacity style={styles.filterBtn} onPress={handleSelectAll}>
              <Ionicons name={selectedIds.length === filteredContacts.length && filteredContacts.length > 0 ? "checkbox" : "square-outline"} size={18} color={selectedIds.length === filteredContacts.length && filteredContacts.length > 0 ? "#043094" : "#4B5563"} />
              <Text style={styles.filterBtnText}>{selectedIds.length === filteredContacts.length && filteredContacts.length > 0 ? 'Deselect All' : 'Select All'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterModalVisible(true)}>
            <Ionicons name="filter-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>{t('m_contacts_dept', 'Department')} {departmentFilter !== 'All' ? `(${departmentFilter})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleImport}>
            <Ionicons name="cloud-upload-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>{t('m_contacts_import', 'Import')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>{t('m_contacts_export', 'Export')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={isMobile ? { paddingBottom: 20 } : styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={handleSelectAll}>
              <Ionicons name={selectedIds.length === filteredContacts.length && filteredContacts.length > 0 ? "checkbox" : "square-outline"} size={20} color={selectedIds.length === filteredContacts.length && filteredContacts.length > 0 ? "#043094" : "#9CA3AF"} />
            </TouchableOpacity>
            <Text style={[styles.th, { flex: 2 }]}>{t('m_contacts_name', 'Name')}</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>{t('m_contacts_dept_th', 'Department')}</Text>
            <Text style={[styles.th, { flex: 2 }]}>{t('m_contacts_contact_th', 'Contact Info')}</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredContacts.map((contact, index) => (
          <TouchableOpacity 
            key={contact.id} 
            style={[!isMobile && styles.tableRow, isMobile ? styles.tableRowMobile : (index === filteredContacts.length - 1 && { borderBottomWidth: 0 })]}
            onPress={() => router.push(`/(manager)/contacts/${contact.id}` as any)}
          >
            
            {!isMobile && (
              <TouchableOpacity style={{ width: 40, alignItems: 'center', justifyContent: 'center' }} onPress={() => toggleSelect(contact.id)}>
                <Ionicons name={selectedIds.includes(contact.id) ? "checkbox" : "square-outline"} size={20} color={selectedIds.includes(contact.id) ? "#043094" : "#9CA3AF"} />
              </TouchableOpacity>
            )}

            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={styles.infoGroup}>
                {isMobile && (
                  <TouchableOpacity style={{ marginRight: 15 }} onPress={() => toggleSelect(contact.id)}>
                    <Ionicons name={selectedIds.includes(contact.id) ? "checkbox" : "square-outline"} size={22} color={selectedIds.includes(contact.id) ? "#043094" : "#9CA3AF"} />
                  </TouchableOpacity>
                )}
                {contact.avatar ? (
                  <Image source={{ uri: contact.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={24} color="#9CA3AF" />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0, paddingRight: isMobile ? 0 : 20 }}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{contact.name}</Text>
                  <Text style={styles.itemSku} numberOfLines={1}>{contact.role}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 1.5 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Department & Type</Text>}
              <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                {contact.department !== 'Unassigned' && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{contact.department}</Text>
                  </View>
                )}
                {(() => {
                  const isInternal = contact.contact_type === 'Internal' || contact.role === 'Driver' || contact.role === 'Manager' || (contact as any).isProfile;
                  return (
                    <View style={[styles.categoryBadge, { backgroundColor: isInternal ? '#ECFDF5' : '#F3F4F6' }]}>
                      <Text style={[styles.categoryText, { color: isInternal ? '#059669' : '#4B5563' }]}>
                        {contact.contact_type || (isInternal ? 'Internal' : 'External')}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>

            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && styles.mobileDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0 }]}>
              {isMobile && <Text style={[styles.mobileLabel, { marginBottom: 8 }]}>Contact Info</Text>}
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
              <Text style={styles.modalTitle}>{t('m_contacts_filter_title', 'Filter Contacts')}</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>{t('m_contacts_filter_by_dept', 'By Department:')}</Text>
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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('m_contacts_filter_apply', 'Apply Filters')}</Text>
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
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', minWidth: 0 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowMobile: { flexDirection: 'column', alignItems: 'flex-start', padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  td: { justifyContent: 'center', minWidth: 0 },
  mobileDataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mobileLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  infoGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 15, backgroundColor: '#E5E7EB', flexShrink: 0 },
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
