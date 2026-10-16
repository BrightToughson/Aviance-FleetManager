import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Alert, Platform, Modal, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAlerts } from '../../context/AlertsContext';

import { useUser } from '@clerk/expo';

export default function DriverRequestsScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();
  const { addAlert } = useAlerts();
  const { user } = useUser();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();

      const channel = supabase.channel(`manager_driver_requests_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'driver_requests' },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [user?.id]);

  const fetchRequests = async () => {
    if (!user?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Get drivers belonging to this manager
      const { data: myDrivers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id);
      const myDriverIds = (myDrivers || []).map((d: any) => d.id);

      if (myDriverIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('driver_requests')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .in('driver_id', myDriverIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      
      // Update selectedRequest if it's currently open
      if (selectedRequest) {
        const updated = (data || []).find((r: any) => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    } catch (err) {
      console.error('Error fetching driver requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string, driverName: string, reqType: string) => {
    try {
      const { error } = await supabase
        .from('driver_requests')
        .update({ status: newStatus })
        .eq('id', id);

      addAlert(`${reqType} Request ${newStatus}`, `You have ${newStatus.toLowerCase()} the request for ${driverName}`, 'system');

      const targetReq = requests.find(r => r.id === id);
      if (targetReq?.driver_id) {
        await supabase.from('alerts').insert([{
          title: `${reqType} Request ${newStatus}`,
          body: `Your ${reqType.toLowerCase()} request has been ${newStatus.toLowerCase()} by your manager.`,
          type: 'request',
          user_id: targetReq.driver_id,
          manager_id: user?.id || null
        }]);
      }

      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }

      if (Platform.OS === 'web') window.alert('Status updated successfully');
      else Alert.alert('Success', 'Status updated successfully');
    } catch (err) {
      console.error('Error updating status:', err);
      if (Platform.OS === 'web') window.alert('Failed to update status');
      else Alert.alert('Error', 'Failed to update status');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!searchQuery) return true;
    const name = r.profiles?.full_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || r.request_type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return null;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const parseRequestDetails = (details: string) => {
    if (!details) return { category: '', reason: '', contact: '' };
    let category = '';
    let contact = '';
    let reason = details;

    const catMatch = reason.match(/^\[(.*?)\]\s*/);
    if (catMatch) {
      category = catMatch[1];
      reason = reason.replace(catMatch[0], '');
    }

    const contactMatch = reason.match(/\s*\|\s*Contact:\s*(.*)$/);
    if (contactMatch) {
      contact = contactMatch[1];
      reason = reason.replace(contactMatch[0], '');
    }

    return { category, reason: reason.trim(), contact: contact.trim() };
  };

  const parsedDetails = selectedRequest ? parseRequestDetails(selectedRequest.details) : { category: '', reason: '', contact: '' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Driver Requests</Text>
          <Text style={styles.pageSubtitle}>Manage Time Off and Expense Requests</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={fetchRequests}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{t('m_refresh', 'Refresh')}</Text>
        </TouchableOpacity>
      </View>

      <SummaryBox items={[
        { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, icon: 'time', color: '#F59E0B' },
        { label: 'Approved', count: requests.filter(r => r.status === 'approved').length, icon: 'checkmark-circle', color: '#10B981' },
        { label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length, icon: 'close-circle', color: '#EF4444' }
      ]} />

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search drivers or request types..."
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
          {loading && <Text style={{ padding: 20 }}>Loading requests...</Text>}
          {!loading && filteredRequests.length === 0 && <Text style={{ padding: 20 }}>No driver requests found.</Text>}
          {!loading && filteredRequests.map((req) => (
            <TouchableOpacity 
              key={req.id} 
              style={styles.issueCard} 
              activeOpacity={0.85}
              onPress={() => setSelectedRequest(req)}
            >
              <View style={[styles.priorityStrip, { 
                backgroundColor: req.status === 'pending' ? '#F59E0B' : req.status === 'approved' ? '#10B981' : '#EF4444' 
              }]} />
              
              <View style={styles.issueCardContent}>
                <View style={styles.issueHeader}>
                  <View style={styles.issueIdBadge}>
                    <Text style={styles.issueIdText}>{req.request_type}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    req.status === 'approved' ? styles.statusSuccess : 
                    req.status === 'pending' ? styles.statusWarning : 
                    styles.statusDanger
                  ]}>
                    <Text style={[
                      styles.statusText,
                      req.status === 'approved' ? styles.statusSuccessText : 
                      req.status === 'pending' ? styles.statusWarningText : 
                      styles.statusDangerText
                    ]}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.issueTitle} numberOfLines={2}>{req.details}</Text>
                
                {req.request_type === 'Time Off' && req.start_date && req.end_date && (
                   <Text style={{ marginBottom: 12, color: '#374151', fontSize: 14 }}>
                     Dates: {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                     {calculateDays(req.start_date, req.end_date) ? ` (${calculateDays(req.start_date, req.end_date)} days)` : ''}
                   </Text>
                )}

                {req.request_type === 'Expense' && req.amount && (
                   <Text style={{ marginBottom: 12, color: '#374151', fontWeight: 'bold' }}>
                     Amount: GH₵{req.amount}
                   </Text>
                )}

                <View style={styles.issueDetailsRow}>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="person-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{req.profiles?.full_name || 'Unknown Driver'}</Text>
                  </View>
                  <View style={styles.issueDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.issueDetailText}>{new Date(req.created_at).toLocaleDateString()}</Text>
                  </View>
                  {req.receipt_url && (
                    <View style={styles.issueDetailItem}>
                      <Ionicons name="attach" size={16} color="#043094" />
                      <Text style={[styles.issueDetailText, { color: '#043094', fontWeight: '600' }]}>Attachment</Text>
                    </View>
                  )}
                </View>

                {req.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#10B981' }]} 
                      onPress={(e) => {
                        // @ts-ignore
                        e.stopPropagation?.();
                        updateStatus(req.id, 'approved', req.profiles?.full_name || 'Driver', req.request_type);
                      }}
                    >
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} 
                      onPress={(e) => {
                        // @ts-ignore
                        e.stopPropagation?.();
                        updateStatus(req.id, 'rejected', req.profiles?.full_name || 'Driver', req.request_type);
                      }}
                    >
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* DETAIL MODAL */}
      <Modal
        visible={!!selectedRequest}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.issueIdBadge}>
                      <Text style={styles.issueIdText}>{selectedRequest.request_type}</Text>
                    </View>
                    <Text style={styles.modalTitle}>Request Details</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 24 }}>
                  {/* Status Banner */}
                  <View style={[
                    styles.statusBanner,
                    selectedRequest.status === 'approved' ? styles.statusSuccess : 
                    selectedRequest.status === 'pending' ? styles.statusWarning : 
                    styles.statusDanger
                  ]}>
                    <Ionicons 
                      name={selectedRequest.status === 'approved' ? 'checkmark-circle' : selectedRequest.status === 'pending' ? 'time' : 'close-circle'} 
                      size={20} 
                      color={selectedRequest.status === 'approved' ? '#059669' : selectedRequest.status === 'pending' ? '#D97706' : '#DC2626'} 
                    />
                    <Text style={[
                      styles.statusBannerText,
                      selectedRequest.status === 'approved' ? styles.statusSuccessText : 
                      selectedRequest.status === 'pending' ? styles.statusWarningText : 
                      styles.statusDangerText
                    ]}>
                      Status: {selectedRequest.status.toUpperCase()}
                    </Text>
                  </View>

                  {/* Driver Information */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Driver Information</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Name</Text>
                        <Text style={styles.infoValue}>{selectedRequest.profiles?.full_name || 'Unknown'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{selectedRequest.profiles?.email || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Requested On</Text>
                        <Text style={styles.infoValue}>{new Date(selectedRequest.created_at).toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Request Specifics */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Request Details</Text>
                    
                    {selectedRequest.request_type === 'Time Off' && (
                      <View style={styles.infoGrid}>
                        {parsedDetails.category ? (
                          <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Leave Category</Text>
                            <Text style={[styles.infoValue, { color: '#043094' }]}>{parsedDetails.category}</Text>
                          </View>
                        ) : null}
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Start Date</Text>
                          <Text style={styles.infoValue}>{selectedRequest.start_date ? new Date(selectedRequest.start_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>End Date</Text>
                          <Text style={styles.infoValue}>{selectedRequest.end_date ? new Date(selectedRequest.end_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Total Duration</Text>
                          <Text style={styles.infoValue}>{calculateDays(selectedRequest.start_date, selectedRequest.end_date) ? `${calculateDays(selectedRequest.start_date, selectedRequest.end_date)} Day(s)` : 'N/A'}</Text>
                        </View>
                      </View>
                    )}

                    {selectedRequest.request_type === 'Expense' && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Claim Amount</Text>
                        <Text style={[styles.infoValue, { color: '#043094', fontSize: 18, fontWeight: '700' }]}>GH₵ {selectedRequest.amount}</Text>
                      </View>
                    )}

                    {parsedDetails.contact ? (
                      <View style={{ marginTop: 14 }}>
                        <Text style={styles.infoLabel}>Emergency Contact / Handover</Text>
                        <View style={styles.contactBox}>
                          <Ionicons name="call-outline" size={16} color="#043094" />
                          <Text style={styles.contactText}>{parsedDetails.contact}</Text>
                        </View>
                      </View>
                    ) : null}

                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.infoLabel}>Reason & Notes</Text>
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonText}>{parsedDetails.reason || selectedRequest.details}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Attached Document / Receipt */}
                  {selectedRequest.receipt_url && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionHeader}>Supporting Document</Text>
                      <TouchableOpacity 
                        style={styles.attachmentCard} 
                        onPress={() => {
                          const origin = typeof window !== 'undefined' ? window.location.origin : '';
                          const viewerUrl = `${origin}/public/viewer?url=${encodeURIComponent(selectedRequest.receipt_url)}&name=${encodeURIComponent('Receipt - ' + (selectedRequest.title || selectedRequest.id))}&category=Receipt`;
                          if (Platform.OS === 'web') {
                            window.open(viewerUrl, '_blank');
                          } else {
                            Linking.openURL(viewerUrl);
                          }
                        }}
                      >
                        <Ionicons name="document-attach" size={24} color="#043094" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.attachmentTitle}>View Full Document / Receipt</Text>
                          <Text style={styles.attachmentSub}>Click to open file in new window</Text>
                        </View>
                        <Ionicons name="open-outline" size={20} color="#043094" />
                      </TouchableOpacity>
                      {/* Image Preview if web */}
                      {Platform.OS === 'web' && (
                        <View style={styles.previewContainer}>
                          <Image 
                            source={{ uri: selectedRequest.receipt_url }} 
                            style={styles.previewImage} 
                            resizeMode="contain" 
                          />
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>

                {/* Footer Actions */}
                <View style={styles.modalFooter}>
                  {selectedRequest.status === 'pending' ? (
                    <View style={styles.footerBtnGroup}>
                      <TouchableOpacity 
                        style={[styles.modalActionBtn, styles.approveBtn]} 
                        onPress={() => updateStatus(selectedRequest.id, 'approved', selectedRequest.profiles?.full_name || 'Driver', selectedRequest.request_type)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Approve Request</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.modalActionBtn, styles.rejectBtn]} 
                        onPress={() => updateStatus(selectedRequest.id, 'rejected', selectedRequest.profiles?.full_name || 'Driver', selectedRequest.request_type)}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Reject Request</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.closeActionBtn]} 
                      onPress={() => setSelectedRequest(null)}
                    >
                      <Text style={styles.closeActionText}>Close</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  issueCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, cursor: 'pointer' } as any,
  priorityStrip: { width: 6 },
  issueCardContent: { flex: 1, padding: 16 },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueIdBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  issueIdText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  issueTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  issueDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  issueDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  issueDetailText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  actionRow: { flexDirection: 'row', marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, gap: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusWarning: { backgroundColor: '#FEF3C7' },
  statusDanger: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusSuccessText: { color: '#059669' },
  statusWarningText: { color: '#D97706' },
  statusDangerText: { color: '#DC2626' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* MODAL STYLES */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90%', display: 'flex', flexDirection: 'column', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { padding: 4 },
  modalBody: { padding: 20 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, gap: 8, marginBottom: 20 },
  statusBannerText: { fontSize: 14, fontWeight: '700' },
  detailSection: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  infoItem: { minWidth: 130, flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  contactBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', gap: 8 },
  contactText: { fontSize: 14, color: '#1E40AF', fontWeight: '600' },
  reasonBox: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 },
  reasonText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  attachmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 14, marginBottom: 12 },
  attachmentTitle: { fontSize: 14, fontWeight: '600', color: '#043094' },
  attachmentSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  previewContainer: { height: 220, backgroundColor: '#F3F4F6', borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  previewImage: { width: '100%', height: '100%' },
  
  modalFooter: { flexDirection: 'row', padding: 18, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', alignItems: 'center' },
  footerBtnGroup: { flexDirection: 'row', gap: 12, flex: 1 },
  modalActionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, gap: 8, cursor: 'pointer' } as any,
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  closeActionBtn: { backgroundColor: '#F3F4F6', flex: 1 },
  closeActionText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  modalActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
