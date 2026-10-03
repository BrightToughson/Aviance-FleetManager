import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, TextInput, Image, Platform, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function InspectionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [managerNotes, setManagerNotes] = useState('');

  // Dummy inspection data based on id
  // Note: For testing a failed inspection, change status to 'Failed' and defects to a number > 0.
  const inspectionData = {
    id: id || 'INS-1042',
    vehicle: 'AP101',
    driver: 'John Smith',
    date: '2024-05-14 06:30 AM',
    status: (id as string) === 'INS-1020' ? 'Failed' : 'Passed',
    defects: (id as string) === 'INS-1020' ? 2 : 0,
    odometer: '45,210 mi',
    location: 'Main Yard, Gate A',
    checklist: [
      { category: 'Engine & Fluids', items: [
        { name: 'Oil Level', passed: true, note: '', photo: null },
        { name: 'Coolant Level', passed: true, note: '', photo: null },
        { name: 'Leaks', passed: true, note: '', photo: null },
        { name: 'Belts & Hoses', passed: true, note: '', photo: null }
      ]},
      { category: 'Tires & Brakes', items: [
        { name: 'Tire Pressure', passed: true, note: '', photo: null },
        { name: 'Tread Depth', passed: false, note: 'Rear left tire tread is wearing very thin, needs replacement soon.', photo: 'https://images.unsplash.com/photo-1579708985165-4f365319808f?w=300&q=80' },
        { name: 'Brake Function', passed: true, note: '', photo: null },
        { name: 'Lug Nuts', passed: true, note: '', photo: null }
      ]},
      { category: 'Safety & Exterior', items: [
        { name: 'Lights & Reflectors', passed: true, note: '', photo: null },
        { name: 'Windshield & Wipers', passed: false, note: 'Small crack on passenger side windshield.', photo: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=300&q=80' },
        { name: 'Mirrors', passed: true, note: '', photo: null },
        { name: 'Horn', passed: true, note: '', photo: null },
        { name: 'Emergency Equipment', passed: true, note: '', photo: null }
      ]}
    ]
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Passed': return '#10B981';
      case 'Failed': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const [isCertified, setIsCertified] = useState(inspectionData.status === 'Passed');
  const [isFlagged, setIsFlagged] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');

  let reviewText = "Pending Manager Sign-off";
  let reviewColor = '#B45309';
  let reviewBg = '#FEF3C7';
  let reviewBorder = '#F59E0B';

  if (isCertified) {
    reviewText = "Signed and Certified";
    reviewColor = '#059669';
    reviewBg = '#D1FAE5';
    reviewBorder = '#34D399';
  } else if (isFlagged) {
    reviewText = "Flagged for Maintenance";
    reviewColor = '#DC2626';
    reviewBg = '#FEE2E2';
    reviewBorder = '#F87171';
  }

  const handleCertify = () => {
    setIsPinModalVisible(true);
  };

  const confirmCertify = () => {
    if (pin === '1234') {
      setIsPinModalVisible(false);
      setIsCertified(true);
      setIsFlagged(false);
      setPin('');
      if (Platform.OS === 'web') window.alert("Inspection certified successfully.");
      else Alert.alert("Success", "Inspection certified successfully.");
    } else {
      if (Platform.OS === 'web') window.alert("Incorrect PIN");
      else Alert.alert("Error", "Incorrect PIN");
    }
  };

  const handleFlag = () => {
    setIsFlagged(true);
    setIsCertified(false);
    if (Platform.OS === 'web') window.alert("Vehicle flagged for maintenance.");
    else Alert.alert("Maintenance Alert", "Vehicle flagged for maintenance.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#4B5563" />
          <Text style={styles.backText}>Back to Inspections</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Inspection {inspectionData.id}</Text>
            <Text style={styles.subtitle}>{inspectionData.date} • {inspectionData.location}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspectionData.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(inspectionData.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(inspectionData.status) }]}>{inspectionData.status}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
        <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
          
          {/* Left Column: Driver Side Details */}
          <View style={[styles.leftCol, isMobile && { marginRight: 0, marginBottom: 20 }]}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Driver Submission</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Vehicle</Text>
                  <Text style={styles.infoValue}>{inspectionData.vehicle}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Driver</Text>
                  <Text style={styles.infoValue}>{inspectionData.driver}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Odometer</Text>
                  <Text style={styles.infoValue}>{inspectionData.odometer}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Checklist</Text>
              {inspectionData.checklist.map((section, idx) => (
                <View key={idx} style={styles.checklistSection}>
                  <Text style={styles.categoryTitle}>{section.category}</Text>
                  {section.items.map((item, i) => (
                    <View key={i} style={styles.checklistItem}>
                      <View style={styles.checklistItemLeft}>
                        <Ionicons 
                          name={item.passed ? "checkmark-circle" : "close-circle"} 
                          size={20} 
                          color={item.passed ? "#10B981" : "#EF4444"} 
                        />
                        <Text style={styles.checklistItemName}>{item.name}</Text>
                      </View>
                      {(!item.passed && item.note) || item.photo ? (
                        <View style={styles.checklistItemDetails}>
                          {item.note ? <Text style={styles.checklistItemNote}>{item.note}</Text> : null}
                          {item.photo ? (
                            <Image source={{ uri: item.photo }} style={styles.checklistItemPhoto} />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Right Column: Manager End */}
          <View style={styles.rightCol}>
            {inspectionData.status === 'Failed' && !isCertified && !isFlagged && (
              <View style={styles.alertBanner}>
                <Ionicons name="warning" size={24} color="#B45309" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBannerTitle}>Inspection Failed: Review Required</Text>
                  <Text style={styles.alertBannerText}>This inspection generated an alert. Please review the defects, coordinate maintenance if necessary, and manually certify once resolved.</Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manager's Review</Text>
              
              <View style={styles.managerAction}>
                <Text style={styles.actionLabel}>Defects Found</Text>
                <Text style={styles.actionValue}>{inspectionData.defects}</Text>
              </View>

              <View style={styles.managerAction}>
                <Text style={styles.actionLabel}>Review Status</Text>
                <View style={[styles.reviewStatusBox, { backgroundColor: reviewBg, borderColor: reviewBorder }]}>
                  <Text style={[styles.reviewStatusText, { color: reviewColor }]}>
                    {reviewText}
                  </Text>
                </View>
                {isCertified && (
                  <View style={styles.signatureBox}>
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/John_Hancock_signature.svg' }} style={styles.signatureImg} />
                    <Text style={styles.signatureStamp}>Digitally signed by Manager • {new Date().toLocaleDateString()}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.actionLabel}>Manager Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add review notes, instructions for mechanics, or compliance details..."
                multiline
                numberOfLines={4}
                value={managerNotes}
                onChangeText={setManagerNotes}
                // @ts-ignore
                outlineStyle="none"
              />

              {!isCertified && (
                <TouchableOpacity style={styles.signOffBtn} onPress={handleCertify}>
                  <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.signOffText}>Sign & Certify Inspection</Text>
                </TouchableOpacity>
              )}
              {!isCertified && !isFlagged && (
                <TouchableOpacity style={styles.rejectBtn} onPress={handleFlag}>
                  <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.rejectText}>Flag for Maintenance</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
        </View>
      </ScrollView>

      {/* PIN Authorization Modal */}
      <Modal visible={isPinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Authorize Signature</Text>
              <TouchableOpacity onPress={() => setIsPinModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>Please enter your 4-digit PIN to apply your digital signature.</Text>
              <View style={styles.signaturePreview}>
                <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/John_Hancock_signature.svg' }} style={styles.signatureImg} />
              </View>
              <TextInput 
                style={styles.pinInput}
                placeholder="Enter PIN (e.g., 1234)"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={pin}
                onChangeText={setPin}
                // @ts-ignore
                outlineStyle="none"
              />
              <TouchableOpacity style={styles.modalBtn} onPress={confirmCertify}>
                <Text style={styles.modalBtnText}>Authorize & Sign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#4B5563', fontSize: 14, fontWeight: '500', marginLeft: 4 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  
  contentScroll: { flex: 1 },
  content: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  grid: { flexDirection: 'row' },
  leftCol: { flex: 1.5, marginRight: 24 },
  rightCol: { flex: 1 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8 },
  infoCol: { flex: 1, minWidth: 120, marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 16 },
  checklistSection: { marginBottom: 20 },
  categoryTitle: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  checklistItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 12 },
  checklistItemLeft: { flexDirection: 'row', alignItems: 'center' },
  checklistItemName: { fontSize: 14, color: '#111827', marginLeft: 12, fontWeight: '500' },
  checklistItemDetails: { marginTop: 8, marginLeft: 32, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' },
  checklistItemNote: { fontSize: 13, color: '#EF4444', marginBottom: 4 },
  checklistItemPhoto: { width: 120, height: 90, borderRadius: 6, marginTop: 8 },
  
  managerAction: { marginBottom: 20 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  actionValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  
  reviewStatusBox: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignSelf: 'flex-start' },
  reviewStatusText: { color: '#B45309', fontWeight: '600', fontSize: 13 },
  
  notesInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, height: 100, textAlignVertical: 'top', color: '#111827', marginBottom: 24 },
  
  signOffBtn: { backgroundColor: '#043094', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 8, marginBottom: 12 },
  signOffText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  
  rejectBtn: { backgroundColor: '#FEF2F2', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
  rejectText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
  
  alertBanner: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B', marginBottom: 20, alignItems: 'flex-start' },
  alertBannerTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  alertBannerText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
  
  signatureBox: { marginTop: 24, alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  signatureImg: { width: 160, height: 60, resizeMode: 'contain', opacity: 0.8 },
  signatureStamp: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  signaturePreview: { backgroundColor: '#F9FAFB', padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  pinInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 16, fontSize: 18, textAlign: 'center', letterSpacing: 8, color: '#111827', marginBottom: 20 },
  modalBtn: { backgroundColor: '#043094', padding: 16, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
