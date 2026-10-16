import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Part, useParts } from '../context/PartsContext';
import { useVehicles } from '../context/VehicleContext';

interface StockAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  part: Part | null;
  initialMode?: 'use' | 'restock' | 'set';
  onSuccess?: () => void;
}

export default function StockAdjustmentModal({
  visible,
  onClose,
  part,
  initialMode = 'use',
  onSuccess,
}: StockAdjustmentModalProps) {
  const { updatePart } = useParts();
  const vehicleContext = useVehicles();
  const vehicles = vehicleContext?.vehicles || [];

  const [mode, setMode] = useState<'use' | 'restock' | 'set'>('use');
  const [amountStr, setAmountStr] = useState('1');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && part) {
      setMode(initialMode);
      setAmountStr(initialMode === 'set' ? String(part.qty || 0) : '1');
      setSelectedVehicle('');
      setReason('');
      setSubmitting(false);
    }
  }, [visible, part, initialMode]);

  const currentQty = part?.qty || 0;
  const reorderPoint = part?.reorder || 0;
  const parsedAmount = parseInt(amountStr, 10);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 0;

  // Calculate resulting quantity
  const resultingQty = useMemo(() => {
    if (!isValidAmount) return currentQty;
    if (mode === 'use') return Math.max(0, currentQty - parsedAmount);
    if (mode === 'restock') return currentQty + parsedAmount;
    if (mode === 'set') return parsedAmount;
    return currentQty;
  }, [currentQty, mode, parsedAmount, isValidAmount]);

  const isExceedingStock = mode === 'use' && isValidAmount && parsedAmount > currentQty;
  const willBeOutOfStock = resultingQty === 0;
  const willBeLowStock = !willBeOutOfStock && resultingQty <= reorderPoint;

  const handleSubmit = async () => {
    if (!part) return;

    if (!isValidAmount || parsedAmount < 0) {
      const msg = 'Please enter a valid quantity.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Invalid Quantity', msg);
      return;
    }

    if (mode === 'use' && parsedAmount === 0) {
      const msg = 'Please enter at least 1 unit to deduct.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Invalid Amount', msg);
      return;
    }

    if (isExceedingStock) {
      const msg = `Cannot use ${parsedAmount} units. You only have ${currentQty} units in stock.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Insufficient Stock', msg);
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toLocaleString();
      let logEntry = '';
      if (mode === 'use') {
        const target = selectedVehicle ? `for vehicle ${selectedVehicle}` : 'general usage';
        logEntry = `\n[${now}] Used ${parsedAmount} units ${target}${reason ? ` (${reason})` : ''}. New stock: ${resultingQty}.`;
      } else if (mode === 'restock') {
        logEntry = `\n[${now}] Restocked +${parsedAmount} units${reason ? ` (${reason})` : ''}. New stock: ${resultingQty}.`;
      } else {
        logEntry = `\n[${now}] Manual stock audit adjusted to ${resultingQty} units${reason ? ` (${reason})` : ''}.`;
      }

      const updatedNotes = (part.notes || '') + logEntry;

      await updatePart(part.id, {
        qty: resultingQty,
        notes: updatedNotes,
      });

      const successMsg = mode === 'use' 
        ? `Successfully logged ${parsedAmount} units used. Remaining stock: ${resultingQty}.`
        : mode === 'restock'
        ? `Successfully added ${parsedAmount} units to stock. Total stock: ${resultingQty}.`
        : `Stock level updated to ${resultingQty} units.`;

      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert('Stock Updated', successMsg);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adjusting stock:', err);
      const errMsg = 'Failed to update stock. Please try again.';
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert('Error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!part) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Adjust Stock: {part.name}</Text>
              <Text style={styles.modalSubtitle}>
                SKU: {part.sku} • Current Stock: <Text style={{ fontWeight: '700', color: '#111827' }}>{currentQty}</Text> (Min: {reorderPoint})
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Mode Switch Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, mode === 'use' && styles.tabActiveUse]}
                onPress={() => {
                  setMode('use');
                  setAmountStr('1');
                }}
              >
                <Ionicons name="arrow-down-circle" size={16} color={mode === 'use' ? '#DC2626' : '#6B7280'} />
                <Text style={[styles.tabText, mode === 'use' && styles.tabTextActiveUse]}>Record Usage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, mode === 'restock' && styles.tabActiveRestock]}
                onPress={() => {
                  setMode('restock');
                  setAmountStr('10');
                }}
              >
                <Ionicons name="arrow-up-circle" size={16} color={mode === 'restock' ? '#059669' : '#6B7280'} />
                <Text style={[styles.tabText, mode === 'restock' && styles.tabTextActiveRestock]}>Restock (+)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, mode === 'set' && styles.tabActiveSet]}
                onPress={() => {
                  setMode('set');
                  setAmountStr(String(currentQty));
                }}
              >
                <Ionicons name="create-outline" size={16} color={mode === 'set' ? '#043094' : '#6B7280'} />
                <Text style={[styles.tabText, mode === 'set' && styles.tabTextActiveSet]}>Set Exact</Text>
              </TouchableOpacity>
            </View>

            {/* Quantity Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {mode === 'use' ? 'Quantity to Use / Deduct *' : mode === 'restock' ? 'Quantity Received / Adding *' : 'New Exact Stock Count *'}
              </Text>
              <TextInput
                style={styles.input}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="number-pad"
                placeholder="Enter quantity..."
                autoFocus
              />
            </View>

            {/* Vehicle Selector (When mode === 'use') */}
            {mode === 'use' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Installed / Used On (Optional)</Text>
                {Platform.OS === 'web' && vehicles.length > 0 ? (
                  <select
                    style={styles.webSelect}
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                  >
                    <option value="">-- General / Non-Vehicle Usage --</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={`${v.name} (${v.license_plate || v.plate || 'No Plate'})`}>
                        {v.name} ({v.license_plate || v.plate || 'No Plate'}) {v.model ? `• ${v.model}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={selectedVehicle}
                    onChangeText={setSelectedVehicle}
                    placeholder="e.g. Ford Transit (GT-104-20)"
                  />
                )}
              </View>
            )}

            {/* Reason / Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {mode === 'use' ? 'Reason / Work Order Notes' : mode === 'restock' ? 'Supplier / PO Number' : 'Reason for Adjustment'}
              </Text>
              <TextInput
                style={[styles.input, { height: 68 }]}
                value={reason}
                onChangeText={setReason}
                multiline
                textAlignVertical="top"
                placeholder={
                  mode === 'use'
                    ? 'e.g. Replaced worn brake pads during 50,000km scheduled service'
                    : mode === 'restock'
                    ? 'e.g. Received new shipment from AutoZone - Invoice #9281'
                    : 'e.g. Physical inventory count verified on shelf'
                }
              />
            </View>

            {/* Live Preview Box */}
            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <View style={styles.previewStat}>
                  <Text style={styles.previewStatLabel}>Current Stock</Text>
                  <Text style={styles.previewStatValue}>{currentQty}</Text>
                </View>
                <Ionicons 
                  name={mode === 'use' ? 'remove' : mode === 'restock' ? 'add' : 'arrow-forward'} 
                  size={20} 
                  color="#6B7280" 
                />
                <View style={styles.previewStat}>
                  <Text style={styles.previewStatLabel}>Adjustment</Text>
                  <Text style={[styles.previewStatValue, { color: mode === 'use' ? '#DC2626' : mode === 'restock' ? '#059669' : '#043094' }]}>
                    {mode === 'use' ? `-${isValidAmount ? parsedAmount : 0}` : mode === 'restock' ? `+${isValidAmount ? parsedAmount : 0}` : `Set to ${isValidAmount ? parsedAmount : currentQty}`}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#6B7280" />
                <View style={styles.previewStat}>
                  <Text style={styles.previewStatLabel}>New Stock</Text>
                  <Text style={[
                    styles.previewStatValue, 
                    { fontWeight: '800' },
                    willBeOutOfStock ? { color: '#DC2626' } : willBeLowStock ? { color: '#D97706' } : { color: '#059669' }
                  ]}>
                    {resultingQty}
                  </Text>
                </View>
              </View>

              {/* Status Warning Pill */}
              {isExceedingStock ? (
                <View style={[styles.alertBanner, styles.alertError]}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={[styles.alertBannerText, { color: '#DC2626' }]}>
                    Cannot deduct more than available in stock ({currentQty} units available).
                  </Text>
                </View>
              ) : willBeOutOfStock ? (
                <View style={[styles.alertBanner, styles.alertOutOfStock]}>
                  <Ionicons name="warning" size={18} color="#DC2626" />
                  <Text style={[styles.alertBannerText, { color: '#DC2626' }]}>
                    This action will trigger an OUT OF STOCK alert (0 units remaining).
                  </Text>
                </View>
              ) : willBeLowStock ? (
                <View style={[styles.alertBanner, styles.alertLowStock]}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <Text style={[styles.alertBannerText, { color: '#D97706' }]}>
                    Remaining stock ({resultingQty}) is ≤ Reorder Point ({reorderPoint}). A LOW STOCK alert will be triggered!
                  </Text>
                </View>
              ) : (
                <View style={[styles.alertBanner, styles.alertHealthy]}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={[styles.alertBannerText, { color: '#059669' }]}>
                    Stock level will remain healthy (In Stock).
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                mode === 'use' ? styles.submitBtnUse : mode === 'restock' ? styles.submitBtnRestock : styles.submitBtnSet,
                (isExceedingStock || submitting) && { opacity: 0.6 }
              ]}
              onPress={handleSubmit}
              disabled={isExceedingStock || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name={mode === 'use' ? 'checkmark-circle' : mode === 'restock' ? 'add-circle' : 'save'} 
                    size={18} 
                    color="#fff" 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={styles.submitBtnText}>
                    {mode === 'use' ? 'Confirm Part Usage' : mode === 'restock' ? 'Confirm Restock' : 'Save New Count'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  tabActiveUse: {
    backgroundColor: '#FEE2E2',
  },
  tabActiveRestock: {
    backgroundColor: '#D1FAE5',
  },
  tabActiveSet: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActiveUse: {
    color: '#DC2626',
  },
  tabTextActiveRestock: {
    color: '#059669',
  },
  tabTextActiveSet: {
    color: '#043094',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  webSelect: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    color: '#111827',
    cursor: 'pointer',
    outlineStyle: 'none',
  } as any,
  previewBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewStat: {
    alignItems: 'center',
  },
  previewStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  previewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  alertHealthy: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  alertLowStock: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertOutOfStock: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  alertBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitBtnUse: {
    backgroundColor: '#DC2626',
  },
  submitBtnRestock: {
    backgroundColor: '#059669',
  },
  submitBtnSet: {
    backgroundColor: '#043094',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
