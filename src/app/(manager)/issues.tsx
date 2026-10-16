import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FormModal, { FormField } from '../../components/FormModal';
import SummaryBox from '../../components/SummaryBox';
import { useAlerts } from '../../context/AlertsContext';
import { useIssues } from '../../context/IssuesContext';
import { useServices } from '../../context/ServicesContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';

export default function IssuesScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();
  const { addAlert } = useAlerts();
  const { issues, addIssue, updateIssue } = useIssues();
  const { addService } = useServices();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState('');

  const filteredIssues = useMemo(() => {
    let list = issues;
    
    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(i => 
      i.vehicle.toLowerCase().includes(lowerQuery) || 
      i.issue.toLowerCase().includes(lowerQuery) ||
      i.id.toLowerCase().includes(lowerQuery)
    );
  }, [issues, searchQuery]);

  const handleAddIssue = (data: any) => {
    addIssue({
      vehicle: data.vehicle || 'Unknown',
      issue: data.issue || 'No details provided',
      reporter: data.reporter || 'Current User',
      status: 'Open',
      priority: data.priority || 'Medium',
      needsServicing: data.needsServicing === 'Yes',
      serviceDetails: data.serviceDetails,
    });
    
    if (data.needsServicing === 'Yes') {
      addService({
        vehicle: data.vehicle || 'Unknown',
        vendor: 'Pending Assignment',
        tasks: data.serviceDetails || 'General Service',
        cost: 'GH₵0.00',
        status: 'Needs Service'
      });
      addAlert(`Service Requested`, `Service requested for ${data.vehicle || 'Unknown'}`, 'system');
    }
    
    addAlert(`New Issue Reported`, `Issue for ${data.vehicle || 'Unknown'} reported`, 'request');
  };

  const handleAction = (id: string) => {
    router.push(`/(manager)/issues/${id}` as any);
  };

  const onFlagPress = (id: string) => {
    setSelectedIssueId(id);
    setFlagModalVisible(true);
  };

  const modalFields: FormField[] = [
    { name: 'vehicle', label: 'Vehicle ID', type: 'text', required: true, placeholder: 'e.g. TRK-99' },
    { name: 'issue', label: 'Issue Description', type: 'text', required: true, placeholder: 'e.g. Check Engine Light' },
    { name: 'reporter', label: 'Reporter Name', type: 'text', placeholder: 'e.g. Jane Doe' },
    { name: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { name: 'needsServicing', label: 'Needs Servicing?', type: 'select', options: ['Yes', 'No'] },
    { name: 'serviceDetails', label: 'What needs to be serviced', type: 'text', dependsOn: { field: 'needsServicing', value: 'Yes' }, placeholder: 'e.g. Needs new engine block' },
  ];

  const flagFields: FormField[] = [
    { name: 'serviceDetails', label: 'Service Details', type: 'textarea', placeholder: 'Describe what needs to be serviced...', required: true }
  ];

  const handleFlagForService = (data: any) => {
    const issue = issues.find(i => i.id === selectedIssueId);
    if (issue) {
      addService({
        vehicle: issue.vehicle,
        vendor: 'Pending Assignment',
        tasks: data.serviceDetails,
        cost: 'GH₵0.00',
        status: 'Needs Service'
      });
      updateIssue(issue.id, { status: 'In Progress' });
      addAlert('Flagged for Service', `Inspection issue for ${issue.vehicle} has been flagged for service.`, 'system');
      showToast(`Issue ${issue.id} has been flagged for service!`, 'success');
    }
    setFlagModalVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>{t('m_issues_title', 'Issues')}</Text>
          <Text style={styles.pageSubtitle}>{t('m_issues_subtitle', 'Track defects, driver reports, and repair statuses')}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/issues/new')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{t('m_issues_report_btn', 'Report Issue')}</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: t('m_issues_open', 'Open'), count: issues.filter(i => i.status === 'Open').length, icon: 'warning', color: '#F87171' },
        { label: t('m_issues_high_priority', 'High Priority'), count: issues.filter(i => i.priority === 'High' && i.status !== 'Resolved').length, icon: 'alert-circle', color: '#EF4444' },
        { label: t('m_issues_in_progress', 'In Progress'), count: issues.filter(i => i.status === 'In Progress').length, icon: 'construct', color: '#F59E0B' },
        { label: t('m_issues_resolved', 'Resolved (30d)'), count: issues.filter(i => i.status === 'Resolved').length, icon: 'checkmark-circle', color: '#34D399' }
      ]} />



      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('m_issues_search_ph', 'Search issues or vehicles...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.listContainer}>
          {filteredIssues.map((issue) => (
            <TouchableOpacity 
              key={issue.id} 
              style={styles.issueCard}
              onPress={() => handleAction(issue.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.priorityStrip, { 
                backgroundColor: issue.priority === 'High' ? '#EF4444' : issue.priority === 'Medium' ? '#F59E0B' : '#10B981' 
              }]} />
              
              <View style={styles.issueCardContent}>
                <View style={styles.issueHeader}>
                  <View style={[styles.issueIdBadge, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.issueIdText, { color: '#4B5563', fontWeight: '600' }]}>{issue.priority} Priority</Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    issue.status === 'Resolved' ? styles.statusSuccess : 
                    issue.status === 'Open' ? styles.statusDanger : 
                    styles.statusWarning
                  ]}>
                    <Text style={[
                      styles.statusText,
                      issue.status === 'Resolved' ? styles.statusSuccessText : 
                      issue.status === 'Open' ? styles.statusDangerText : 
                      styles.statusWarningText
                    ]}>{issue.status}</Text>
                  </View>
                </View>

                <Text style={styles.issueTitle} numberOfLines={2}>{issue.issue}</Text>
                
                <View style={styles.issueDetailsRow}>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="car-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{issue.vehicle}</Text>
                  </View>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="person-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{issue.reporter}</Text>
                  </View>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{issue.date}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.chevronContainer}>
                {issue.origin === 'Inspection' && issue.status !== 'In Progress' ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => onFlagPress(issue.id)}>
                    <Text style={styles.actionBtnText}>{t('m_issues_flag_btn', 'Flag for Service')}</Text>
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FormModal 
        visible={flagModalVisible}
        onClose={() => setFlagModalVisible(false)}
        title="Flag for Maintenance"
        description="Provide details about the required maintenance. This will automatically create a new service record."
        fields={flagFields}
        onSubmit={handleFlagForService}
        submitText="Flag Issue"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  primaryBtn: { backgroundColor: '#043094', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statsGridMobile: { flexDirection: 'column' },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statCardMobile: { width: '100%' },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#111827' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  issueCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  priorityStrip: { width: 6 },
  issueCardContent: { flex: 1, padding: 16 },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueIdBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  issueIdText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  issueTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  issueDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  issueDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  issueDetailText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chevronContainer: { justifyContent: 'center', paddingRight: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusWarning: { backgroundColor: '#FEF3C7' },
  statusDanger: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusSuccessText: { color: '#059669' },
  statusWarningText: { color: '#D97706' },
  statusDangerText: { color: '#DC2626' },
  tabsContainer: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 20 },
  tab: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#043094' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#043094', fontWeight: '600' },
  actionBtn: { backgroundColor: '#043094', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
