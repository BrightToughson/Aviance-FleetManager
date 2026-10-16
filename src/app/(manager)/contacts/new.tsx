import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { usePersonnel } from '../../../context/PersonnelContext';
import { useTranslation } from 'react-i18next';

export default function NewContactScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const { addPerson } = usePersonnel();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    location: '',
    status: 'Active',
    contact_type: 'Internal',
    company: '',
    avatar: ''
  });

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setForm({...form, avatar: result.assets[0].uri});
    }
  };

  const handleAddContact = async () => {
    if (!form.name) {
      if (Platform.OS === 'web') window.alert("Please enter a name.");
      else Alert.alert("Error", "Please enter a name.");
      return;
    }

    try {
      await addPerson({
        name: form.name,
        role: form.role || 'Staff',
        department: form.department || 'Unassigned',
        contact_type: form.contact_type,
        company: form.company,
        phone: form.phone,
        email: form.email,
        status: form.status,
        avatar: form.avatar
      });

      if (Platform.OS === 'web') window.alert("Contact created successfully!");
      else Alert.alert("Success", "Contact created!");

      router.replace('/(manager)/contacts' as any);
      
    } catch (err: any) {
      console.error("Error creating contact:", err);
      if (Platform.OS === 'web') window.alert("Database Error: " + (err.message || JSON.stringify(err)));
      else Alert.alert("Database Error", err.message || JSON.stringify(err));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#043094" />
            <Text style={styles.backBtnText}>Back to Contacts</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Add New Contact</Text>
          <Text style={styles.pageSubtitle}>Add a new personnel member to your directory.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, !isMobile && styles.desktopLayout]}>
          
          {/* Left Column - Personal Info */}
          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrapper}>
                <Ionicons name="person" size={20} color="#043094" />
              </View>
              <Text style={styles.cardTitle}>Personal Details</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({...form, name: t})} placeholder="e.g. Jane Doe" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm({...form, email: t})} placeholder="e.g. janedoe@company.com" keyboardType="email-address" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} placeholder="e.g. (555) 123-4567" keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
          </View>

          {/* Right Column - Work Info */}
          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrapper}>
                <Ionicons name="briefcase" size={20} color="#043094" />
              </View>
              <Text style={styles.cardTitle}>Work Information</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Job Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                {['Driver', 'Manager', 'Mechanic', 'Supplier', 'Admin', 'Staff'].map(r => (
                  <TouchableOpacity 
                    key={r}
                    style={[{ marginRight: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' }, form.role === r && { backgroundColor: '#043094', borderColor: '#043094' }]}
                    onPress={() => setForm({
                      ...form, 
                      role: r, 
                      contact_type: (r === 'Driver' || r === 'Manager') ? 'Internal' : form.contact_type,
                      department: r === 'Driver' ? 'Fleet' : form.department
                    })}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '500', color: '#4B5563' }, form.role === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Ionicons name="id-card-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.role} onChangeText={(t) => setForm({...form, role: t})} placeholder="Or type a custom role..." placeholderTextColor="#9CA3AF" />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                {['Fleet', 'Operations', 'Maintenance', 'HR', 'Sales', 'Safety', 'Unassigned'].map(d => (
                  <TouchableOpacity 
                    key={d}
                    style={[{ marginRight: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' }, form.department === d && { backgroundColor: '#043094', borderColor: '#043094' }]}
                    onPress={() => setForm({...form, department: d})}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '500', color: '#4B5563' }, form.department === d && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Ionicons name="business-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.department} onChangeText={(t) => setForm({...form, department: t})} placeholder="Or type a custom department..." placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Active', 'On Leave'].map(s => (
                  <TouchableOpacity 
                    key={s}
                    style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' }, form.status === s && { backgroundColor: '#043094', borderColor: '#043094' }]}
                    onPress={() => setForm({...form, status: s})}
                  >
                    <Ionicons name={s === 'Active' ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={18} color={form.status === s ? '#fff' : '#6B7280'} />
                    <Text style={[{ fontSize: 14, fontWeight: '500', color: '#4B5563' }, form.status === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contact Type</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' }, form.contact_type === 'Internal' && { backgroundColor: '#043094', borderColor: '#043094' }]}
                  onPress={() => setForm({...form, contact_type: 'Internal'})}
                >
                  <Ionicons name="people-outline" size={18} color={form.contact_type === 'Internal' ? '#fff' : '#6B7280'} />
                  <Text style={[{ fontSize: 14, fontWeight: '500', color: '#4B5563' }, form.contact_type === 'Internal' && { color: '#fff' }]}>Internal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' }, form.contact_type === 'External' && { backgroundColor: '#043094', borderColor: '#043094' }]}
                  onPress={() => setForm({...form, contact_type: 'External'})}
                >
                  <Ionicons name="business-outline" size={18} color={form.contact_type === 'External' ? '#fff' : '#6B7280'} />
                  <Text style={[{ fontSize: 14, fontWeight: '500', color: '#4B5563' }, form.contact_type === 'External' && { color: '#fff' }]}>External</Text>
                </TouchableOpacity>
              </View>
            </View>

            {form.contact_type === 'External' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Company Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="briefcase-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput style={styles.input} value={form.company} onChangeText={(t) => setForm({...form, company: t})} placeholder="e.g. AutoParts Inc." placeholderTextColor="#9CA3AF" />
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Profile Image</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={pickImage} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 15 }}>
                  {form.avatar ? (
                    <Image source={{ uri: form.avatar }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                  ) : (
                    <Ionicons name="camera" size={30} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={pickImage} style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 }}>
                    <Text style={{ color: '#4B5563', fontWeight: '500' }}>Choose Photo</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Or enter URL below:</Text>
                  <View style={[styles.inputContainer, { marginTop: 6 }]}>
                    <Ionicons name="link" size={16} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.avatar} onChangeText={(t) => setForm({...form, avatar: t})} placeholder="https://..." placeholderTextColor="#9CA3AF" />
                  </View>
                </View>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerContent}>
          <TouchableOpacity style={styles.cancelModalBtn} onPress={() => router.back()}>
            <Text style={styles.cancelModalBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddContact} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveModalBtnText}>Save Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBanner: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: '#043094',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Space for sticky footer
  },
  mainLayout: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  cardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  inputIcon: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    fontSize: 15,
    color: '#111827',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  cancelModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelModalBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 15,
  },
  saveModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#043094",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveModalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  }
});
