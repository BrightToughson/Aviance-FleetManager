import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Image, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInspections } from '../../context/InspectionContext';
import { useIssues } from '../../context/IssuesContext';
import { useAlerts } from '../../context/AlertsContext';

export default function NewInspectionScreen() {
  const router = useRouter();
  const { addInspection } = useInspections();
  const { addIssue } = useIssues();
  const { addAlert } = useAlerts();

  // Initial checklist state
  type ChecklistItem = { id: string; name: string; passed: boolean; note: string; photo: string | null };
  type ChecklistCategory = { category: string; items: ChecklistItem[] };
  
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([
    {
      category: 'Engine & Fluids',
      items: [
        { id: '1', name: 'Oil Level', passed: false, note: 'Low oil detected', photo: 'https://images.unsplash.com/photo-1596541249767-e95e87a20c33?w=300&q=80' },
        { id: '2', name: 'Coolant Level', passed: true, note: '', photo: null },
        { id: '3', name: 'Leaks', passed: true, note: '', photo: null },
        { id: '4', name: 'Belts & Hoses', passed: true, note: '', photo: null },
      ]
    },
    {
      category: 'Tires & Brakes',
      items: [
        { id: '5', name: 'Tire Pressure', passed: true, note: '', photo: null },
        { id: '6', name: 'Tread Depth', passed: true, note: '', photo: null },
        { id: '7', name: 'Brake Function', passed: true, note: '', photo: null },
        { id: '8', name: 'Lug Nuts', passed: true, note: '', photo: null },
      ]
    },
    {
      category: 'Safety & Exterior',
      items: [
        { id: '9', name: 'Lights & Reflectors', passed: true, note: '', photo: null },
        { id: '10', name: 'Windshield & Wipers', passed: true, note: '', photo: null },
        { id: '11', name: 'Mirrors', passed: true, note: '', photo: null },
        { id: '12', name: 'Horn', passed: true, note: '', photo: null },
        { id: '13', name: 'Emergency Equipment', passed: true, note: '', photo: null },
      ]
    }
  ]);

  const toggleItem = (categoryIndex: number, itemIndex: number, value: boolean) => {
    const updatedChecklist = [...checklist];
    updatedChecklist[categoryIndex].items[itemIndex].passed = value;
    if (value) {
      // Reset note and photo if it's toggled back to 'Passed'
      updatedChecklist[categoryIndex].items[itemIndex].note = '';
      updatedChecklist[categoryIndex].items[itemIndex].photo = null;
    }
    setChecklist(updatedChecklist);
  };

  const updateItemNote = (categoryIndex: number, itemIndex: number, text: string) => {
    const updatedChecklist = [...checklist];
    updatedChecklist[categoryIndex].items[itemIndex].note = text;
    setChecklist(updatedChecklist);
  };

  const capturePhoto = (categoryIndex: number, itemIndex: number) => {
    // In a real app, you would launch expo-camera or expo-image-picker here.
    // We will just mock taking a photo.
    const updatedChecklist = [...checklist];
    updatedChecklist[categoryIndex].items[itemIndex].photo = 'https://images.unsplash.com/photo-1596541249767-e95e87a20c33?w=300&q=80'; // mock broken part photo
    setChecklist(updatedChecklist);
  };

  const submitInspection = () => {
    // Check if any items are failed
    let hasFailures = false;
    let missingDetails = false;
    let failedCount = 0;
    let failedItemNames: string[] = [];

    checklist.forEach(cat => {
      cat.items.forEach(item => {
        if (!item.passed) {
          hasFailures = true;
          failedCount++;
          failedItemNames.push(item.name);
          if (!item.note && !item.photo) {
            missingDetails = true;
          }
        }
      });
    });

    if (missingDetails) {
      if (Platform.OS === 'web') window.alert("Please provide a note or photo for all failed items.");
      else Alert.alert("Missing Information", "Please provide a note or photo for all failed items.");
      return;
    }

    const message = hasFailures 
      ? "Inspection failed. A notification has been sent to your manager." 
      : "Inspection passed successfully!";

    // Save to context
    addInspection({
      type: 'Pre-Trip', // Hardcoded for now, could be selected in UI
      status: hasFailures ? 'Failed' : 'Passed',
      vehicle: '2022 Ford Transit', // Hardcoded for now
    });

    if (hasFailures) {
      addIssue({
        vehicle: '2022 Ford Transit',
        issue: `Inspection failed: ${failedItemNames.join(', ')}`,
        reporter: 'Driver', // Default driver name
        status: 'Open',
        priority: failedCount >= 2 ? 'High' : 'Low',
        origin: 'Inspection',
      });
      addAlert('Failed Inspection', `A pre-trip inspection failed for 2022 Ford Transit (${failedCount} faulty items).`, 'checklist');
    }

    if (Platform.OS === 'web') {
      window.alert(message);
      router.back();
    } else {
      Alert.alert("Success", message, [
        { text: "OK", onPress: () => router.back() }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Pre-Trip Inspection</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        <View style={styles.vehicleInfoCard}>
          <Ionicons name="car-outline" size={24} color="#043094" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.vehicleInfoTitle}>2022 Ford Transit</Text>
            <Text style={styles.vehicleInfoSubtitle}>Odometer: 45,210 mi</Text>
          </View>
        </View>

        <View style={styles.instructionBox}>
          <Ionicons name="information-circle" size={20} color="#1D4ED8" />
          <Text style={styles.instructionText}>Toggle switches off for any faults found. You must provide a photo or note for all faults.</Text>
        </View>

        {checklist.map((section, catIndex) => (
          <View key={catIndex} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            
            {section.items.map((item, itemIndex) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Switch
                    value={item.passed}
                    onValueChange={(val) => toggleItem(catIndex, itemIndex, val)}
                    trackColor={{ false: '#FCA5A5', true: '#6EE7B7' }}
                    thumbColor={item.passed ? '#10B981' : '#EF4444'}
                  />
                </View>

                {!item.passed && (
                  <View style={styles.faultDetailsBox}>
                    <Text style={styles.faultDetailsLabel}>Describe Fault</Text>
                    <TextInput 
                      style={styles.faultInput}
                      placeholder="What is wrong with this item?"
                      value={item.note}
                      onChangeText={(text) => updateItemNote(catIndex, itemIndex, text)}
                      // @ts-ignore
                      outlineStyle="none"
                    />
                    
                    {item.photo ? (
                      <View style={styles.photoPreviewContainer}>
                        <Image source={{ uri: item.photo }} style={styles.photoPreview} />
                        <TouchableOpacity style={styles.removePhotoBtn} onPress={() => {
                          const updated = [...checklist];
                          updated[catIndex].items[itemIndex].photo = null;
                          setChecklist(updated);
                        }}>
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addPhotoBtn} onPress={() => capturePhoto(catIndex, itemIndex)}>
                        <Ionicons name="camera" size={20} color="#4B5563" />
                        <Text style={styles.addPhotoText}>Take Photo of Fault</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={submitInspection}>
          <Text style={styles.submitBtnText}>Submit Inspection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  
  content: { flex: 1 },
  
  vehicleInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  vehicleInfoTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  vehicleInfoSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  
  instructionBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#DBEAFE', padding: 12, borderRadius: 8, marginBottom: 20 },
  instructionText: { color: '#1E3A8A', fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 },
  
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', backgroundColor: '#F9FAFB', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  
  itemRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, color: '#111827', fontWeight: '500' },
  
  faultDetailsBox: { marginTop: 16, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' },
  faultDetailsLabel: { fontSize: 12, fontWeight: '600', color: '#991B1B', marginBottom: 8 },
  faultInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 6, padding: 12, fontSize: 14, color: '#111827', marginBottom: 12 },
  
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', padding: 16, borderRadius: 6 },
  addPhotoText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#4B5563' },
  
  photoPreviewContainer: { position: 'relative', width: 120, height: 90 },
  photoPreview: { width: '100%', height: '100%', borderRadius: 6 },
  removePhotoBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 12 },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  submitBtn: { backgroundColor: '#043094', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
