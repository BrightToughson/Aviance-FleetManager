import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useEquipments } from '../../../context/EquipmentContext';
import { useTranslation } from 'react-i18next';

const SIDEBAR_ITEMS = [
  { id: 'details', label: 'Details', icon: 'document-text-outline' },
  { id: 'maintenance', label: 'Maintenance', icon: 'build-outline' }
];

const FormField = ({ label, required = false, placeholder, hint, hasDecodeBtn = false, onDecode, isSelect = false, isDate = false, options = [], value, onValueChange, onChangeText }: any) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = React.useState(false);

  const handleConfirmDate = (date: Date) => {
    if (onChangeText) {
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      onChangeText(formattedDate);
    }
    setDatePickerVisibility(false);
  };
  
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{color: '#EF4444'}}> *</Text>}</Text>
      
      {isSelect ? (
        <TouchableOpacity style={styles.inputContainer} onPress={() => setModalVisible(true)}>
          <Text style={[styles.input, { paddingTop: 10 }, !value && { color: '#9CA3AF' }]}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={styles.selectIcon} />
        </TouchableOpacity>
      ) : isDate ? (
        Platform.OS === 'web' ? (
          <View style={styles.inputContainer}>
            <input 
              type="date"
              value={(() => {
                if (!value) return '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
                const parts = value.split('/');
                if (parts.length === 3) {
                  return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
                return value;
              })()}
              onChange={(e) => {
                if (onChangeText) {
                  const val = e.target.value;
                  if (!val) {
                    onChangeText('');
                    return;
                  }
                  const [y, m, d] = val.split('-');
                  onChangeText(`${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`);
                }
              }}
              onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                padding: '10px 14px',
                fontSize: 14,
                fontFamily: 'inherit',
                color: value ? '#111827' : '#9CA3AF',
                cursor: 'pointer'
              }}
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerVisibility(true)}>
            <Text style={[styles.input, { paddingTop: 10 }, !value && { color: '#9CA3AF' }]}>
              {value || placeholder}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" style={styles.selectIcon} />
          </TouchableOpacity>
        )
      ) : (
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            placeholder={placeholder} 
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            // @ts-ignore
            type={isDate ? "date" : "text"}
            outlineStyle="none"
          />
          {hasDecodeBtn && (
            <TouchableOpacity style={styles.decodeBtn} onPress={onDecode}>
              <Text style={styles.decodeBtnText}>Decode VIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}

      {isSelect && (
        <Modal visible={modalVisible} transparent={true} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={styles.dropdownModal}>
              <Text style={styles.dropdownTitle}>Select {label}</Text>
              <ScrollView style={{maxHeight: 300}}>
                {options.map((opt: string, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      if (onValueChange) onValueChange(opt);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {isDate && Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisibility(false)}
        />
      )}
    </View>
  );
};

export default function AddEquipmentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { addEquipment } = useEquipments();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024; // Use mobile layout for small tablets (<1024px)
  const [activeSection, setActiveSection] = useState('details');
  const [warrantyModalVisible, setWarrantyModalVisible] = useState(false);
  const [profileImageModalVisible, setProfileImageModalVisible] = useState(false);
  const [form, setForm] = useState({
    profileImage: '', name: '', serialNumber: '', type: '', 
    year: '', make: '', model: '', currentMeter: '', group: '',
    inServiceDate: '', serviceLife: '', resaleValue: '', purchasePrice: '', purchaseDate: '',
    financeCompany: '', monthlyPayment: ''
  });

  const handlePickProfileImage = async (useCamera: boolean) => {
    setProfileImageModalVisible(false);
    try {
      let result;
      if (useCamera) {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          if (Platform.OS === 'web') window.alert("Permission to access camera was denied");
          else Alert.alert("Permission Denied", "Permission to access camera was denied");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: true, aspect: [1, 1] });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 1, allowsEditing: true, aspect: [1, 1] });
      }
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm(prev => ({ ...prev, profileImage: result.assets[0].uri }));
      }
    } catch (err) {
      console.log(err);
    }
  };


  const handlePickWarrantyPhoto = async (useCamera: boolean) => {
    setWarrantyModalVisible(false);
    try {
      let result;
      if (useCamera) {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          if (Platform.OS === 'web') window.alert("Permission to access camera was denied");
          else Alert.alert("Permission Denied", "Permission to access camera was denied");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 1 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
      }
      
      if (!result.canceled) {
        setForm(prev => ({ ...prev, warrantyFile: 'Photo Attached' }));
        if (Platform.OS === 'web') window.alert("Warranty photo uploaded!");
        else Alert.alert("Success", "Warranty photo uploaded!");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handlePickWarrantyDocument = async () => {
    setWarrantyModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm(prev => ({ ...prev, warrantyFile: result.assets[0].name }));
        if (Platform.OS === 'web') window.alert("Warranty document uploaded!");
        else Alert.alert("Success", "Warranty document uploaded!");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleSave = () => {
    if (!form.name) {
      if (Platform.OS === 'web') window.alert("Please enter a Equipment name.");
      else Alert.alert("Error", "Please enter a Equipment name.");
      return;
    }
    
    addEquipment(form);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#4B5563" />
            <Text style={styles.backText}>{t('equip_title', 'Equipments')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('equip_add_title', 'New Equipment')}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>{t('common_cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          {!isMobile && (
            <TouchableOpacity style={styles.addMultipleBtn}>
              <Text style={styles.addMultipleBtnText}>{t('equip_add_multiple', 'Add Multiple')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{t('equip_save_btn', 'Save Equipment')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={[styles.main, isMobile && { flexDirection: 'column' }]}>
        {/* Sidebar / Tabs */}
        {isMobile ? (
          <View style={styles.mobileTabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileTabsScroll}>
              {SIDEBAR_ITEMS.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.mobileTab, activeSection === item.id && styles.activeMobileTab]}
                  onPress={() => setActiveSection(item.id)}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={16} 
                    color={activeSection === item.id ? '#043094' : '#6B7280'} 
                    style={{marginRight: 6}}
                  />
                  <Text style={[styles.mobileTabText, activeSection === item.id && styles.activeMobileTabText]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.sidebar}>
            {SIDEBAR_ITEMS.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.sidebarItem, activeSection === item.id && styles.activeSidebarItem]}
                onPress={() => setActiveSection(item.id)}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={20} 
                  color={activeSection === item.id ? '#043094' : '#6B7280'} 
                  style={{marginRight: 12}}
                />
                <Text style={[styles.sidebarItemText, activeSection === item.id && styles.activeSidebarItemText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Right Form Area */}
        <ScrollView style={styles.formScroll} contentContainerStyle={[styles.formContainer, isMobile && { padding: 15 }]}>
          {activeSection === 'details' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>{t('equip_ident', 'Identification')}</Text>
              
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity 
                  style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' }}
                  onPress={() => setProfileImageModalVisible(true)}
                >
                  {form.profileImage ? (
                    <>
                      <Image source={{ uri: form.profileImage }} style={{ width: '100%', height: '100%' }} />
                      <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{t('common_edit', 'EDIT')}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{t('equip_add_photo', 'Add Photo')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <FormField 
                label={t('equip_name', 'Equipment Name')}
                required={true}
                value={form.name}
                onChangeText={(t: string) => setForm({...form, name: t})}
                hint={t('equip_name_hint', 'Enter a nickname to distinguish this Equipment in the system.')}
              />
              
              <FormField 
                label={t('equip_vin_sn', 'Serial Number (SN)')}
                value={form.serialNumber}
                onChangeText={(t: string) => setForm({...form, serialNumber: t})}
                hint="Equipment Serial Number for tracking and warranties."
              />
              
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Type / Category" 
                    required={true} 
                    isSelect={true}
                    placeholder="Select Type" 
                    options={['Generator', 'Forklift', 'Trailer', 'Heavy Machinery', 'Tool', 'Other']}
                    value={form.type}
                    onValueChange={(t: string) => setForm({...form, type: t})}
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Group / Location" 
                    value={form.group}
                    onChangeText={(t: string) => setForm({...form, group: t})}
                    placeholder="e.g. Warehouse A" 
                  />
                </View>
              </View>
              <Text style={[styles.fieldHint, {marginTop: -10, marginBottom: 20}]}>Categorize this Equipment</Text>

              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.thirdCol}>
                  <FormField 
                    label="Year" 
                    value={form.year}
                    onChangeText={(t: string) => setForm({...form, year: t})}
                    placeholder="e.g. 2012" 
                  />
                </View>
                <View style={styles.thirdCol}>
                  <FormField 
                    label="Manufacturer" 
                    value={form.make}
                    onChangeText={(t: string) => setForm({...form, make: t})}
                    placeholder="e.g. Caterpillar, Bobcat" 
                  />
                </View>
                <View style={styles.thirdCol}>
                  <FormField 
                    label="Model" 
                    value={form.model}
                    onChangeText={(t: string) => setForm({...form, model: t})}
                    placeholder="e.g. D6T, S650" 
                  />
                </View>
              </View>

            </View>
          )}

          {activeSection === 'maintenance' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Maintenance Settings</Text>
              <FormField 
                label="Current Meter Reading (Hours)" 
                value={form.currentMeter}
                onChangeText={(t: string) => setForm({...form, currentMeter: t})}
                placeholder="e.g. 5,000" 
              />
            </View>
          )}

          {activeSection === 'lifecycle' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Lifecycle Management</Text>
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="In-Service Date" 
                    isDate={true}
                    value={form.inServiceDate}
                    onChangeText={(t: string) => setForm({...form, inServiceDate: t})}
                    placeholder="MM/DD/YYYY" 
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Estimated Service Life (Months)" 
                    value={form.serviceLife}
                    onChangeText={(t: string) => setForm({...form, serviceLife: t})}
                    placeholder="e.g. 60" 
                  />
                </View>
              </View>
              <FormField 
                label="Estimated Resale Value" 
                value={form.resaleValue}
                onChangeText={(t: string) => setForm({...form, resaleValue: t})}
                placeholder="GH₵" 
              />
            </View>
          )}

          {activeSection === 'financial' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Financial Data</Text>
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Purchase Price" 
                    value={form.purchasePrice}
                    onChangeText={(t: string) => setForm({...form, purchasePrice: t})}
                    placeholder="GH₵" 
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Purchase Date" 
                    isDate={true}
                    value={form.purchaseDate}
                    onChangeText={(t: string) => setForm({...form, purchaseDate: t})}
                    placeholder="MM/DD/YYYY" 
                  />
                </View>
              </View>
              <FormField 
                label="Financing/Lease Company" 
                value={form.financeCompany}
                onChangeText={(t: string) => setForm({...form, financeCompany: t})}
                placeholder="e.g. Bank of America" 
              />
              <FormField 
                label="Monthly Payment" 
                value={form.monthlyPayment}
                onChangeText={(t: string) => setForm({...form, monthlyPayment: t})}
                placeholder="GH₵" 
              />
            </View>
          )}

        </ScrollView>
      </View>

      {/* Warranty Upload Modal */}
      <Modal visible={warrantyModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setWarrantyModalVisible(false)}>
          <View style={[styles.dropdownModal, { width: 320, paddingVertical: 0 }]}>
            <Text style={styles.dropdownTitle}>Attach Warranty</Text>
            
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => handlePickWarrantyPhoto(true)}>
              <Ionicons name="camera-outline" size={24} color="#0EA5E9" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Take Photo of Document</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => handlePickWarrantyPhoto(false)}>
              <Ionicons name="image-outline" size={24} color="#10B981" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Choose Photo from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 }} onPress={handlePickWarrantyDocument}>
              <Ionicons name="document-text-outline" size={24} color="#8B5CF6" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Upload / Scan Document (PDF)</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Image Modal */}
      <Modal visible={profileImageModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileImageModalVisible(false)}>
          <View style={[styles.dropdownModal, { width: 320, paddingVertical: 0 }]}>
            <Text style={styles.dropdownTitle}>Equipment Photo</Text>
            
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => handlePickProfileImage(true)}>
              <Ionicons name="camera-outline" size={24} color="#0EA5E9" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 }} onPress={() => handlePickProfileImage(false)}>
              <Ionicons name="image-outline" size={24} color="#10B981" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backText: { fontSize: 13, color: '#4B5563', marginLeft: 4, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 5 },
  cancelBtnText: { color: '#043094', fontWeight: '600', fontSize: 13 },
  addMultipleBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 6, marginRight: 8 },
  addMultipleBtnText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#043094', borderRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  
  main: { flex: 1, flexDirection: 'row', maxWidth: 1200, alignSelf: 'center', width: '100%' },
  sidebar: { width: 240, padding: 20 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, marginBottom: 5 },
  activeSidebarItem: { backgroundColor: '#EFF6FF' },
  sidebarItemText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  activeSidebarItemText: { color: '#043094', fontWeight: '600' },
  
  mobileTabsWrapper: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' },
  mobileTabsScroll: { paddingHorizontal: 15 },
  mobileTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeMobileTab: { borderBottomColor: '#043094' },
  mobileTabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  activeMobileTabText: { color: '#043094', fontWeight: '700' },
  
  formScroll: { flex: 1 },
  formContainer: { padding: 20, paddingRight: 40 },
  formSection: { backgroundColor: '#fff', borderRadius: 12, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 25 },
  
  formField: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, backgroundColor: '#fff', height: 42 },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 14, color: '#111827' },
  selectIcon: { position: 'absolute', right: 12 },
  decodeBtn: { backgroundColor: '#F3F4F6', height: '100%', paddingHorizontal: 15, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#D1D5DB', borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  decodeBtnText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  fieldHint: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  
  row: { flexDirection: 'row', marginHorizontal: -10 },
  halfCol: { flex: 1, paddingHorizontal: 10 },
  thirdCol: { flex: 1, paddingHorizontal: 10 },
  
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#043094', borderStyle: 'dashed', borderRadius: 8 },
  uploadBtnText: { color: '#043094', fontWeight: '600', fontSize: 14 },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#6B7280', paddingRight: 20, maxWidth: 400 },
  smallInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, width: 80, textAlign: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModal: { backgroundColor: '#fff', width: 300, borderRadius: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  dropdownTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 5 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 20 },
  dropdownItemText: { fontSize: 15, color: '#374151' },
});

