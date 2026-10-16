import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { useIssues } from '../../../context/IssuesContext';
import { useServices } from '../../../context/ServicesContext';
import { useAlerts } from '../../../context/AlertsContext';

export default function NewIssueScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const { addIssue } = useIssues();
  const { addService } = useServices();
  const { addAlert } = useAlerts();

  const [vehicle, setVehicle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [reporter, setReporter] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [needsServicing, setNeedsServicing] = useState('No');
  const [serviceDetails, setServiceDetails] = useState('');

  const handleReportIssue = () => {
    if (!vehicle || !issueDesc || (needsServicing === 'Yes' && !serviceDetails)) {
      if (Platform.OS === 'web') window.alert('Please fill all required fields');
      else alert('Please fill all required fields');
      return;
    }

    addIssue({
      vehicle,
      issue: issueDesc,
      reporter: reporter || 'Current User',
      status: 'Open',
      priority,
      needsServicing: needsServicing === 'Yes',
      serviceDetails: needsServicing === 'Yes' ? serviceDetails : undefined,
    });
    
    if (needsServicing === 'Yes') {
      addService({
        vehicle,
        vendor: 'Pending Assignment',
        tasks: serviceDetails,
        cost: 'GH₵0.00',
        status: 'Needs Service'
      });
      addAlert(`Service Requested`, `Service requested for ${vehicle}`, 'system');
    }
    
    addAlert(`New Issue Reported`, `Issue for ${vehicle} reported`, 'request');

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/issues');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(manager)/issues')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#043094" />
            <Text style={styles.backBtnText}>Back to Issues</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{t('m_issues_report_btn', 'Report Issue')}</Text>
          <Text style={styles.pageSubtitle}>Log a new defect or problem with a vehicle</Text>
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
              <Text style={styles.label}>Issue Description <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput 
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} 
                placeholder="e.g. Check Engine Light"
                multiline
                numberOfLines={3}
                value={issueDesc}
                onChangeText={setIssueDesc}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reporter Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Jane Doe"
                value={reporter}
                onChangeText={setReporter}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              {Platform.OS === 'web' ? (
                <select
                  style={styles.webSelect}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={priority} onValueChange={(val) => setPriority(val)}>
                    <Picker.Item label="High" value="High" />
                    <Picker.Item label="Medium" value="Medium" />
                    <Picker.Item label="Low" value="Low" />
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Needs Servicing?</Text>
              {Platform.OS === 'web' ? (
                <select
                  style={styles.webSelect}
                  value={needsServicing}
                  onChange={(e) => setNeedsServicing(e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={needsServicing} onValueChange={(val) => setNeedsServicing(val)}>
                    <Picker.Item label="Yes" value="Yes" />
                    <Picker.Item label="No" value="No" />
                  </Picker>
                </View>
              )}
            </View>

            {needsServicing === 'Yes' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What needs to be serviced <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput 
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} 
                  placeholder="e.g. Needs new engine block"
                  multiline
                  numberOfLines={3}
                  value={serviceDetails}
                  onChangeText={setServiceDetails}
                />
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleReportIssue}>
              <Text style={styles.submitBtnText}>Report Issue</Text>
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
