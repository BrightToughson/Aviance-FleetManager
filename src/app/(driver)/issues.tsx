import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIssues } from '../../context/IssuesContext';
import { useAlerts } from '../../context/AlertsContext';

export default function ReportIssue() {
  const router = useRouter();
  const { addIssue } = useIssues();
  const { addAlert } = useAlerts();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!issueType || !description) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    
    addIssue({
      vehicle: '2022 Ford Transit', // currently hardcoded in UI
      issue: `${issueType}: ${description}`,
      reporter: 'Driver',
      status: 'Open',
      priority: 'Medium', // Default for driver reported
    });

    addAlert('Driver Reported Issue', `A new issue (${issueType}) was reported for 2022 Ford Transit.`, 'request');

    Alert.alert('Success', 'Issue reported successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.pageTitle}>Report a Vehicle Issue</Text>
      <Text style={styles.subtitle}>Let us know if you experienced any problems with your vehicle.</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Vehicle *</Text>
        <View style={styles.readonlyInput}>
          <Ionicons name="car-outline" size={20} color="#6B7280" />
          <Text style={styles.readonlyText}>2022 Ford Transit (XYZ-1234)</Text>
        </View>

        <Text style={styles.label}>Issue Type *</Text>
        <View style={styles.typeGrid}>
          {['Mechanical', 'Body Damage', 'Electrical', 'Tires', 'Other'].map((type) => (
            <TouchableOpacity 
              key={type}
              style={[styles.typeButton, issueType === type && styles.typeButtonActive]}
              onPress={() => setIssueType(type)}
            >
              <Text style={[styles.typeButtonText, issueType === type && styles.typeButtonTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Please describe the issue in detail..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Photo Attachment (Optional)</Text>
        <TouchableOpacity style={styles.uploadButton}>
          <Ionicons name="camera-outline" size={24} color="#043094" />
          <Text style={styles.uploadButtonText}>Take a Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  readonlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  readonlyText: {
    fontSize: 15,
    color: '#4B5563',
    marginLeft: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#043094',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#043094',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
