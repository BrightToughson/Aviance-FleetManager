import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../../context/ServicesContext';
import { Picker } from '@react-native-picker/picker';

export default function NewROScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { requestId } = params;
  
  const isMobile = width < 1024;
  
  const { services, addService, updateService } = useServices();

  const [vehicle, setVehicle] = useState('');
  const [vendor, setVendor] = useState('');
  const [task, setTask] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (requestId) {
      const existingReq = services.find(s => s.id === requestId);
      if (existingReq) {
        setVehicle(existingReq.vehicle);
        setTask(existingReq.tasks);
      }
    }
  }, [requestId, services]);

  const pendingVehicles = Array.from(new Set(services.filter(s => s.status === 'Needs Service').map(s => s.vehicle)));

  const handleCreateRO = () => {
    if (!vehicle || !task) {
      if (Platform.OS === 'web') window.alert('Please fill all required fields');
      else alert('Please fill all required fields');
      return;
    }
    
    if (vehicle === 'No pending requests') {
      if (Platform.OS === 'web') window.alert('Please create a request first.');
      else alert('Please create a request first.');
      return;
    }

    const existingReq = services.find(s => s.status === 'Needs Service' && s.vehicle === vehicle);
    if (existingReq) {
      updateService(existingReq.id, {
        vendor: vendor || 'In-House',
        tasks: task || existingReq.tasks,
        cost: cost ? `GH₵${cost}` : 'GH₵0.00',
        status: 'Approved',
        id: `RO-90${Math.floor(Math.random() * 100)}`
      });
    } else {
      addService({
        vehicle: vehicle || 'Unknown',
        vendor: vendor || 'In-House',
        tasks: task || 'General Service',
        cost: cost ? `GH₵${cost}` : 'GH₵0.00',
        status: 'Approved'
      });
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/services');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(manager)/services')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#043094" />
            <Text style={styles.backBtnText}>Back to Services</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{t('m_services_create_ro', 'Create RO')}</Text>
          <Text style={styles.pageSubtitle}>Create a new repair order from a service request</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, !isMobile && styles.desktopLayout]}>
          <View style={styles.card}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle ID (from requests) <Text style={{color: 'red'}}>*</Text></Text>
              {Platform.OS === 'web' ? (
                <select
                  style={styles.webSelect}
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                >
                  <option value="" disabled>Select a vehicle</option>
                  {pendingVehicles.length > 0 ? pendingVehicles.map(v => (
                    <option key={v} value={v}>{v}</option>
                  )) : (
                    <option value="No pending requests">No pending requests</option>
                  )}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={vehicle}
                    onValueChange={(val) => setVehicle(val)}
                  >
                    <Picker.Item label="Select a vehicle" value="" />
                    {pendingVehicles.length > 0 ? pendingVehicles.map(v => (
                      <Picker.Item key={v} label={v} value={v} />
                    )) : (
                      <Picker.Item label="No pending requests" value="No pending requests" />
                    )}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vendor/Shop</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Jiffy Lube"
                value={vendor}
                onChangeText={setVendor}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Task <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Oil Change"
                value={task}
                onChangeText={setTask}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Cost (GH₵)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="150.00"
                keyboardType="numeric"
                value={cost}
                onChangeText={setCost}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateRO}>
              <Text style={styles.submitBtnText}>Create RO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBanner: { backgroundColor: '#fff', paddingVertical: 30, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerContent: { maxWidth: 1000, width: '100%', alignSelf: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  backBtnText: { color: '#043094', fontSize: 14, marginLeft: 6, fontWeight: '600' },
  pageTitle: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  pageSubtitle: { fontSize: 16, color: '#6B7280' },
  contentContainer: { padding: 20, alignItems: 'center' },
  mainLayout: { width: '100%', maxWidth: 600, marginTop: 20 },
  desktopLayout: { maxWidth: 600 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827' },
  pickerContainer: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  webSelect: { width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', fontSize: 15, color: '#111827' },
  submitBtn: { backgroundColor: '#043094', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
