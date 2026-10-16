import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useVehicles } from '../../../context/VehicleContext';
const SIDEBAR_ITEMS = [
  { id: 'details', label: 'Details', icon: 'document-text-outline' },
  { id: 'maintenance', label: 'Maintenance', icon: 'build-outline' },
  { id: 'lifecycle', label: 'Lifecycle', icon: 'sync-outline' },
  { id: 'financial', label: 'Financial', icon: 'cash-outline' },
  { id: 'warranties', label: 'Warranties', icon: 'shield-checkmark-outline' },
  { id: 'custom', label: 'Custom Fields', icon: 'options-outline' },
  { id: 'specs', label: 'Specifications', icon: 'list-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
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

export default function AddVehicleScreen() {
  const router = useRouter();
  const { plate: initialPlate } = useLocalSearchParams<{ plate?: string }>();
  const { addVehicle } = useVehicles();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024; // Use mobile layout for small tablets (<1024px)
  const [activeSection, setActiveSection] = useState('details');
  const [warrantyModalVisible, setWarrantyModalVisible] = useState(false);
  const [profileImageModalVisible, setProfileImageModalVisible] = useState(false);
  const [form, setForm] = useState({
    profileImage: '', name: '', telematics: '', vin: '', 
    plate: (typeof initialPlate === 'string' ? initialPlate : '') || '', 
    type: '', fuelType: '', 
    year: '', make: '', model: '', trim: '', state: '', labels: '',
    primaryMeter: '', currentMeter: '', maintenanceProgram: '',
    inServiceDate: '', serviceLife: '', resaleValue: '',
    purchasePrice: '', purchaseDate: '', financeCompany: '', monthlyPayment: '',
    warrantyFile: '', powertrainExp: '', bumperExp: '',
    licenseReq: '', specialEquip: '',
    engineSize: '', transmission: '', driveType: '', gvwr: ''
  });

  React.useEffect(() => {
    if (initialPlate && typeof initialPlate === 'string') {
      setForm(prev => ({ ...prev, plate: initialPlate }));
    }
  }, [initialPlate]);

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

  const handleDecodeVIN = async () => {
    if (!form.vin || form.vin.length < 11) {
      if (Platform.OS === 'web') window.alert("Please enter a valid VIN (at least 11 characters) first!");
      else Alert.alert("Error", "Please enter a valid VIN (at least 11 characters) first!");
      return;
    }
    
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${form.vin}?format=json`);
      const data = await response.json();
      
      if (data && data.Results) {
        const getValue = (variableName: string) => {
          const item = data.Results.find((r: any) => r.Variable === variableName);
          return item && item.Value && item.Value !== "Not Applicable" && item.Value !== "null" ? item.Value : "";
        };

        const make = getValue("Make");
        const model = getValue("Model");
        const year = getValue("Model Year");
        const type = getValue("Vehicle Type");
        const fuelType = getValue("Fuel Type - Primary");
        
        // Some manufacturers put trim data in 'Series' or 'Trim'
        const rawTrim = getValue("Trim");
        const series = getValue("Series");
        const bestTrim = rawTrim || series || "";

        // Extract engine and specs
        const displacement = getValue("Displacement (L)");
        const cylinders = getValue("Engine Number of Cylinders");
        const engineConfig = getValue("Engine Configuration");
        const engineSizeStr = displacement ? `${displacement}L ${engineConfig || ''}${cylinders ? ` ${cylinders} Cyl` : ''}`.trim() : "";
        
        const transmission = getValue("Transmission Style");
        const driveType = getValue("Drive Type");
        const gvwr = getValue("Gross Vehicle Weight Rating From");

        setForm(prev => ({
          ...prev,
          make: make || prev.make,
          model: model || prev.model,
          year: year || prev.year,
          type: type || prev.type,
          fuelType: fuelType || prev.fuelType,
          trim: bestTrim || prev.trim,
          engineSize: engineSizeStr || prev.engineSize,
          transmission: transmission || prev.transmission,
          driveType: driveType || prev.driveType,
          gvwr: gvwr || prev.gvwr,
        }));

        if (Platform.OS === 'web') window.alert("VIN Decoded Successfully! Fields auto-filled from real data.");
        else Alert.alert("Success", "VIN Decoded Successfully! Fields auto-filled from real data.");
      }
    } catch (err) {
      console.error(err);
      if (Platform.OS === 'web') window.alert("Failed to decode VIN. Please check the VIN or your connection.");
      else Alert.alert("Error", "Failed to decode VIN. Please check the VIN or your connection.");
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
    if (!form.name || !form.plate || !form.year || !form.make || !form.model) {
      const msg = "Please fill out all required fields: Vehicle Name, License Plate, Year, Make, and Model.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }
    
    addVehicle(form);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#4B5563" />
            <Text style={styles.backText}>Vehicles</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Vehicle</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          {!isMobile && (
            <TouchableOpacity style={styles.addMultipleBtn}>
              <Text style={styles.addMultipleBtnText}>Add Multiple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Vehicle</Text>
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
              <Text style={styles.sectionTitle}>Identification</Text>
              
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity 
                  style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' }}
                  onPress={() => setProfileImageModalVisible(true)}
                >
                  {form.profileImage ? (
                    <>
                      <Image source={{ uri: form.profileImage }} style={{ width: '100%', height: '100%' }} />
                      <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>EDIT</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <FormField 
                label="Vehicle Name" 
                required={true}
                value={form.name}
                onChangeText={(t: string) => setForm({...form, name: t})}
                hint="Enter a nickname to distinguish this vehicle in the system."
              />
              
              <FormField 
                label="Telematics Device" 
                isSelect={true}
                options={['Geotab GO9', 'Samsara VG34', 'Verizon Connect', 'KeepTruckin ELD', 'None']}
                value={form.telematics}
                onValueChange={(val: string) => setForm({...form, telematics: val})}
                placeholder="Select GPS Tracker (e.g. Geotab GO9)"
                hint="Link this vehicle with a GPS device to begin automatically collecting location and engine data"
              />
              
              <FormField 
                label="VIN/SN" 
                hasDecodeBtn={true}
                onDecode={handleDecodeVIN}
                value={form.vin}
                onChangeText={(t: string) => setForm({...form, vin: t})}
                hint="Vehicle Identification Number. We can decode this to auto-fill the year, make, model and specs."
              />
              
              <FormField 
                label="License Plate" 
                required={true}
                value={form.plate}
                onChangeText={(t: string) => setForm({...form, plate: t})}
              />
              
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Type" 
                    required={true} 
                    placeholder="Car" 
                    value={form.type}
                    onChangeText={(t: string) => setForm({...form, type: t})}
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Fuel Type" 
                    isSelect={true} 
                    options={['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Propane']}
                    value={form.fuelType}
                    onValueChange={(val: string) => setForm({...form, fuelType: val})}
                    placeholder="Gasoline" 
                    hint="Gasoline, Diesel, Electric, Hybrid, etc." 
                  />
                </View>
              </View>
              <Text style={[styles.fieldHint, {marginTop: -10, marginBottom: 20}]}>Categorize this vehicle</Text>

              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.thirdCol}>
                  <FormField 
                    label="Year" 
                    required={true}
                    value={form.year}
                    onChangeText={(t: string) => setForm({...form, year: t})}
                    placeholder="e.g. 2012" 
                  />
                </View>
                <View style={styles.thirdCol}>
                  <FormField 
                    label="Make" 
                    required={true}
                    isSelect={true} 
                    options={['Toyota', 'Ford', 'Chevrolet', 'GMC', 'Freightliner', 'Volvo', 'Kenworth']}
                    value={form.make}
                    onValueChange={(val: string) => setForm({...form, make: val})}
                    placeholder="e.g. Toyota, Freightliner" 
                    hint="The manufacturer of the vehicle." 
                  />
                </View>
                <View style={styles.thirdCol}>
                  <FormField 
                    label="Model" 
                    required={true}
                    isSelect={true} 
                    options={['Corolla', 'Camry', 'F-150', 'Silverado', 'Cascadia', 'VNL', 'T680']}
                    value={form.model}
                    onValueChange={(val: string) => setForm({...form, model: val})}
                    placeholder="e.g. Corolla, Cascadia" 
                    hint="The specific model." 
                  />
                </View>
              </View>
              
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Trim" 
                    value={form.trim}
                    onChangeText={(t: string) => setForm({...form, trim: t})}
                    placeholder="e.g. SE, LE, Lariat" 
                    hint="The specific version or package of the model."
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Registration State/Province" 
                    value={form.state}
                    onChangeText={(t: string) => setForm({...form, state: t})}
                  />
                </View>
              </View>

              <FormField 
                label="Labels" 
                isSelect={true}
                options={['Heavy Duty', 'Light Duty', 'Leased', 'Owned', 'Refrigerated']}
                value={form.labels}
                onValueChange={(val: string) => setForm({...form, labels: val})}
                placeholder="e.g. Heavy Duty, Leased"
                hint="Tags to help you group or filter vehicles quickly."
              />
            </View>
          )}

          {activeSection === 'maintenance' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Maintenance Settings</Text>
              <FormField 
                label="Primary Meter" 
                isSelect={true} 
                options={['Miles', 'Kilometers', 'Hours']}
                value={form.primaryMeter}
                onValueChange={(val: string) => setForm({...form, primaryMeter: val})}
                placeholder="Miles" 
              />
              <FormField 
                label="Current Meter Reading" 
                value={form.currentMeter}
                onChangeText={(t: string) => setForm({...form, currentMeter: t})}
                placeholder="e.g. 50,000" 
              />
              <FormField 
                label="Preventative Maintenance Program" 
                isSelect={true} 
                options={['Standard Fleet Schedule', 'Heavy Duty Schedule', 'Custom Schedule']}
                value={form.maintenanceProgram}
                onValueChange={(val: string) => setForm({...form, maintenanceProgram: val})}
                placeholder="Standard Fleet Schedule" 
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

          {activeSection === 'warranties' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Warranties</Text>
              <Text style={{color: '#6B7280', marginBottom: 20}}>Upload photos or documents of the vehicle&apos;s warranty agreements so drivers and managers can access them in the field.</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => setWarrantyModalVisible(true)}>
                <Ionicons name="document-attach-outline" size={24} color="#043094" style={{marginRight: 10}} />
                <Text style={styles.uploadBtnText}>Upload, Scan, or Take Photo of Warranty</Text>
              </TouchableOpacity>
              {form.warrantyFile ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, padding: 10, backgroundColor: '#ECFDF5', borderRadius: 6, borderWidth: 1, borderColor: '#D1FAE5' }}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={{ marginLeft: 8, color: '#065F46', fontWeight: '500' }}>{form.warrantyFile}</Text>
                </View>
              ) : null}
              <View style={{marginTop: 30}}>
                <FormField 
                  label="Powertrain Warranty Expiration" 
                  isDate={true}
                  value={form.powertrainExp}
                  onChangeText={(t: string) => setForm({...form, powertrainExp: t})}
                  placeholder="Miles or Date" 
                />
                <FormField 
                  label="Bumper to Bumper Expiration" 
                  isDate={true}
                  value={form.bumperExp}
                  onChangeText={(t: string) => setForm({...form, bumperExp: t})}
                  placeholder="Miles or Date" 
                />
              </View>
            </View>
          )}

          {activeSection === 'custom' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Custom Fields</Text>
              <FormField 
                label="Driver's License Requirement" 
                isSelect={true} 
                options={['Standard', 'CDL Class A', 'CDL Class B', 'CDL Class C', 'Motorcycle']}
                value={form.licenseReq}
                onValueChange={(val: string) => setForm({...form, licenseReq: val})}
                placeholder="e.g. CDL Required" 
              />
              <FormField 
                label="Special Equipment Installed" 
                value={form.specialEquip}
                onChangeText={(t: string) => setForm({...form, specialEquip: t})}
                placeholder="e.g. Lift Gate, Dashcam" 
              />
            </View>
          )}

          {activeSection === 'specs' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Engine Size" 
                    value={form.engineSize}
                    onChangeText={(t: string) => setForm({...form, engineSize: t})}
                    placeholder="e.g. 12.8L V8" 
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Transmission" 
                    value={form.transmission}
                    onChangeText={(t: string) => setForm({...form, transmission: t})}
                    placeholder="e.g. 10-Speed Automatic" 
                  />
                </View>
              </View>
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.halfCol}>
                  <FormField 
                    label="Drive Type" 
                    value={form.driveType}
                    onChangeText={(t: string) => setForm({...form, driveType: t})}
                    placeholder="e.g. 4x4, 6x4" 
                  />
                </View>
                <View style={styles.halfCol}>
                  <FormField 
                    label="GVWR (lbs)" 
                    value={form.gvwr}
                    onChangeText={(t: string) => setForm({...form, gvwr: t})}
                    placeholder="e.g. 52,000" 
                  />
                </View>
              </View>
            </View>
          )}

          {activeSection === 'settings' && (
            <View style={[styles.formSection, isMobile && { padding: 20 }]}>
              <Text style={styles.sectionTitle}>Settings</Text>
              <Text style={{color: '#6B7280', marginBottom: 20}}>Configure alerts and behavior for this specific vehicle.</Text>
              
              <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={{ flex: 1, marginBottom: isMobile ? 15 : 0 }}>
                  <Text style={styles.settingTitle}>Active GPS Tracking</Text>
                  <Text style={[styles.settingDesc, isMobile && { paddingRight: 0 }]}>Allow this vehicle&apos;s location to be viewed on the map.</Text>
                </View>
                <Ionicons name="toggle" size={32} color="#10B981" style={isMobile && { alignSelf: 'flex-end' }} />
              </View>

              <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={{ flex: 1, marginBottom: isMobile ? 15 : 0 }}>
                  <Text style={styles.settingTitle}>Maintenance Reminders</Text>
                  <Text style={[styles.settingDesc, isMobile && { paddingRight: 0 }]}>Send push notifications to the assigned driver when service is due.</Text>
                </View>
                <Ionicons name="toggle" size={32} color="#10B981" style={isMobile && { alignSelf: 'flex-end' }} />
              </View>

              <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={{ flex: 1, marginBottom: isMobile ? 15 : 0 }}>
                  <Text style={styles.settingTitle}>Speed Limit Threshold (mph)</Text>
                  <Text style={[styles.settingDesc, isMobile && { paddingRight: 0 }]}>Alert managers if this vehicle exceeds this speed.</Text>
                </View>
                <TextInput style={[styles.smallInput, isMobile && { alignSelf: 'flex-end', width: 100 }]} placeholder="70" keyboardType="numeric" />
              </View>
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
            <Text style={styles.dropdownTitle}>Vehicle Photo</Text>
            
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
