import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useParts } from '../../../context/PartsContext';
import { useVendors } from '../../../context/VendorsContext';

export default function AddNewPartScreen() {
  const router = useRouter();
  const { addPart } = useParts();
  const { vendors } = useVendors();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: 'Fluids',
    qty: '',
    reorder: '',
    location: '',
    unitCost: '',
    vendorId: '',
    compatibleVehicles: '',
    notes: '',
    depreciation: ''
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image', error);
    }
  };

  const handlePickReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        setReceiptUrl(result.assets[0].name); // Just storing name for demo
      }
    } catch (error) {
      console.log('Error picking document', error);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.sku) {
      Alert.alert('Validation Error', 'Part Name and SKU are required.');
      return;
    }

    addPart({
      name: form.name,
      sku: form.sku,
      category: form.category,
      qty: form.qty ? parseInt(form.qty) : 0,
      reorder: form.reorder ? parseInt(form.reorder) : 0,
      location: form.location,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : 0,
      vendorId: form.vendorId || undefined,
      compatibleVehicles: form.compatibleVehicles ? form.compatibleVehicles.split(',').map(s => s.trim()) : ['All'],
      notes: form.notes,
      imageUrl: imageUrl || undefined,
      receiptUrl: receiptUrl || undefined,
    });

    if (Platform.OS === 'web') {
      window.alert('Part added successfully!');
    } else {
      Alert.alert('Success', 'Part added successfully!');
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Part</Text>
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Left Column: Image and Primary Info */}
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Part Image</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {imageUrl ? (
                <Ionicons name="image" size={60} color="#043094" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Tap to upload part photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Part Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. Brake Pad Set" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SKU / Part Number *</Text>
              <TextInput style={styles.input} value={form.sku} onChangeText={t => setForm({ ...form, sku: t })} placeholder="e.g. BP-1024" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              {/* Very simple select replacement. Real app uses Picker */}
              <View style={styles.pickerFake}>
                <TextInput style={styles.input} value={form.category} onChangeText={t => setForm({ ...form, category: t })} placeholder="Fluids, Brakes, Tires..." />
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Inventory, Purchasing, Compatibility */}
        <View style={styles.column}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Inventory & Storage</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Initial Qty</Text>
                <TextInput style={styles.input} value={form.qty} onChangeText={t => setForm({ ...form, qty: t })} keyboardType="number-pad" placeholder="0" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Reorder Point</Text>
                <TextInput style={styles.input} value={form.reorder} onChangeText={t => setForm({ ...form, reorder: t })} keyboardType="number-pad" placeholder="5" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Storage Location</Text>
              <TextInput style={styles.input} value={form.location} onChangeText={t => setForm({ ...form, location: t })} placeholder="e.g. Aisle 4, Bin B" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Purchasing</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Unit Cost (GH₵)</Text>
                <TextInput style={styles.input} value={form.unitCost} onChangeText={t => setForm({ ...form, unitCost: t })} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Depreciation (%)</Text>
                <TextInput style={styles.input} value={form.depreciation} onChangeText={t => setForm({ ...form, depreciation: t })} keyboardType="number-pad" placeholder="10" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vendor</Text>
              {/* Very simple select replacement */}
              <TextInput style={styles.input} value={form.vendorId} onChangeText={t => setForm({ ...form, vendorId: t })} placeholder="Type Vendor ID or Name..." />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purchase Receipt</Text>
              <TouchableOpacity style={styles.filePicker} onPress={handlePickReceipt}>
                <Ionicons name="document-attach-outline" size={24} color="#043094" />
                <Text style={styles.filePickerText}>{receiptUrl || 'Upload Receipt / Invoice'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Compatible Vehicles (Comma separated)</Text>
              <TextInput style={styles.input} value={form.compatibleVehicles} onChangeText={t => setForm({ ...form, compatibleVehicles: t })} placeholder="e.g. Ford Transit, All" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput 
                style={[styles.input, { height: 80 }]} 
                multiline 
                textAlignVertical="top"
                value={form.notes} 
                onChangeText={t => setForm({ ...form, notes: t })} 
                placeholder="Any special instructions?" 
              />
            </View>
          </View>

        </View>

      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Part</Text>
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
  
  imagePicker: { height: 150, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, color: '#6B7280', fontSize: 14 },
  
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  pickerFake: { },
  
  filePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 12 },
  filePickerText: { marginLeft: 8, color: '#1D4ED8', fontWeight: '500' },
  
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#043094' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
