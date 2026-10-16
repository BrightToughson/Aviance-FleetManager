import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../../context/ServicesContext';

export default function NewRequestScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const { addService } = useServices();

  const [vehicle, setVehicle] = useState('');
  const [task, setTask] = useState('');

  const handleCreateRequest = () => {
    if (!vehicle || !task) {
      if (Platform.OS === 'web') window.alert('Please fill all required fields');
      else alert('Please fill all required fields');
      return;
    }
    addService({
      vehicle,
      vendor: 'Pending Assignment',
      tasks: task,
      cost: 'GH₵0.00',
      status: 'Needs Service'
    });
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
          <Text style={styles.pageTitle}>{t('m_services_create_req', 'Create Request')}</Text>
          <Text style={styles.pageSubtitle}>Log a new service request for a vehicle</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, !isMobile && styles.desktopLayout]}>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle ID <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. TRK-99"
                value={vehicle}
                onChangeText={setVehicle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Details <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput 
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} 
                placeholder="What needs to be serviced?"
                multiline
                numberOfLines={4}
                value={task}
                onChangeText={setTask}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateRequest}>
              <Text style={styles.submitBtnText}>Create Request</Text>
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
  submitBtn: { backgroundColor: '#043094', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
