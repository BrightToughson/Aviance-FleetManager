import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useParts } from '../../../context/PartsContext';
import { useVendors } from '../../../context/VendorsContext';
import { uploadImageToSupabase } from '../../../lib/uploadImage';

const PART_CATEGORIES = [
  'Fluids & Lubricants',
  'Brakes',
  'Tires & Wheels',
  'Filters',
  'Engine & Transmission',
  'Electrical & Batteries',
  'Suspension & Steering',
  'Body & Exterior',
  'HVAC & Cooling',
  'Safety & Equipment',
  'Hardware & Fasteners',
  'General',
  'Other (Custom)'
];

export default function AddNewPartScreen() {
  const router = useRouter();
  const { addPart } = useParts();
  const { vendors } = useVendors();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: 'Fluids & Lubricants',
    qty: '',
    reorder: '',
    location: '',
    unitCost: '',
    vendorId: '',
    compatibleVehicles: '',
    notes: '',
    depreciation: ''
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/parts' as any);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUrl(result.assets[0].uri);
        return;
      }
    } catch (error) {
      console.log('ImagePicker fallback to DocumentPicker', error);
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
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

  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.sku) {
      if (Platform.OS === 'web') {
        window.alert('Validation Error: Part Name and SKU are required.');
      } else {
        Alert.alert('Validation Error', 'Part Name and SKU are required.');
      }
      return;
    }

    try {
      setSubmitting(true);

      // If user typed a vendor name, find the matching vendor ID
      const matchedVendor = vendors.find(v => 
        v.id === form.vendorId || 
        v.name.toLowerCase() === form.vendorId.trim().toLowerCase()
      );
      const resolvedVendorId = matchedVendor ? matchedVendor.id : form.vendorId;

      let finalImageUrl = imageUrl;
      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          finalImageUrl = await uploadImageToSupabase(imageUrl, 'media');
        } catch (uploadErr) {
          console.warn('Could not upload image to Supabase storage, using local URI:', uploadErr);
        }
      }

      await addPart({
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        qty: form.qty ? parseInt(form.qty, 10) : 0,
        reorder: form.reorder ? parseInt(form.reorder, 10) : 0,
        location: form.location.trim(),
        unitCost: form.unitCost ? parseFloat(form.unitCost) : 0,
        depreciation: form.depreciation ? parseFloat(form.depreciation) : 0,
        vendorId: resolvedVendorId || undefined,
        compatibleVehicles: form.compatibleVehicles ? form.compatibleVehicles.split(',').map(s => s.trim()) : ['All'],
        notes: form.notes.trim(),
        imageUrl: finalImageUrl || undefined,
        receiptUrl: receiptUrl || undefined,
      });

      if (Platform.OS === 'web') {
        window.alert('Part added successfully!');
      } else {
        Alert.alert('Success', 'Part added successfully!');
      }
      handleBack();
    } catch (error: any) {
      const errMsg = error?.message || 'Failed to save part. Please check if the database table exists.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Add New Part</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerCancelBtn} onPress={handleBack}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveBtn, submitting && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={submitting}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>{submitting ? 'Saving...' : 'Save Part'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.formGrid, isMobile && styles.formGridMobile]}>
        
        {/* Left Column: Image and Primary Info */}
        <View style={[styles.column, isMobile ? styles.columnMobile : styles.columnDesktop]}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Part Image</Text>
            {imageUrl ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                <View style={styles.imageActionOverlay}>
                  <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
                    <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUrl(null)}>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Tap to upload part photo</Text>
                </View>
              </TouchableOpacity>
            )}
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
              <Text style={styles.label}>Category *</Text>
              {Platform.OS === 'web' ? (
                <select
                  style={styles.webSelect}
                  value={isCustomCategory ? 'Other (Custom)' : (PART_CATEGORIES.includes(form.category) ? form.category : 'Other (Custom)')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other (Custom)') {
                      setIsCustomCategory(true);
                      setForm(prev => ({ ...prev, category: '' }));
                    } else {
                      setIsCustomCategory(false);
                      setForm(prev => ({ ...prev, category: val }));
                    }
                  }}
                >
                  {PART_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerFake}>
                  <TextInput
                    style={styles.input}
                    value={form.category}
                    onChangeText={t => setForm(prev => ({ ...prev, category: t }))}
                    placeholder="Fluids, Brakes, Tires..."
                  />
                </View>
              )}

              {/* Quick Select Category Chips */}
              <View style={styles.categoryChipsRow}>
                {['Fluids & Lubricants', 'Brakes', 'Tires & Wheels', 'Filters', 'Engine & Transmission', 'Electrical & Batteries'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.quickChip, form.category === cat && !isCustomCategory && styles.quickChipActive]}
                    onPress={() => {
                      setIsCustomCategory(false);
                      setForm(prev => ({ ...prev, category: cat }));
                    }}
                  >
                    <Text style={[styles.quickChipText, form.category === cat && !isCustomCategory && styles.quickChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {isCustomCategory && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={form.category}
                  onChangeText={t => setForm(prev => ({ ...prev, category: t }))}
                  placeholder="Enter custom category name..."
                  autoFocus
                />
              )}
            </View>
          </View>
        </View>

        {/* Right Column: Inventory, Purchasing, Compatibility */}
        <View style={[styles.column, isMobile ? styles.columnMobile : styles.columnDesktop]}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Inventory & Storage</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Initial Stock (Qty)</Text>
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
                <Text style={styles.label}>Purchase Qty</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.qty} 
                  onChangeText={t => setForm({ ...form, qty: t })} 
                  keyboardType="number-pad" 
                  placeholder="1" 
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Unit Cost (GH₵)</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.unitCost} 
                  onChangeText={t => setForm({ ...form, unitCost: t })} 
                  keyboardType="decimal-pad" 
                  placeholder="0.00" 
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Total Value</Text>
                <View style={styles.totalValueBox}>
                  <Text style={styles.totalValueText}>
                    GH₵ {((parseFloat(form.qty || '0') || 0) * (parseFloat(form.unitCost || '0') || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Depreciation (%)</Text>
                <TextInput style={styles.input} value={form.depreciation} onChangeText={t => setForm({ ...form, depreciation: t })} keyboardType="number-pad" placeholder="10" />
              </View>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>Vendor</Text>
                {Platform.OS === 'web' && vendors.length > 0 ? (
                  <select
                    style={styles.webSelect}
                    value={form.vendorId}
                    onChange={(e) => setForm(prev => ({ ...prev, vendorId: e.target.value }))}
                  >
                    <option value="">-- Select Vendor (Optional) --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.category || 'General'})</option>
                    ))}
                  </select>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={form.vendorId}
                    onChangeText={t => setForm(prev => ({ ...prev, vendorId: t }))}
                    placeholder="Type Vendor ID or Name..."
                  />
                )}
              </View>
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
        <TouchableOpacity style={styles.cancelBtn} onPress={handleBack}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveBtn, submitting && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={submitting}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.saveBtnText}>{submitting ? 'Saving...' : 'Save Part'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, paddingBottom: 64, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  
  formGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  formGridMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  column: { gap: 24 },
  columnDesktop: { flex: 1 },
  columnMobile: { width: '100%' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  
  imagePicker: { height: 180, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, color: '#6B7280', fontSize: 14 },
  imagePreviewWrapper: { height: 180, borderRadius: 8, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  imagePreview: { width: '100%', height: '100%' },
  imageActionOverlay: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 },
  changeImageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4, 48, 148, 0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  changeImageText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  removeImageText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  webSelect: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: '#111827',
    cursor: 'pointer',
    outlineStyle: 'none',
  } as any,
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#043094',
  },
  quickChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  quickChipTextActive: {
    color: '#043094',
    fontWeight: '700',
  },
  pickerFake: { },
  
  filePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 12 },
  filePickerText: { marginLeft: 8, color: '#1D4ED8', fontWeight: '500' },
  
  totalValueBox: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
  },
  totalValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043094',
  },

  footerActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center',
    marginTop: 24, 
    paddingTop: 24, 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB',
    gap: 12 
  },
  cancelBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 11, 
    borderRadius: 8, 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#D1D5DB' 
  },
  cancelBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  saveBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 11, 
    borderRadius: 8, 
    backgroundColor: '#043094',
    gap: 6,
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
