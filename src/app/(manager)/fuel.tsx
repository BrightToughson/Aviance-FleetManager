import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import SummaryBox from '../../components/SummaryBox';
import { supabase } from '../../lib/supabase';
import { useVehicles } from '../../context/VehicleContext';
import { useUser } from '@clerk/expo';

interface FuelLogRecord {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  amount: number;
  cost: number;
  odometer: number | null;
  date: string;
  created_at: string;
  receipt_url?: string | null;
  vehicle?: {
    id: string;
    name: string;
    make: string;
    model: string;
    license_plate: string;
  } | null;
  driver?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export default function FuelLogsScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 1024;
  const router = useRouter();
  const { user } = useUser();
  const { vehicles } = useVehicles();

  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<FuelLogRecord | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '30days'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New fuel form state
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newGallons, setNewGallons] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newOdometer, setNewOdometer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFuelLogs = async () => {
    if (!user?.id) {
      setFuelLogs([]);
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
      const myDriverIds = new Set((myDrivers || []).map((d: any) => d.id));
      const myVehicleIds = new Set((vehicles || []).map((v: any) => v.id));

      if (myDriverIds.size === 0 && myVehicleIds.size === 0) {
        setFuelLogs([]);
        setLoading(false);
        return;
      }

      let { data, error } = await supabase
        .from('fuel_logs')
        .select(`
          *,
          vehicle:vehicles(id, name, make, model, license_plate),
          driver:profiles(id, full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Joined fuel query failed, falling back to direct query:', error);
        const fallback = await supabase
          .from('fuel_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!fallback.error && fallback.data) {
          data = fallback.data;
          error = null;
        }
      }

      if (error) {
        console.error('Error fetching fuel logs:', error);
      } else {
        const filtered = (data || []).filter((log: any) => 
          (log.vehicle_id && myVehicleIds.has(log.vehicle_id)) ||
          (log.driver_id && myDriverIds.has(log.driver_id))
        );
        setFuelLogs(filtered);
      }
    } catch (err) {
      console.error('Fetch fuel error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchFuelLogs();

      const channel = supabase
        .channel(`manager_fuel_logs_realtime_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fuel_logs' },
          () => {
            fetchFuelLogs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setFuelLogs([]);
      setLoading(false);
    }
  }, [user?.id, vehicles]);

  const filteredLogs = useMemo(() => {
    let result = [...fuelLogs];

    // Date filtering
    const now = new Date();
    if (dateFilter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      result = result.filter(log => (log.date || log.created_at || '').startsWith(todayStr));
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(log => new Date(log.date || log.created_at) >= thirtyDaysAgo);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(log => {
        const plate = log.vehicle?.license_plate?.toLowerCase() || '';
        const vName = `${log.vehicle?.make || ''} ${log.vehicle?.model || ''} ${log.vehicle?.name || ''}`.toLowerCase();
        const driverName = log.driver?.full_name?.toLowerCase() || '';
        const costStr = (log.cost || '').toString();
        const amountStr = (log.amount || '').toString();
        return (
          plate.includes(q) ||
          vName.includes(q) ||
          driverName.includes(q) ||
          costStr.includes(q) ||
          amountStr.includes(q)
        );
      });
    }

    return result;
  }, [fuelLogs, searchQuery, dateFilter]);

  // Aggregate statistics
  const totalCost = useMemo(() => {
    return fuelLogs.reduce((acc, log) => acc + (Number(log.cost) || 0), 0);
  }, [fuelLogs]);

  const totalGallons = useMemo(() => {
    return fuelLogs.reduce((acc, log) => acc + (Number(log.amount) || 0), 0);
  }, [fuelLogs]);

  const avgCostPerFill = useMemo(() => {
    if (fuelLogs.length === 0) return 0;
    return totalCost / fuelLogs.length;
  }, [fuelLogs, totalCost]);

  const handleAddFuelSubmit = async () => {
    if (!newCost.trim() || !newGallons.trim()) {
      const msg = 'Please enter both cost and gallons/liters.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Required Fields', msg);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        amount: parseFloat(newGallons) || 0,
        cost: parseFloat(newCost) || 0,
        date: new Date().toISOString(),
      };
      if (newVehicleId) payload.vehicle_id = newVehicleId;
      if (newOdometer) {
        payload.odometer = parseInt(newOdometer.replace(/[^0-9]/g, ''), 10) || null;
      }

      const { error } = await supabase.from('fuel_logs').insert([payload]);
      if (error) throw error;

      setAddModalOpen(false);
      setNewCost('');
      setNewGallons('');
      setNewOdometer('');
      setNewVehicleId('');
      fetchFuelLogs();
    } catch (err: any) {
      console.error('Failed to log fuel:', err);
      const errAlert = err?.message || 'Could not save fuel entry.';
      if (Platform.OS === 'web') window.alert(errAlert);
      else Alert.alert('Error', errAlert);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Row */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>{t('m_fuel_title', 'Fuel & Fill-ups')}</Text>
          <Text style={styles.pageSubtitle}>
            {t('m_fuel_subtitle', 'Monitor driver fuel receipts, fill-up expenditures, and volume')}
          </Text>
        </View>
        <View style={styles.headerBtnGroup}>
          <Pressable
            style={({ hovered }: any) => [
              styles.secondaryBtn,
              hovered && { backgroundColor: '#E0E7FF' },
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hovered ? [{ translateY: -1 }] : [{ translateY: 0 }],
              } as any),
            ]}
            onPress={() => router.push('/(manager)/reports/new' as any)}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#043094" />
            <Text style={styles.secondaryBtnText}>{t('m_fuel_report_btn', 'Fuel Report')}</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [
              styles.primaryBtn,
              hovered && { backgroundColor: '#032573' },
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hovered ? [{ translateY: -1 }] : [{ translateY: 0 }],
                boxShadow: hovered ? '0 6px 16px rgba(4, 48, 148, 0.28)' : '0 2px 4px rgba(4, 48, 148, 0.15)',
              } as any),
            ]}
            onPress={() => setAddModalOpen(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('m_fuel_log_btn', 'Log Fill-up')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Summary Box */}
      <SummaryBox
        items={[
          {
            label: t('m_fuel_stat_total_cost', 'Total Fuel Spend'),
            count: `GH₵${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: 'cash',
            color: '#10B981',
          },
          {
            label: t('m_fuel_stat_gallons', 'Total Volume'),
            count: `${totalGallons.toFixed(1)} Gal / L`,
            icon: 'water',
            color: '#0284C7',
          },
          {
            label: t('m_fuel_stat_avg_fill', 'Avg / Fill-up'),
            count: `GH₵${avgCostPerFill.toFixed(2)}`,
            icon: 'calculator',
            color: '#F59E0B',
          },
          {
            label: t('m_fuel_stat_entries', 'Total Fill-ups'),
            count: fuelLogs.length,
            icon: 'speedometer',
            color: '#8B5CF6',
          },
        ]}
      />

      {/* Search and Filters */}
      <View style={[styles.searchFilterRow, isMobile && styles.searchFilterRowMobile]}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('m_fuel_search_ph', 'Search by vehicle, plate, or driver...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterChipsRow}>
          <Pressable
            style={({ hovered }: any) => [
              styles.filterChip,
              dateFilter === 'all' && styles.filterChipActive,
              hovered && dateFilter !== 'all' && { backgroundColor: '#F1F5F9' },
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: hovered ? [{ translateY: -1 }] : [{ translateY: 0 }],
              } as any),
            ]}
            onPress={() => setDateFilter('all')}
          >
            <Text style={[styles.filterChipText, dateFilter === 'all' && styles.filterChipTextActive]}>
              {t('common_all', 'All Time')}
            </Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [
              styles.filterChip,
              dateFilter === '30days' && styles.filterChipActive,
              hovered && dateFilter !== '30days' && { backgroundColor: '#F1F5F9' },
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: hovered ? [{ translateY: -1 }] : [{ translateY: 0 }],
              } as any),
            ]}
            onPress={() => setDateFilter('30days')}
          >
            <Text style={[styles.filterChipText, dateFilter === '30days' && styles.filterChipTextActive]}>
              {t('common_last_30_days', 'Last 30 Days')}
            </Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [
              styles.filterChip,
              dateFilter === 'today' && styles.filterChipActive,
              hovered && dateFilter !== 'today' && { backgroundColor: '#F1F5F9' },
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: hovered ? [{ translateY: -1 }] : [{ translateY: 0 }],
              } as any),
            ]}
            onPress={() => setDateFilter('today')}
          >
            <Text style={[styles.filterChipText, dateFilter === 'today' && styles.filterChipTextActive]}>
              {t('common_today', 'Today')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#043094" />
          <Text style={styles.loadingText}>{t('m_fuel_loading', 'Loading fuel logs...')}</Text>
        </View>
      ) : filteredLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="water-outline" size={48} color="#043094" />
          </View>
          <Text style={styles.emptyTitle}>{t('m_fuel_empty_title', 'No Fuel Logs Found')}</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? t('m_fuel_empty_search', 'No records match your search criteria.')
              : t('m_fuel_empty_sub', 'When drivers submit fuel purchases in the FleetDriver app, they will appear here.')}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 16 }]}
            onPress={() => setAddModalOpen(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('m_fuel_add_first', 'Log First Fuel Purchase')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          {/* Table Header (Desktop) */}
          {!isMobile && (
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.5 }]}>{t('common_date', 'Date & Time')}</Text>
              <Text style={[styles.th, { flex: 2 }]}>{t('common_vehicle', 'Vehicle')}</Text>
              <Text style={[styles.th, { flex: 1.8 }]}>{t('common_driver', 'Driver')}</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>{t('m_fuel_volume', 'Volume')}</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>{t('m_fuel_cost', 'Total Cost')}</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>{t('m_fuel_odometer', 'Odometer')}</Text>
              <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>{t('m_fuel_receipt', 'Receipt')}</Text>
            </View>
          )}

          {/* Table Rows / Cards */}
          {filteredLogs.map((log, index) => {
            const formattedDate = new Date(log.date || log.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = new Date(log.date || log.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const vehicleLabel = log.vehicle
              ? `${log.vehicle.make} ${log.vehicle.model}`
              : 'Unassigned Vehicle';
            const plateLabel = log.vehicle?.license_plate || 'No Plate';
            const driverName = log.driver?.full_name || 'Driver';

            if (isMobile) {
              return (
                <Pressable
                  key={log.id}
                  style={({ hovered }: any) => [
                    styles.mobileCard,
                    hovered && { backgroundColor: '#F8FAFC' },
                    index === filteredLogs.length - 1 && { borderBottomWidth: 0 },
                    Platform.OS === 'web' && ({
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    } as any),
                  ]}
                  onPress={() => setSelectedLog(log)}
                >
                  <View style={styles.mobileCardTop}>
                    <View>
                      <Text style={styles.mobileVehicleName}>{vehicleLabel}</Text>
                      <View style={styles.plateBadgeSmall}>
                        <Text style={styles.plateBadgeSmallText}>{plateLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.mobileCostText}>GH₵{Number(log.cost).toFixed(2)}</Text>
                  </View>

                  <View style={styles.mobileCardDetails}>
                    <View style={styles.mobileDetailItem}>
                      <Ionicons name="person-outline" size={13} color="#6B7280" />
                      <Text style={styles.mobileDetailText}>{driverName}</Text>
                    </View>
                    <View style={styles.mobileDetailItem}>
                      <Ionicons name="water-outline" size={13} color="#6B7280" />
                      <Text style={styles.mobileDetailText}>{log.amount} Gal / L</Text>
                    </View>
                    <View style={styles.mobileDetailItem}>
                      <Ionicons name="speedometer-outline" size={13} color="#6B7280" />
                      <Text style={styles.mobileDetailText}>
                        {log.odometer ? `${log.odometer.toLocaleString()} mi` : '--'}
                      </Text>
                    </View>
                    <View style={styles.mobileDetailItem}>
                      <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                      <Text style={styles.mobileDetailText}>{formattedDate}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={log.id}
                style={({ hovered }: any) => [
                  styles.tableRow,
                  index % 2 === 1 && { backgroundColor: '#F8FAFC' },
                  hovered && { backgroundColor: '#F1F5F9' },
                  index === filteredLogs.length - 1 && { borderBottomWidth: 0 },
                  Platform.OS === 'web' && ({
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  } as any),
                ]}
                onPress={() => setSelectedLog(log)}
              >
                {/* Date */}
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.cellMainText}>{formattedDate}</Text>
                  <Text style={styles.cellSubText}>{formattedTime}</Text>
                </View>

                {/* Vehicle */}
                <View style={{ flex: 2 }}>
                  <Text style={styles.cellMainText} numberOfLines={1}>
                    {vehicleLabel}
                  </Text>
                  <View style={styles.plateBadgeSmall}>
                    <Text style={styles.plateBadgeSmallText}>{plateLabel}</Text>
                  </View>
                </View>

                {/* Driver */}
                <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.driverAvatarCircle}>
                    {log.driver?.avatar_url ? (
                      <Image source={{ uri: log.driver.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarLetter}>
                        {driverName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.cellMainText} numberOfLines={1}>
                      {driverName}
                    </Text>
                    <Text style={styles.cellSubText} numberOfLines={1}>
                      {log.driver?.email || 'Verified Driver'}
                    </Text>
                  </View>
                </View>

                {/* Volume */}
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.cellMainText}>{log.amount} Gal</Text>
                  <Text style={styles.cellSubText}>Fuel</Text>
                </View>

                {/* Total Cost */}
                <View style={{ flex: 1.4 }}>
                  <Text style={styles.costBadge}>
                    GH₵{Number(log.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                {/* Odometer */}
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.cellMainText}>
                    {log.odometer ? `${log.odometer.toLocaleString()} mi` : '--'}
                  </Text>
                </View>

                {/* Receipt Preview */}
                <View style={{ width: 100, alignItems: 'center' }}>
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.viewReceiptBtn,
                      hovered && { backgroundColor: '#DBEAFE', transform: [{ scale: 1.05 }] },
                      Platform.OS === 'web' && ({
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      } as any),
                    ]}
                    onPress={() => setSelectedLog(log)}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#043094" />
                    <Text style={styles.viewReceiptBtnText}>View</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Detail / Receipt Modal */}
      <Modal
        visible={!!selectedLog}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBg}>
                  <Ionicons name="water" size={20} color="#043094" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalTitle}>Fuel Purchase Details</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedLog &&
                      new Date(selectedLog.date || selectedLog.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView style={styles.modalBody}>
                {/* Highlights row */}
                <View style={styles.highlightRow}>
                  <View style={styles.highlightCol}>
                    <Text style={styles.highlightLabel}>Total Cost</Text>
                    <Text style={styles.highlightValueCost}>GH₵{Number(selectedLog.cost).toFixed(2)}</Text>
                  </View>
                  <View style={styles.highlightDivider} />
                  <View style={styles.highlightCol}>
                    <Text style={styles.highlightLabel}>Quantity</Text>
                    <Text style={styles.highlightValue}>{selectedLog.amount} Gallons / Liters</Text>
                  </View>
                  <View style={styles.highlightDivider} />
                  <View style={styles.highlightCol}>
                    <Text style={styles.highlightLabel}>Odometer</Text>
                    <Text style={styles.highlightValue}>
                      {selectedLog.odometer ? `${selectedLog.odometer.toLocaleString()} mi` : 'Not recorded'}
                    </Text>
                  </View>
                </View>

                {/* Info pairs */}
                <View style={styles.infoGroup}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vehicle:</Text>
                    <Text style={styles.infoValue}>
                      {selectedLog.vehicle
                        ? `${selectedLog.vehicle.make} ${selectedLog.vehicle.model} (${selectedLog.vehicle.license_plate})`
                        : 'Unassigned Vehicle'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Driver:</Text>
                    <Text style={styles.infoValue}>
                      {selectedLog.driver?.full_name || 'Standard Fleet Driver'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Submitted At:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Receipt Image / Proof */}
                <Text style={styles.receiptHeaderLabel}>Fuel Receipt & Pump Ticket</Text>
                {selectedLog.receipt_url ? (
                  <View style={styles.receiptImageContainer}>
                    <Image
                      source={{ uri: selectedLog.receipt_url }}
                      style={styles.receiptImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.receiptPlaceholderContainer}>
                    <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
                    <Text style={styles.receiptPlaceholderText}>
                      No photo attached with this entry.
                    </Text>
                    <Text style={styles.receiptPlaceholderSub}>
                      Fuel verified and logged digitally via driver portal.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setSelectedLog(null)}
              >
                <Text style={styles.modalDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Fuel Entry Modal */}
      <Modal
        visible={addModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBg}>
                  <Ionicons name="add" size={22} color="#043094" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalTitle}>Log Fuel Purchase</Text>
                  <Text style={styles.modalSubtitle}>Record a fuel fill-up transaction manually</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAddModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Select Vehicle */}
              <Text style={styles.inputLabel}>Vehicle</Text>
              <View style={styles.vehicleSelectRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
                  <TouchableOpacity
                    style={[styles.vehiclePill, !newVehicleId && styles.vehiclePillActive]}
                    onPress={() => setNewVehicleId('')}
                  >
                    <Text style={[styles.vehiclePillText, !newVehicleId && styles.vehiclePillTextActive]}>
                      None / General Fleet
                    </Text>
                  </TouchableOpacity>
                  {vehicles?.map((v: any) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.vehiclePill, newVehicleId === v.id && styles.vehiclePillActive]}
                      onPress={() => setNewVehicleId(v.id)}
                    >
                      <Text style={[styles.vehiclePillText, newVehicleId === v.id && styles.vehiclePillTextActive]}>
                        {v.make} {v.model} ({v.plate || v.name})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Gallons / Liters *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 15.5"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    value={newGallons}
                    onChangeText={setNewGallons}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Total Cost (GH₵) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 350.00"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    value={newCost}
                    onChangeText={setNewCost}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Odometer (Miles/KM)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 54,200"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
                value={newOdometer}
                onChangeText={setNewOdometer}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setAddModalOpen(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleAddFuelSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Save Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  secondaryBtnText: {
    color: '#043094',
    fontWeight: '700',
    fontSize: 14,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  searchFilterRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#043094',
    borderColor: '#043094',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cellMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  cellSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  plateBadgeSmall: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  plateBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  driverAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4338CA',
  },
  costBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  viewReceiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#043094',
  },
  // Mobile Card Styles
  mobileCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mobileCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  mobileVehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  mobileCostText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  mobileCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mobileDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileDetailText: {
    fontSize: 13,
    color: '#64748B',
  },
  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 420,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 20,
  },
  highlightRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightCol: {
    flex: 1,
    alignItems: 'center',
  },
  highlightDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  highlightValueCost: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  infoGroup: {
    marginBottom: 20,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  receiptHeaderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  receiptImageContainer: {
    width: '100%',
    height: 320,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  receiptPlaceholderContainer: {
    padding: 30,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  receiptPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  receiptPlaceholderSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  modalDoneBtn: {
    backgroundColor: '#043094',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Form elements inside Add Modal
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    outlineStyle: 'none' as any,
  },
  formRow: {
    flexDirection: 'row',
  },
  vehicleSelectRow: {
    marginBottom: 10,
  },
  vehiclePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehiclePillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#043094',
  },
  vehiclePillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  vehiclePillTextActive: {
    color: '#043094',
    fontWeight: '700',
  },
});
