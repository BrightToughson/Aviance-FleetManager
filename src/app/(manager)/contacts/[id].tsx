import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions, Platform, Alert, Linking, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import FormModal, { FormField } from '../../../components/FormModal';
import { useTranslation } from 'react-i18next';
import { usePersonnel } from '../../../context/PersonnelContext';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);

  const { personnel, updatePerson, deletePersons } = usePersonnel();
  
  // Find the contact from global state or fallback to a default if not found yet
  const contact = personnel.find(p => p.id === id) || {
    id: id as string,
    name: 'Loading...',
    role: 'Driver',
    department: 'Fleet',
    contact_type: 'Internal',
    phone: '',
    whatsapp: '',
    email: '',
    avatar: '',
    location: 'Headquarters',
    notes: '',
  };

  const isInternal = contact.contact_type === 'Internal' || contact.role === 'Driver' || contact.role === 'Manager' || (contact as any).isProfile;

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const editFields: FormField[] = [
    { name: 'name', label: t('contact_lbl_name', 'Full Name'), type: 'text', placeholder: 'e.g. John Doe', required: true, defaultValue: contact.name },
    { name: 'role', label: t('contact_lbl_role', 'Job Role'), type: 'select', options: ['Driver', 'Manager', 'Mechanic', 'Supplier', 'Admin', 'Staff'], defaultValue: contact.role },
    { name: 'department', label: t('contact_lbl_dept', 'Department'), type: 'select', options: ['Fleet', 'Operations', 'Maintenance', 'Admin', 'Safety'], defaultValue: contact.department || 'Fleet' },
    { name: 'contact_type', label: 'Contact Type', type: 'select', options: ['Internal', 'External'], defaultValue: contact.contact_type || (isInternal ? 'Internal' : 'External') },
    { name: 'company', label: 'Company (External)', type: 'text', dependsOn: { field: 'contact_type', value: 'External' }, defaultValue: contact.company || '' },
    { name: 'email', label: t('contact_lbl_email', 'Email Address'), type: 'text', defaultValue: contact.email },
    { name: 'phone', label: t('contact_lbl_phone', 'Phone Number'), type: 'text', defaultValue: contact.phone },
    { name: 'whatsapp', label: t('contact_lbl_whatsapp', 'WhatsApp Number'), type: 'text', defaultValue: (contact as any).whatsapp || '' },
    { name: 'location', label: t('contact_lbl_location', 'Location'), type: 'text', defaultValue: (contact as any).location || '' },
    { name: 'avatar', label: t('contact_lbl_avatar', 'Profile Image URL'), type: 'text', defaultValue: contact.avatar },
  ];

  const handleSaveEdit = async (data: any) => {
    try {
      await updatePerson(id as string, data);
      setIsEditModalVisible(false);
      if (Platform.OS === 'web') window.alert("Contact updated successfully!");
      else Alert.alert("Success", "Contact updated successfully!");
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') window.alert("Failed to update contact: " + (err.message || String(err)));
      else Alert.alert("Error", "Failed to update contact: " + (err.message || String(err)));
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await handleSaveEdit({ avatar: result.assets[0].uri });
    }
  };

  const handleDelete = () => {
    const confirmDelete = () => {
      deletePersons([id as string]);
      if (Platform.OS === 'web') window.alert('Contact deleted.');
      router.back();
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this contact?")) confirmDelete();
    } else {
      Alert.alert('Delete Contact', 'Are you sure you want to delete this contact?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backBtnText}>{t('contact_back', 'Back to Contacts')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsMessageModalVisible(true)}>
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            {!isMobile && <Text style={styles.primaryBtnText}>{t('contact_message', 'Message')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={18} color="#4B5563" />
            {!isMobile && <Text style={styles.secondaryBtnText}>{t('common_edit', 'Edit')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} style={{ position: 'relative', marginBottom: 16 }}>
            {contact.avatar ? (
              <Image source={{ uri: contact.avatar }} style={styles.profileAvatar} />
            ) : (
              <View style={[styles.profileAvatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' }]}>
                <Ionicons name="person" size={48} color="#9CA3AF" />
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#043094', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.profileName}>{contact.name}</Text>
          <Text style={styles.roleText}>{contact.role}</Text>
          
          <View style={styles.badgesRow}>
            {contact.department !== 'Unassigned' && (
              <View style={styles.deptBadge}>
                <Ionicons name="business" size={14} color="#1D4ED8" style={{ marginRight: 4 }} />
                <Text style={styles.deptBadgeText}>{contact.department}</Text>
              </View>
            )}
            <View style={[styles.deptBadge, { backgroundColor: (contact.contact_type === 'Internal' || isInternal) ? '#ECFDF5' : '#F3F4F6' }]}>
              <Text style={[styles.deptBadgeText, { color: (contact.contact_type === 'Internal' || isInternal) ? '#059669' : '#4B5563' }]}>
                {contact.contact_type || (isInternal ? 'Internal' : 'External')}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.infoGrid, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.infoColumn, isMobile && { borderRightWidth: 0, borderBottomWidth: 1 }]}>
            <Text style={styles.columnTitle}>{t('contact_methods', 'Contact Methods')}</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="mail" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>{t('contact_email', 'Email')}</Text>
                <Text style={styles.infoText}>{contact.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="call" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>{t('contact_phone', 'Phone')}</Text>
                <Text style={styles.infoText}>{contact.phone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.columnTitle}>{t('contact_add_details', 'Additional Details')}</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="location" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>{t('contact_location', 'Location')}</Text>
                <Text style={styles.infoText}>{contact.location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="document-text" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>{t('contact_notes', 'Notes')}</Text>
                <Text style={styles.infoText}>{contact.notes}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Message Options Modal */}
      <Modal visible={isMessageModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('contact_message_title', 'Contact {{name}}', { name: contact.name })}</Text>
              <TouchableOpacity onPress={() => setIsMessageModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              <TouchableOpacity 
                style={styles.msgOption} 
                onPress={() => {
                  Linking.openURL(`whatsapp://send?phone=${contact.whatsapp}`);
                  setIsMessageModalVisible(false);
                }}
              >
                <View style={[styles.msgIconBox, { backgroundColor: '#DEF7EC' }]}>
                  <Ionicons name="logo-whatsapp" size={24} color="#059669" />
                </View>
                <Text style={styles.msgOptionText}>WhatsApp</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.msgOption} 
                onPress={() => {
                  Linking.openURL(`sms:${contact.phone}`);
                  setIsMessageModalVisible(false);
                }}
              >
                <View style={[styles.msgIconBox, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="chatbox-ellipses" size={24} color="#4338CA" />
                </View>
                <Text style={styles.msgOptionText}>{t('contact_msg_sms', 'SMS Message')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.msgOption} 
                onPress={() => {
                  Linking.openURL(`mailto:${contact.email}`);
                  setIsMessageModalVisible(false);
                }}
              >
                <View style={[styles.msgIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="mail" size={24} color="#DC2626" />
                </View>
                <Text style={styles.msgOptionText}>{t('contact_msg_email', 'Send Email')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Form Modal */}
      <FormModal 
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        title={t('contact_edit_title', 'Edit Contact Profile')}
        fields={editFields}
        onSubmit={handleSaveEdit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 6 },
  primaryBtnText: { color: '#fff', fontWeight: '500', fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  secondaryBtnText: { color: '#4B5563', fontWeight: '500', fontSize: 14 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  profileHeader: { alignItems: 'center', padding: 40, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F8FAFC' },
  profileAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
  profileTitleContainer: { flex: 1 },
  profileName: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  roleText: { fontSize: 16, fontWeight: '500', color: '#64748B', marginBottom: 16 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  idBadge: { backgroundColor: '#E2E8F0', color: '#475569', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  deptBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  deptBadgeText: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  
  infoGrid: { flexDirection: 'row' },
  infoColumn: { flex: 1, padding: 24, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  columnTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 20, letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  infoText: { fontSize: 15, color: '#0F172A', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalOptions: { flexDirection: 'row', justifyContent: 'space-around', padding: 30 },
  msgOption: { alignItems: 'center', gap: 10 },
  msgIconBox: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  msgOptionText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
});
