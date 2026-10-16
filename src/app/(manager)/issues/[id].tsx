import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIssues } from '../../../context/IssuesContext';
import FormModal, { FormField } from '../../../components/FormModal';
import { useServices } from '../../../context/ServicesContext';
import { useAlerts } from '../../../context/AlertsContext';
import { supabase } from '../../../lib/supabase';

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { issues, updateIssue } = useIssues();
  const { addService } = useServices();
  const { addAlert } = useAlerts();

  const [flagModalVisible, setFlagModalVisible] = useState(false);

  const issue = issues.find(i => i.id === id);

  const flagFields: FormField[] = [
    { name: 'serviceDetails', label: 'Service Details', type: 'textarea', placeholder: 'Describe what needs to be serviced...', required: true }
  ];

  const handleFlagForService = async (data: any) => {
    if (issue) {
      if (issue.vehicleId) {
        const { error: maintError } = await supabase.from('maintenance_requests').insert([{
          vehicle_id: issue.vehicleId,
          driver_id: issue.reporterId || 'unknown',
          description: `Flagged from Issue #${typeof id === 'string' ? id.slice(0, 8) : ''}. Notes: ${data.serviceDetails || 'No manager notes provided.'}`,
          status: 'pending'
        }]);

        if (maintError) {
           console.error(maintError);
           if (Platform.OS === 'web') window.alert("Failed to flag for maintenance.");
           else Alert.alert("Error", "Failed to flag for maintenance.");
           setFlagModalVisible(false);
           return;
        }

        await supabase.from('alerts').insert([{
          title: 'Maintenance Required',
          body: `Please bring ${issue.vehicle} to the mechanic. Maintenance has been flagged from an issue.`,
          type: 'request',
          is_read: false
        }]);
      } else {
        addService({
          vehicle: issue.vehicle,
          vendor: 'Pending Assignment',
          tasks: data.serviceDetails,
          cost: 'GH₵0.00',
          status: 'Needs Service'
        });
      }

      updateIssue(issue.id, { status: 'In Progress' });
      addAlert('Flagged for Maintenance', `Issue for ${issue.vehicle} has been flagged for maintenance.`, 'system');
      
      setFlagModalVisible(false);
      router.push('/(manager)/maintenance');
    }
  };

  const handleMarkResolved = () => {
    if (issue) {
      updateIssue(issue.id, { status: 'Resolved' });
      addAlert('Issue Resolved', `Issue for ${issue.vehicle} has been marked as resolved.`, 'system');
    }
  };

  if (!issue) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Issue not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(manager)/issues')}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backNav} onPress={() => router.push('/(manager)/issues')}>
        <Ionicons name="arrow-back" size={20} color="#4B5563" />
        <Text style={styles.backNavText}>Back to Issues</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.idText}>{issue.priority} Priority Issue</Text>
            <Text style={styles.title}>{issue.issue}</Text>
          </View>
          <View style={[styles.badge, issue.status === 'Resolved' ? styles.badgeSuccess : issue.status === 'Open' ? styles.badgeDanger : styles.badgeWarning]}>
            <Text style={[styles.badgeText, issue.status === 'Resolved' ? styles.badgeSuccessText : issue.status === 'Open' ? styles.badgeDangerText : styles.badgeWarningText]}>
              {issue.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{issue.vehicle}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Reported By</Text>
            <Text style={styles.detailValue}>{issue.reporter}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{issue.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Priority</Text>
            <Text style={[styles.detailValue, issue.priority === 'High' ? {color: '#EF4444'} : issue.priority === 'Medium' ? {color: '#F59E0B'} : undefined]}>
              {issue.priority}
            </Text>
          </View>
        </View>

        {issue.imageUrl && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Attached Photo</Text>
            <Image source={{ uri: issue.imageUrl }} style={styles.attachedImage} />
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.actionButtons}>
          {issue.status !== 'In Progress' && issue.status !== 'Resolved' && (
            <TouchableOpacity style={[styles.actionBtn, styles.btnWarning]} onPress={() => setFlagModalVisible(true)}>
              <Text style={styles.btnWarningText}>Flag for Maintenance</Text>
            </TouchableOpacity>
          )}
          {issue.status !== 'Resolved' && (
            <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess]} onPress={handleMarkResolved}>
              <Text style={styles.btnSuccessText}>Mark Resolved</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>

      <FormModal 
        visible={flagModalVisible}
        onClose={() => setFlagModalVisible(false)}
        title="Flag for Maintenance"
        description={`Provide details about the required maintenance for ${issue?.vehicle}. This will automatically create a new service record.`}
        fields={flagFields}
        onSubmit={handleFlagForService}
        submitText="Flag Issue"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  backNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backNavText: { marginLeft: 8, color: '#4B5563', fontSize: 16, fontWeight: '500' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  idText: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 14, fontWeight: '600' },
  badgeSuccessText: { color: '#059669' },
  badgeWarningText: { color: '#D97706' },
  badgeDangerText: { color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  detailItem: { minWidth: 150, flex: 1 },
  detailLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 16 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnWarning: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  btnWarningText: { color: '#D97706', fontWeight: '600' },
  btnSuccess: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  btnSuccessText: { color: '#059669', fontWeight: '600' },
  imageSection: { marginTop: 24 },
  attachedImage: { width: '100%', height: 300, borderRadius: 12, resizeMode: 'cover', marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' },
});
