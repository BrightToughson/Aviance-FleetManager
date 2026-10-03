import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useVendors } from '../../../context/VendorsContext';

export default function AddNewVendorScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const { addVendor, updateVendor, vendors } = useVendors();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const isEditing = !!editId;

  const [form, setForm] = useState({
    name: '',
    category: 'Parts Supplier',
    status: 'Active',
    contact: '',
    phone: '',
    email: '',
    rating: '5',
    accountNumber: '',
    taxId: '',
    paymentTerms: '',
    address: ''
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      const vendorToEdit = vendors.find(v => v.id === editId);
      if (vendorToEdit) {
        setForm({
          name: vendorToEdit.name,
          category: vendorToEdit.category,
          status: vendorToEdit.status,
          contact: vendorToEdit.contact,
          phone: vendorToEdit.phone,
          email: vendorToEdit.email,
          rating: vendorToEdit.rating.toString(),
          accountNumber: vendorToEdit.accountNumber || '',
          taxId: vendorToEdit.taxId || '',
          paymentTerms: vendorToEdit.paymentTerms || '',
          address: vendorToEdit.address || ''
        });
        setLogoUrl(vendorToEdit.logo || null);
      }
    }
  }, [isEditing, editId, vendors]);

  const handlePickLogo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled) {
        setLogoUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking logo', error);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        setDocumentUrl(result.assets[0].name);
      }
    } catch (error) {
      console.log('Error picking document', error);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.phone) {
      Alert.alert('Validation Error', 'Vendor Name and Phone are required.');
      return;
    }

    const vendorData = {
      name: form.name,
      category: form.category,
      status: form.status,
      contact: form.contact || 'Main Desk',
      phone: form.phone,
      email: form.email,
      rating: parseFloat(form.rating) || 0,
      accountNumber: form.accountNumber,
      taxId: form.taxId,
      paymentTerms: form.paymentTerms,
      address: form.address,
      logo: logoUrl || undefined,
    };

    if (isEditing) {
      updateVendor(editId as string, vendorData);
      if (Platform.OS === 'web') window.alert('Vendor updated successfully!');
      else Alert.alert('Success', 'Vendor updated successfully!');
      router.back();
    } else {
      addVendor(vendorData);
      if (Platform.OS === 'web') window.alert('Vendor added successfully!');
      else Alert.alert('Success', 'Vendor added successfully!');
      router.back();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</Text>
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Left Column: Basic Info & Contact */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Company Details</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity style={styles.logoPicker} onPress={handlePickLogo}>
                {logoUrl ? (
                  <Ionicons name="image" size={40} color="#043094" />
                ) : (
                  <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                )}
              </TouchableOpacity>
              <View style={{ marginLeft: 16 }}>
                <Text style={styles.label}>Company Logo (Optional)</Text>
                <Text style={styles.helpText}>Upload a logo or profile image.</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vendor Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. Elite Tire & Service Inc" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Category</Text>
                <TextInput style={styles.input} value={form.category} onChangeText={t => setForm({ ...form, category: t })} placeholder="Maintenance, Parts, Fuel..." />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Status</Text>
                <TextInput style={styles.input} value={form.status} onChangeText={t => setForm({ ...form, status: t })} placeholder="Active, Inactive" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person</Text>
              <TextInput style={styles.input} value={form.contact} onChangeText={t => setForm({ ...form, contact: t })} placeholder="e.g. Mike Johnson" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput style={styles.input} value={form.phone} onChangeText={t => setForm({ ...form, phone: t })} keyboardType="phone-pad" placeholder="(555) 123-4567" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} value={form.email} onChangeText={t => setForm({ ...form, email: t })} keyboardType="email-address" placeholder="service@vendor.com" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Physical Address</Text>
              <TextInput style={styles.input} value={form.address} onChangeText={t => setForm({ ...form, address: t })} placeholder="123 Industrial Blvd, City, ST 12345" />
            </View>
          </View>
        </View>

        {/* Right Column: Billing & Documents */}
        <View style={styles.column}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Billing & Account</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number (If applicable)</Text>
              <TextInput style={styles.input} value={form.accountNumber} onChangeText={t => setForm({ ...form, accountNumber: t })} placeholder="e.g. ACC-88329" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Tax ID / EIN</Text>
                <TextInput style={styles.input} value={form.taxId} onChangeText={t => setForm({ ...form, taxId: t })} placeholder="XX-XXXXXXX" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Payment Terms</Text>
                <TextInput style={styles.input} value={form.paymentTerms} onChangeText={t => setForm({ ...form, paymentTerms: t })} placeholder="e.g. Net 30" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Rating (1.0 - 5.0)</Text>
              <TextInput style={styles.input} value={form.rating} onChangeText={t => setForm({ ...form, rating: t })} keyboardType="decimal-pad" placeholder="5" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contracts & Documents</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Upload Agreement / W-9</Text>
              <TouchableOpacity style={styles.filePicker} onPress={handlePickDocument}>
                <Ionicons name="document-attach-outline" size={24} color="#043094" />
                <Text style={styles.filePickerText}>{documentUrl || 'Select File'}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Save Vendor'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  
  formGrid: { flexDirection: 'row', gap: 24 },
  formGridMobile: { flexDirection: 'column' },
  column: { flex: 1, gap: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  logoPicker: { width: 80, height: 80, backgroundColor: '#F3F4F6', borderRadius: 40, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  helpText: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  
  filePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 12 },
  filePickerText: { marginLeft: 8, color: '#1D4ED8', fontWeight: '500' },
  
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
