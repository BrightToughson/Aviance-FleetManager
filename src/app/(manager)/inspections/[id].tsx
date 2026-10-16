import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, TextInput, Image, Platform, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInspections } from '../../../context/InspectionContext';
import { supabase } from '../../../lib/supabase';

export default function InspectionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isStacked = width < 1050;
  const { user } = useUser();

  const formatTitleCase = (str: string) => {
    if (!str) return 'Bright Toughson';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  const rawName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Bright Toughson');
  const managerDisplayName = formatTitleCase(rawName);

  const [managerNotes, setManagerNotes] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [isCertified, setIsCertified] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');

  const { inspections, loading, refreshInspections } = useInspections();
  const inspectionData = inspections.find(i => i.id === id);

  // Sync status state when inspection data loads
  useEffect(() => {
    if (inspectionData) {
      setIsCertified(inspectionData.status === 'Passed' || inspectionData.status === 'Certified');
      setIsFlagged(inspectionData.status === 'Flagged');
    }
  }, [inspectionData?.status]);

  // Load user's configured signature PIN
  useEffect(() => {
    async function loadPin() {
      try {
        const pinKey = user?.id ? `@signature_pin_${user.id}` : '@signature_pin_default';
        const stored = await AsyncStorage.getItem(pinKey);
        if (stored) {
          setSavedPin(stored);
        }
      } catch (err) {
        console.error("Error reading signature PIN:", err);
      }
    }
    loadPin();
  }, [user]);

  if (loading || !inspectionData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading inspection details...</Text>
      </View>
    );
  }

  const LABELS: Record<string, string> = {
    tires: 'Tires & Wheels',
    lights: 'Headlights & Signals',
    brakes: 'Brakes & Steering',
    fluids: 'Fluid Levels (Oil/Coolant)',
    body: 'Exterior Body Damage',
    mirrors: 'Mirrors & Windows',
    wipers: 'Wipers & Washer Fluid',
    horn: 'Horn & Backup Alarm',
    emergency: 'Emergency Equipment',
    battery: 'Car Battery'
  };

  const checklistItems = inspectionData.checklist 
    ? Object.entries(inspectionData.checklist).map(([key, passed]) => ({
        key,
        name: LABELS[key] || key,
        passed,
        photo: inspectionData.issue_images?.[key] || null
      }))
    : [];

  const defectsCount = checklistItems.filter(i => !i.passed).length;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Passed': return '#10B981';
      case 'Failed': return '#EF4444';
      default: return '#F59E0B';
    }
  };

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

  const confirmCertify = async () => {
    const enteredPin = pin.trim();

    if (!enteredPin || enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
      if (Platform.OS === 'web') window.alert("Please enter a valid 4-digit PIN (numbers only).");
      else Alert.alert("Invalid PIN", "Please enter a valid 4-digit PIN (numbers only).");
      return;
    }

    const isNewSetup = !savedPin || isResettingPin;
    const isValid = isNewSetup || enteredPin === savedPin || enteredPin === '1234';

    if (!isValid) {
      if (Platform.OS === 'web') window.alert("Incorrect PIN. If you forgot your PIN, tap 'Forgot PIN' to set a new one.");
      else Alert.alert("Incorrect PIN", "If you forgot your PIN, tap 'Forgot PIN' to set a new one.");
      return;
    }

    try {
      // Save newly chosen PIN for this user
      if (isNewSetup) {
        const pinKey = user?.id ? `@signature_pin_${user.id}` : '@signature_pin_default';
        await AsyncStorage.setItem(pinKey, enteredPin);
        setSavedPin(enteredPin);
        setIsResettingPin(false);
      }

      const { error } = await supabase
        .from('inspections')
        .update({ 
          status: 'pass',
          notes: managerNotes ? `${inspectionData.notes || ''}\n\n[Certified by Manager]: ${managerNotes}`.trim() : (inspectionData.notes || '')
        })
        .eq('id', id);

      if (error) console.error("Error updating inspection status:", error);

      setIsPinModalVisible(false);
      setIsCertified(true);
      setIsFlagged(false);
      setPin('');
      if (refreshInspections) refreshInspections();

      const successMsg = isNewSetup
        ? `PIN set to ${enteredPin}! Inspection certified successfully.`
        : "Inspection signed and certified successfully.";

      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert("Success", successMsg);
    } catch (err: any) {
      console.error("Error certifying inspection:", err);
    }
  };

  const handleFlag = async () => {
    try {
      // 1. Update inspection status
      const { error: inspError } = await supabase
        .from('inspections')
        .update({ status: 'Flagged' })
        .eq('id', id);
      if (inspError) throw inspError;

      const { data: rawInsp } = await supabase.from('inspections').select('vehicle_id, driver_id').eq('id', id).single();
      const realVehicleId = rawInsp?.vehicle_id;
      const realDriverId = rawInsp?.driver_id;

      if (realVehicleId) {
        // 2. Create Maintenance Request
        const { error: maintError } = await supabase.from('maintenance_requests').insert([{
          vehicle_id: realVehicleId,
          driver_id: realDriverId || 'unknown',
          description: `Flagged from Inspection #${typeof id === 'string' ? id.slice(0, 8) : ''}. Notes: ${managerNotes || 'No manager notes provided.'}`,
          status: 'pending'
        }]);
        if (maintError) throw maintError;

        // 3. Send Alert to Driver (DO NOT ground the vehicle yet)
        const vehicleName = inspectionData.vehicle || 'your vehicle';
        const { error: alertError } = await supabase.from('alerts').insert([{
          title: 'Maintenance Required',
          body: `Please bring ${vehicleName} to the mechanic for a physical inspection. Maintenance has been flagged.`,
          type: 'request',
          is_read: false
        }]);
        if (alertError) console.error("Failed to send alert", alertError);
      }

      setIsFlagged(true);
      setIsCertified(false);
      
      if (Platform.OS === 'web') window.alert("Vehicle flagged for maintenance. An alert has been sent to the driver.");
      else Alert.alert("Maintenance Alert", "Vehicle flagged for maintenance. An alert has been sent to the driver.");
      
      // Optionally route to the new maintenance tab
      router.push('/(manager)/maintenance');
      
    } catch (error: any) {
      console.error('Error flagging inspection:', error);
      if (Platform.OS === 'web') window.alert("Failed to flag for maintenance.");
      else Alert.alert("Error", "Failed to flag for maintenance.");
    }
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
            <Text style={styles.title}>Inspection {inspectionData.id.slice(0, 8)}</Text>
            <Text style={styles.subtitle}>{inspectionData.date} • {inspectionData.issue_location || 'No Location specified'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspectionData.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(inspectionData.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(inspectionData.status) }]}>{inspectionData.status}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
        <View style={[styles.grid, isStacked && { flexDirection: 'column' }]}>
          
          {/* Left Column: Driver Side Details */}
          <View style={[styles.leftCol, isStacked ? { marginRight: 0, marginBottom: 24 } : { marginRight: 24 }]}>
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
                  <Text style={styles.infoLabel}>Fuel Level</Text>
                  <Text style={styles.infoValue}>{inspectionData.fuel_level || 'N/A'}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Checklist</Text>
              <View style={styles.checklistContainer}>
                {checklistItems.length === 0 ? (
                  <Text style={{ color: '#6B7280', padding: 10 }}>No checklist data available.</Text>
                ) : (
                  <View style={styles.checklistSection}>
                    {checklistItems.map((item, i) => (
                      <View key={i} style={styles.checklistItem}>
                        <View style={styles.checklistItemLeft}>
                          <Ionicons 
                            name={item.passed ? "checkmark-circle" : "close-circle"} 
                            size={20} 
                            color={item.passed ? "#10B981" : "#EF4444"} 
                          />
                          <Text style={styles.checklistItemName}>{item.name}</Text>
                        </View>
                        {item.photo ? (
                          <View style={styles.checklistItemDetails}>
                            <Image source={{ uri: item.photo }} style={styles.checklistItemPhoto} />
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
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
                <Text style={styles.actionValue}>{defectsCount}</Text>
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
                    <View style={styles.certBadgeHeader}>
                      <View style={styles.certBadgePill}>
                        <Ionicons name="shield-checkmark" size={13} color="#059669" />
                        <Text style={styles.certBadgePillText}>DIGITALLY CERTIFIED</Text>
                      </View>
                      <Text style={styles.certHashText}>AUTH #{id ? id.toString().slice(0, 8).toUpperCase() : 'DVIR'}</Text>
                    </View>

                    <View style={styles.signatureInkContainer}>
                      <Text 
                        numberOfLines={1} 
                        style={styles.cursiveSignature}
                      >
                        {managerDisplayName}
                      </Text>
                      <View style={styles.signaturePenLine} />
                    </View>

                    <View style={styles.certMetaRow}>
                      <View style={styles.certMetaItem}>
                        <Text style={styles.certMetaLabel}>SIGNER</Text>
                        <Text style={styles.certMetaValue} numberOfLines={1}>{managerDisplayName}</Text>
                        <Text style={styles.certMetaSub}>Fleet Operations Manager</Text>
                      </View>
                      <View style={[styles.certMetaItem, { alignItems: 'flex-end' }]}>
                        <Text style={styles.certMetaLabel}>CERTIFIED ON</Text>
                        <Text style={styles.certMetaValue}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        <Text style={styles.certMetaSub}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                    </View>
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
              <View>
                <Text style={styles.modalTitle}>
                  {!savedPin 
                    ? "Set Your Signature PIN" 
                    : isResettingPin 
                      ? "Reset Signature PIN" 
                      : "Authorize Signature"}
                </Text>
                <Text style={styles.modalSubtitleTop}>
                  {!savedPin 
                    ? "First-Time Manager Setup" 
                    : isResettingPin 
                      ? "Create a new PIN" 
                      : "Manager Digital Compliance"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setIsPinModalVisible(false); setIsResettingPin(false); setPin(''); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                {!savedPin 
                  ? "As a new user, you don't have a PIN yet! Enter any 4-digit code below to set it as your personal signature PIN." 
                  : isResettingPin 
                    ? "Enter a new 4-digit PIN to replace your current signature code."
                    : "Enter your 4-digit signature PIN to apply your official manager certification."}
              </Text>

              <View style={[styles.pinHintBadge, !savedPin ? styles.pinHintBadgeNew : null]}>
                <Ionicons name={!savedPin ? "sparkles-outline" : "key-outline"} size={16} color={!savedPin ? "#059669" : "#043094"} />
                <Text style={[styles.pinHintText, !savedPin ? { color: '#065F46' } : null]}>
                  {!savedPin 
                    ? "Pick any 4 digits (e.g. 1234, 5555). It will be saved to your account."
                    : `Saved PIN active (Demo fallback: 1234)`}
                </Text>
              </View>

              <View style={styles.signaturePreview}>
                <View style={styles.signatureInkContainerModal}>
                  <Ionicons name="shield-checkmark" size={18} color="#043094" style={{ marginBottom: 4 }} />
                  <Text style={styles.cursiveSignatureModal}>
                    {managerDisplayName}
                  </Text>
                  <View style={styles.signaturePenLine} />
                </View>
                <Text style={styles.signatureNameText}>{managerDisplayName}</Text>
                <Text style={styles.signatureRoleSubtitle}>Fleet Operations Manager • Digital Signature</Text>
              </View>

              <TextInput 
                style={styles.pinInput}
                placeholder={!savedPin || isResettingPin ? "Create 4-digit PIN" : "Enter PIN (or 1234)"}
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={pin}
                onChangeText={setPin}
                // @ts-ignore
                outlineStyle="none"
              />

              <TouchableOpacity style={styles.modalBtn} onPress={confirmCertify}>
                <Text style={styles.modalBtnText}>
                  {!savedPin 
                    ? "Set PIN & Certify Report" 
                    : isResettingPin 
                      ? "Save New PIN & Certify" 
                      : "Authorize & Sign"}
                </Text>
              </TouchableOpacity>

              {savedPin && (
                <TouchableOpacity 
                  style={styles.resetPinToggleBtn} 
                  onPress={() => {
                    setIsResettingPin(!isResettingPin);
                    setPin('');
                  }}
                >
                  <Text style={styles.resetPinToggleText}>
                    {isResettingPin ? "Cancel & Use Current PIN" : "Forgot PIN? Tap to set a new PIN"}
                  </Text>
                </TouchableOpacity>
              )}
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
  leftCol: { flex: 1.3 },
  rightCol: { flex: 1, minWidth: 300 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8 },
  infoCol: { flex: 1, minWidth: 120, marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 16 },
  checklistContainer: { marginTop: 4 },
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
  
  signatureBox: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  certBadgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  certBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  certBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  certHashText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: '#64748B',
    fontWeight: '700',
  },
  signatureInkContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  signatureInkContainerModal: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cursiveSignature: {
    fontFamily: Platform.OS === 'web' ? '"Caveat", "Brush Script MT", "Dancing Script", "Segoe Script", cursive' : undefined,
    fontSize: 24,
    color: '#1E3A8A',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    // @ts-ignore
    whiteSpace: 'nowrap',
  },
  cursiveSignatureModal: {
    fontFamily: Platform.OS === 'web' ? '"Caveat", "Brush Script MT", "Dancing Script", "Segoe Script", cursive' : undefined,
    fontSize: 22,
    color: '#1E3A8A',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  signaturePenLine: {
    height: 1.5,
    backgroundColor: '#93C5FD',
    width: '60%',
    alignSelf: 'center',
    marginTop: 3,
    borderRadius: 1,
  },
  certMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  certMetaItem: {
    flex: 1,
  },
  certMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  certMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  certMetaSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSubtitleTop: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modalBody: { padding: 20 },
  modalSubtitle: { fontSize: 14, color: '#4B5563', marginBottom: 14, lineHeight: 20 },
  pinHintBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 16, gap: 8 },
  pinHintBadgeNew: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  pinHintText: { fontSize: 12, color: '#043094', flex: 1, lineHeight: 16 },
  signaturePreview: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  signatureNameText: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  signatureRoleSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  pinInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 8, color: '#111827', marginBottom: 16 },
  modalBtn: { backgroundColor: '#043094', padding: 16, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  resetPinToggleBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  resetPinToggleText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
});
