import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions, Platform, Alert, Linking, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FormModal, { FormField } from '../../../components/FormModal';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);

  // Local state for the contact profile
  const [contact, setContact] = useState({
    id: id as string,
    name: id === 'CNT-001' ? 'Michael Scott' : 'Contact Name',
    role: 'Regional Manager',
    department: 'Operations',
    phone: '(555) 123-4567',
    whatsapp: '15551234567',
    email: 'mscott@aviance.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    location: 'Headquarters',
    notes: 'Primary point of contact for regional fleet ops.',
  });

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const editFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. John Doe', required: true, defaultValue: contact.name },
    { name: 'role', label: 'Job Role', type: 'text', defaultValue: contact.role },
    { name: 'department', label: 'Department', type: 'select', options: ['Operations', 'Maintenance', 'Admin', 'Safety'], defaultValue: contact.department },
    { name: 'email', label: 'Email Address', type: 'text', defaultValue: contact.email },
    { name: 'phone', label: 'Phone Number', type: 'text', defaultValue: contact.phone },
    { name: 'whatsapp', label: 'WhatsApp Number', type: 'text', defaultValue: contact.whatsapp },
    { name: 'location', label: 'Location', type: 'text', defaultValue: contact.location },
  ];

  const handleSaveEdit = (data: any) => {
    setContact({ ...contact, ...data });
    setIsEditModalVisible(false);
    if (Platform.OS === 'web') window.alert("Contact updated successfully!");
    else Alert.alert("Success", "Contact updated successfully!");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backBtnText}>Back to Contacts</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsMessageModalVisible(true)}>
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={18} color="#4B5563" />
            <Text style={styles.secondaryBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Profile Section */}
      <View style={styles.profileCard}>
        <View style={[styles.profileHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Image source={{ uri: contact.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileTitleContainer}>
            <Text style={styles.profileName}>{contact.name}</Text>
            <View style={styles.badgesRow}>
              <Text style={styles.idBadge}>{contact.id}</Text>
              <View style={styles.deptBadge}>
                <Text style={styles.deptBadgeText}>{contact.department}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.roleBadge, isMobile && { marginTop: 15 }]}>
            <Ionicons name="briefcase-outline" size={18} color="#043094" />
            <Text style={styles.roleText}>{contact.role}</Text>
          </View>
        </View>
        
        <View style={[styles.infoGrid, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.infoColumn, isMobile && { borderRightWidth: 0, borderBottomWidth: 1 }]}>
            <Text style={styles.columnTitle}>Contact Methods</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="mail" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoText}>{contact.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="call" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoText}>{contact.phone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.columnTitle}>Additional Details</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="location" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoText}>{contact.location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="document-text" size={16} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Notes</Text>
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
              <Text style={styles.modalTitle}>Contact {contact.name}</Text>
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
                <Text style={styles.msgOptionText}>SMS Message</Text>
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
                <Text style={styles.msgOptionText}>Send Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Form Modal */}
      <FormModal 
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        title="Edit Contact Profile"
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
  
  profileCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 24 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F8FAFC' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, marginRight: 20 },
  profileTitleContainer: { flex: 1 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  idBadge: { backgroundColor: '#E2E8F0', color: '#475569', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  deptBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  deptBadgeText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600' },
  
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  roleText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  
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
